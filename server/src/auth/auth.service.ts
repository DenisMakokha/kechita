import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

export interface TokenPair {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    requires_2fa?: boolean;
}

export interface ActiveSession {
    id: string;
    user_agent: string;
    ip_address: string;
    created_at: Date;
    expires_at: Date;
    is_current: boolean;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly ACCESS_TOKEN_EXPIRY = '15m';
    private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
    private readonly MAX_LOGIN_ATTEMPTS = 5;
    private readonly LOCKOUT_DURATION_MINUTES = 15;

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Staff)
        private staffRepository: Repository<Staff>,
        @InjectRepository(PasswordResetToken)
        private resetTokenRepository: Repository<PasswordResetToken>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private emailService: EmailService,
        private auditService: AuditService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password_hash', 'is_active', 'failed_login_attempts', 'locked_until', 'two_factor_enabled'],
            relations: ['roles', 'roles.permissions']
        });

        if (!user) {
            return null;
        }

        // Check if account is locked
        if (user.locked_until && new Date() < new Date(user.locked_until)) {
            const remainingMinutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
            throw new UnauthorizedException(`Account is locked. Try again in ${remainingMinutes} minute(s).`);
        }

        // Check if account is active
        if (!user.is_active) {
            return null;
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(pass, user.password_hash);
        
        if (!isPasswordValid) {
            await this.handleFailedLogin(user);
            return null;
        }

        // Reset failed attempts on successful login
        await this.handleSuccessfulLogin(user);

        this.auditService.log({ userId: user.id, action: AuditAction.LOGIN, entityType: 'User', entityId: user.id, description: `User ${user.email} logged in`, isSuccessful: true }).catch(() => {});

        const { password_hash, failed_login_attempts, locked_until, ...result } = user;
        return result;
    }

    private async handleFailedLogin(user: User): Promise<void> {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        
        if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);
            
            await this.usersRepository.update(user.id, {
                failed_login_attempts: newAttempts,
                locked_until: lockUntil,
            });
            
            this.logger.warn(`Account locked for user: ${user.email} after ${newAttempts} failed attempts`);
            this.auditService.log({ userId: user.id, action: AuditAction.LOGIN, entityType: 'User', entityId: user.id, description: `Account locked after ${newAttempts} failed attempts`, isSuccessful: false, errorMessage: 'Account locked' }).catch(() => {});
            throw new UnauthorizedException(`Too many failed attempts. Account locked for ${this.LOCKOUT_DURATION_MINUTES} minutes.`);
        } else {
            await this.usersRepository.update(user.id, {
                failed_login_attempts: newAttempts,
            });
            this.logger.log(`Failed login attempt ${newAttempts}/${this.MAX_LOGIN_ATTEMPTS} for: ${user.email}`);
        }
    }

    private async handleSuccessfulLogin(user: User): Promise<void> {
        await this.usersRepository.update(user.id, {
            failed_login_attempts: 0,
            locked_until: undefined as any,
            last_login_at: new Date(),
        });
    }

    async getMe(userId: string) {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['roles', 'roles.permissions'],
        });
        if (!user) {
            throw new UnauthorizedException('Invalid user');
        }

        const staff = await this.staffRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });

        const permissions = this.collectPermissions(user.roles || []);

        return {
            id: user.id,
            email: user.email,
            roles: (user.roles || []).map((r) => ({ code: r.code })),
            permissions,
            staff_id: staff?.id,
            first_name: staff?.first_name,
            last_name: staff?.last_name,
        };
    }

    private collectPermissions(roles: any[]): string[] {
        const perms = new Set<string>();
        for (const role of roles) {
            if (role.permissions) {
                for (const p of role.permissions) {
                    perms.add(p.code);
                }
            }
        }
        return Array.from(perms);
    }

    async login(user: any, userAgent?: string, ipAddress?: string): Promise<TokenPair> {
        const permissions = this.collectPermissions(user.roles || []);
        const payload = {
            email: user.email,
            sub: user.id,
            roles: user.roles.map((r: any) => r.code),
            permissions,
        };

        const accessToken = this.jwtService.sign(payload, { expiresIn: this.ACCESS_TOKEN_EXPIRY });
        const refreshToken = await this.createRefreshToken(user.id, userAgent, ipAddress);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 900, // 15 minutes in seconds
        };
    }

    private async createRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
        const token = crypto.randomBytes(64).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

        const refreshToken = this.refreshTokenRepository.create({
            token: hashedToken,
            user_id: userId,
            expires_at: expiresAt,
            user_agent: userAgent,
            ip_address: ipAddress,
        });

        await this.refreshTokenRepository.save(refreshToken);
        return token;
    }

    async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<TokenPair> {
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const storedToken = await this.refreshTokenRepository.findOne({
            where: {
                token: hashedToken,
                revoked: false,
                expires_at: MoreThan(new Date()),
            },
            relations: ['user', 'user.roles'],
        });

        if (!storedToken) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        if (!storedToken.user.is_active) {
            await this.revokeRefreshToken(storedToken.id);
            throw new UnauthorizedException('User account is disabled');
        }

        // Rotate refresh token (revoke old, create new)
        const newRefreshToken = await this.rotateRefreshToken(storedToken, userAgent, ipAddress);

        // Generate new access token
        const payload = {
            email: storedToken.user.email,
            sub: storedToken.user.id,
            roles: storedToken.user.roles.map((r) => r.code),
        };

        const accessToken = this.jwtService.sign(payload, { expiresIn: this.ACCESS_TOKEN_EXPIRY });

        return {
            access_token: accessToken,
            refresh_token: newRefreshToken,
            expires_in: 900,
        };
    }

    private async rotateRefreshToken(oldToken: RefreshToken, userAgent?: string, ipAddress?: string): Promise<string> {
        const newToken = await this.createRefreshToken(oldToken.user_id, userAgent, ipAddress);

        // Revoke old token and link to new one
        oldToken.revoked = true;
        oldToken.revoked_at = new Date();
        oldToken.replaced_by = newToken;
        await this.refreshTokenRepository.save(oldToken);

        return newToken;
    }

    async revokeRefreshToken(tokenId: string): Promise<void> {
        await this.refreshTokenRepository.update(tokenId, {
            revoked: true,
            revoked_at: new Date(),
        });
    }

    async revokeAllUserTokens(userId: string): Promise<void> {
        await this.refreshTokenRepository.update(
            { user_id: userId, revoked: false },
            { revoked: true, revoked_at: new Date() }
        );
        this.logger.log(`All refresh tokens revoked for user: ${userId}`);
    }

    async logout(refreshToken: string): Promise<{ message: string }> {
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const storedToken = await this.refreshTokenRepository.findOne({
            where: { token: hashedToken },
        });

        if (storedToken) {
            await this.revokeRefreshToken(storedToken.id);
        }

        return { message: 'Logged out successfully' };
    }

    async cleanupExpiredTokens(): Promise<number> {
        const result = await this.refreshTokenRepository.delete({
            expires_at: LessThan(new Date()),
        });
        return result.affected || 0;
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.usersRepository.findOne({ where: { email } });

        // Always return success message to prevent email enumeration
        if (!user || !user.is_active) {
            this.logger.log(`Password reset requested for non-existent/inactive email: ${email}`);
            return { message: 'If an account exists with this email, a password reset link has been sent.' };
        }

        // Invalidate any existing tokens for this user
        await this.resetTokenRepository.update(
            { user_id: user.id, used: false },
            { used: true }
        );

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Token expires in 1 hour
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Save token
        const resetToken = this.resetTokenRepository.create({
            token: hashedToken,
            user_id: user.id,
            expires_at: expiresAt,
        });
        await this.resetTokenRepository.save(resetToken);

        // Get staff name for email
        const staff = await this.staffRepository.findOne({
            where: { user: { id: user.id } },
        });
        const userName = staff ? `${staff.first_name} ${staff.last_name}` : email.split('@')[0];

        // Build reset URL
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        // Send email
        await this.emailService.sendPasswordResetEmail({
            email: user.email,
            name: userName,
            resetUrl,
            expiresInMinutes: 60,
        });

        this.logger.log(`Password reset email sent to: ${email}`);
        return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        // Hash the provided token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const resetToken = await this.resetTokenRepository.findOne({
            where: {
                token: hashedToken,
                used: false,
                expires_at: MoreThan(new Date()),
            },
            relations: ['user'],
        });

        if (!resetToken) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update user password
        await this.usersRepository.update(resetToken.user_id, {
            password_hash: passwordHash,
        });

        // Mark token as used
        resetToken.used = true;
        await this.resetTokenRepository.save(resetToken);

        this.logger.log(`Password reset successful for user: ${resetToken.user_id}`);
        return { message: 'Password has been reset successfully. You can now login with your new password.' };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            select: ['id', 'password_hash'],
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await this.usersRepository.update(userId, { password_hash: passwordHash });

        this.logger.log(`Password changed for user: ${userId}`);
        return { message: 'Password changed successfully' };
    }

    // ==================== SESSION MANAGEMENT ====================

    async getActiveSessions(userId: string, currentTokenHash?: string): Promise<ActiveSession[]> {
        const tokens = await this.refreshTokenRepository.find({
            where: {
                user_id: userId,
                revoked: false,
                expires_at: MoreThan(new Date()),
            },
            order: { created_at: 'DESC' },
        });

        return tokens.map((token) => ({
            id: token.id,
            user_agent: token.user_agent || 'Unknown device',
            ip_address: token.ip_address || 'Unknown',
            created_at: token.created_at,
            expires_at: token.expires_at,
            is_current: currentTokenHash === token.token,
        }));
    }

    async revokeSession(sessionId: string, userId: string): Promise<{ message: string }> {
        const token = await this.refreshTokenRepository.findOne({
            where: { id: sessionId, user_id: userId, revoked: false },
        });

        if (!token) {
            throw new BadRequestException('Session not found');
        }

        await this.revokeRefreshToken(token.id);
        this.logger.log(`Session ${sessionId} revoked for user: ${userId}`);
        return { message: 'Session revoked successfully' };
    }

    async unlockAccount(userId: string): Promise<{ message: string }> {
        await this.usersRepository.update(userId, {
            failed_login_attempts: 0,
            locked_until: undefined as any,
        });
        this.logger.log(`Account unlocked for user: ${userId}`);
        return { message: 'Account unlocked successfully' };
    }

    // ==================== 2FA METHODS ====================

    async generate2FASecret(userId: string): Promise<{ secret: string; otpauth_url: string }> {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        // Generate a random secret
        const secret = crypto.randomBytes(20).toString('hex');
        
        // Store secret temporarily (not enabled yet)
        await this.usersRepository.update(userId, {
            two_factor_secret: secret,
        });

        // Generate OTP auth URL for QR code
        const otpauth_url = `otpauth://totp/Kechita:${user.email}?secret=${secret}&issuer=Kechita`;

        return { secret, otpauth_url };
    }

    async enable2FA(userId: string, token: string): Promise<{ message: string }> {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            select: ['id', 'two_factor_secret', 'two_factor_enabled'],
        });

        if (!user || !user.two_factor_secret) {
            throw new BadRequestException('2FA setup not initiated');
        }

        // Verify the token
        const isValid = this.verifyTOTP(user.two_factor_secret, token);
        if (!isValid) {
            throw new BadRequestException('Invalid verification code');
        }

        await this.usersRepository.update(userId, {
            two_factor_enabled: true,
        });

        this.logger.log(`2FA enabled for user: ${userId}`);
        return { message: '2FA has been enabled successfully' };
    }

    async disable2FA(userId: string, token: string): Promise<{ message: string }> {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            select: ['id', 'two_factor_secret', 'two_factor_enabled'],
        });

        if (!user || !user.two_factor_enabled) {
            throw new BadRequestException('2FA is not enabled');
        }

        // Verify the token
        const isValid = this.verifyTOTP(user.two_factor_secret, token);
        if (!isValid) {
            throw new BadRequestException('Invalid verification code');
        }

        await this.usersRepository.update(userId, {
            two_factor_enabled: false,
            two_factor_secret: undefined as any,
        });

        this.logger.log(`2FA disabled for user: ${userId}`);
        return { message: '2FA has been disabled successfully' };
    }

    async verify2FA(userId: string, token: string): Promise<boolean> {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            select: ['id', 'two_factor_secret', 'two_factor_enabled'],
        });

        if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
            return false;
        }

        return this.verifyTOTP(user.two_factor_secret, token);
    }

    private verifyTOTP(secret: string, token: string): boolean {
        // Simple TOTP verification (30-second window)
        const timeStep = 30;
        const currentTime = Math.floor(Date.now() / 1000 / timeStep);
        
        // Check current and previous time step (to handle timing issues)
        for (const timeOffset of [0, -1]) {
            const time = currentTime + timeOffset;
            const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
            const timeBuffer = Buffer.alloc(8);
            timeBuffer.writeBigInt64BE(BigInt(time));
            hmac.update(timeBuffer);
            const hash = hmac.digest();
            
            const offset = hash[hash.length - 1] & 0xf;
            const code = ((hash[offset] & 0x7f) << 24 |
                         (hash[offset + 1] & 0xff) << 16 |
                         (hash[offset + 2] & 0xff) << 8 |
                         (hash[offset + 3] & 0xff)) % 1000000;
            
            if (code.toString().padStart(6, '0') === token) {
                return true;
            }
        }
        
        return false;
    }
}
