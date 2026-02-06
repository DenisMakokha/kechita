import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request, Headers, Ip, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ThrottleGuard, Throttle } from '../common/guards/throttle.guard';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Enable2FADto, Disable2FADto, Verify2FADto } from './dto/two-factor.dto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('auth')
@UseGuards(ThrottleGuard)
export class AuthController {
    constructor(private authService: AuthService) { }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    me(@Request() req: AuthenticatedRequest) {
        return this.authService.getMe(req.user.sub);
    }

    @Post('login')
    @Throttle(5, 60) // 5 attempts per minute
    async login(
        @Body() dto: LoginDto,
        @Headers('user-agent') userAgent?: string,
        @Ip() ipAddress?: string,
    ) {
        const user = await this.authService.validateUser(dto.email, dto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user, userAgent, ipAddress);
    }

    @Post('refresh')
    @Throttle(10, 60) // 10 attempts per minute
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Headers('user-agent') userAgent?: string,
        @Ip() ipAddress?: string,
    ) {
        return this.authService.refreshTokens(dto.refresh_token, userAgent, ipAddress);
    }

    @Post('logout')
    async logout(@Body() dto: RefreshTokenDto) {
        return this.authService.logout(dto.refresh_token);
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    async logoutAll(@Request() req: AuthenticatedRequest) {
        await this.authService.revokeAllUserTokens(req.user.sub);
        return { message: 'All sessions have been logged out' };
    }

    @Post('forgot-password')
    @Throttle(3, 60) // 3 attempts per minute
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Post('reset-password')
    @Throttle(5, 60) // 5 attempts per minute
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.newPassword);
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    async changePassword(@Request() req: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
    }

    // ==================== SESSION MANAGEMENT ====================

    @Get('sessions')
    @UseGuards(JwtAuthGuard)
    async getSessions(@Request() req: AuthenticatedRequest) {
        return this.authService.getActiveSessions(req.user.sub);
    }

    @Delete('sessions/:sessionId')
    @UseGuards(JwtAuthGuard)
    async revokeSession(
        @Request() req: AuthenticatedRequest,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
    ) {
        return this.authService.revokeSession(sessionId, req.user.sub);
    }

    // ==================== 2FA ====================

    @Post('2fa/setup')
    @UseGuards(JwtAuthGuard)
    async setup2FA(@Request() req: AuthenticatedRequest) {
        return this.authService.generate2FASecret(req.user.sub);
    }

    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    async enable2FA(@Request() req: AuthenticatedRequest, @Body() dto: Enable2FADto) {
        return this.authService.enable2FA(req.user.sub, dto.token);
    }

    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    async disable2FA(@Request() req: AuthenticatedRequest, @Body() dto: Disable2FADto) {
        return this.authService.disable2FA(req.user.sub, dto.token);
    }

    @Post('2fa/verify')
    @UseGuards(JwtAuthGuard)
    async verify2FA(@Request() req: AuthenticatedRequest, @Body() dto: Verify2FADto) {
        const isValid = await this.authService.verify2FA(req.user.sub, dto.token);
        return { valid: isValid };
    }
}
