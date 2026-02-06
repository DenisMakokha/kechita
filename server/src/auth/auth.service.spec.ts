import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailService } from '../email/email.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
    let service: AuthService;
    let usersRepository: jest.Mocked<Repository<User>>;
    let staffRepository: jest.Mocked<Repository<Staff>>;
    let resetTokenRepository: jest.Mocked<Repository<PasswordResetToken>>;
    let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;
    let jwtService: jest.Mocked<JwtService>;
    let emailService: jest.Mocked<EmailService>;

    const mockUser: Partial<User> = {
        id: 'user-1',
        email: 'test@kechita.com',
        password_hash: '$2b$10$hashedpassword',
        is_active: true,
        roles: [{ id: 'role-1', code: 'STAFF', name: 'Staff' }] as any,
    };

    const mockStaff: Partial<Staff> = {
        id: 'staff-1',
        first_name: 'John',
        last_name: 'Doe',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Staff),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(PasswordResetToken),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(RefreshToken),
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue('mock-jwt-token'),
                        verify: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('http://localhost:5173'),
                    },
                },
                {
                    provide: EmailService,
                    useValue: {
                        sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersRepository = module.get(getRepositoryToken(User));
        staffRepository = module.get(getRepositoryToken(Staff));
        resetTokenRepository = module.get(getRepositoryToken(PasswordResetToken));
        refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
        jwtService = module.get(JwtService);
        emailService = module.get(EmailService);
    });

    describe('validateUser', () => {
        it('should return user without password when credentials are valid', async () => {
            const hashedPassword = await bcrypt.hash('correctpassword', 10);
            const userWithHash = { ...mockUser, password_hash: hashedPassword } as User;
            usersRepository.findOne.mockResolvedValue(userWithHash);

            const result = await service.validateUser('test@kechita.com', 'correctpassword');

            expect(result).toBeDefined();
            expect(result.email).toBe('test@kechita.com');
            expect(result.password_hash).toBeUndefined();
        });

        it('should return null for invalid password', async () => {
            const hashedPassword = await bcrypt.hash('correctpassword', 10);
            const userWithHash = { ...mockUser, password_hash: hashedPassword } as User;
            usersRepository.findOne.mockResolvedValue(userWithHash);

            const result = await service.validateUser('test@kechita.com', 'wrongpassword');

            expect(result).toBeNull();
        });

        it('should return null for inactive user', async () => {
            const inactiveUser = { ...mockUser, is_active: false } as User;
            usersRepository.findOne.mockResolvedValue(inactiveUser);

            const result = await service.validateUser('test@kechita.com', 'anypassword');

            expect(result).toBeNull();
        });

        it('should return null for non-existent user', async () => {
            usersRepository.findOne.mockResolvedValue(null);

            const result = await service.validateUser('nonexistent@kechita.com', 'anypassword');

            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should return access and refresh tokens', async () => {
            refreshTokenRepository.create.mockReturnValue({} as RefreshToken);
            refreshTokenRepository.save.mockResolvedValue({} as RefreshToken);

            const result = await service.login(mockUser);

            expect(result).toHaveProperty('access_token');
            expect(result).toHaveProperty('refresh_token');
            expect(result).toHaveProperty('expires_in');
            expect(jwtService.sign).toHaveBeenCalled();
        });
    });

    describe('getMe', () => {
        it('should return user profile with staff info', async () => {
            usersRepository.findOne.mockResolvedValue(mockUser as User);
            staffRepository.findOne.mockResolvedValue(mockStaff as Staff);

            const result = await service.getMe('user-1');

            expect(result.email).toBe('test@kechita.com');
            expect(result.staff_id).toBe('staff-1');
            expect(result.first_name).toBe('John');
        });

        it('should throw UnauthorizedException for invalid user', async () => {
            usersRepository.findOne.mockResolvedValue(null);

            await expect(service.getMe('invalid-id')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('forgotPassword', () => {
        it('should send reset email for valid user', async () => {
            usersRepository.findOne.mockResolvedValue(mockUser as User);
            staffRepository.findOne.mockResolvedValue(mockStaff as Staff);
            resetTokenRepository.update.mockResolvedValue({} as any);
            resetTokenRepository.create.mockReturnValue({} as PasswordResetToken);
            resetTokenRepository.save.mockResolvedValue({} as PasswordResetToken);

            const result = await service.forgotPassword('test@kechita.com');

            expect(result.message).toContain('password reset link');
            expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
        });

        it('should return generic message for non-existent email (security)', async () => {
            usersRepository.findOne.mockResolvedValue(null);

            const result = await service.forgotPassword('nonexistent@kechita.com');

            // Should NOT reveal that email doesn't exist
            expect(result.message).toContain('password reset link');
            expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should return generic message for inactive user (security)', async () => {
            const inactiveUser = { ...mockUser, is_active: false } as User;
            usersRepository.findOne.mockResolvedValue(inactiveUser);

            const result = await service.forgotPassword('test@kechita.com');

            expect(result.message).toContain('password reset link');
            expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        it('should change password when current password is correct', async () => {
            const hashedPassword = await bcrypt.hash('currentpassword', 10);
            const userWithHash = { ...mockUser, password_hash: hashedPassword } as User;
            usersRepository.findOne.mockResolvedValue(userWithHash);
            usersRepository.update.mockResolvedValue({} as any);

            const result = await service.changePassword('user-1', 'currentpassword', 'newpassword');

            expect(result.message).toContain('successfully');
            expect(usersRepository.update).toHaveBeenCalled();
        });

        it('should throw BadRequestException for incorrect current password', async () => {
            const hashedPassword = await bcrypt.hash('currentpassword', 10);
            const userWithHash = { ...mockUser, password_hash: hashedPassword } as User;
            usersRepository.findOne.mockResolvedValue(userWithHash);

            await expect(
                service.changePassword('user-1', 'wrongpassword', 'newpassword')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw UnauthorizedException for non-existent user', async () => {
            usersRepository.findOne.mockResolvedValue(null);

            await expect(
                service.changePassword('invalid-id', 'any', 'any')
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('logout', () => {
        it('should revoke refresh token on logout', async () => {
            const mockToken = { id: 'token-1' } as RefreshToken;
            refreshTokenRepository.findOne.mockResolvedValue(mockToken);
            refreshTokenRepository.update.mockResolvedValue({} as any);

            const result = await service.logout('valid-refresh-token');

            expect(result.message).toContain('Logged out');
        });

        it('should handle logout with invalid token gracefully', async () => {
            refreshTokenRepository.findOne.mockResolvedValue(null);

            const result = await service.logout('invalid-token');

            expect(result.message).toContain('Logged out');
        });
    });

    describe('revokeAllUserTokens', () => {
        it('should revoke all tokens for a user', async () => {
            refreshTokenRepository.update.mockResolvedValue({} as any);

            await service.revokeAllUserTokens('user-1');

            expect(refreshTokenRepository.update).toHaveBeenCalledWith(
                { user_id: 'user-1', revoked: false },
                expect.objectContaining({ revoked: true })
            );
        });
    });
});
