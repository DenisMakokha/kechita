import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { RoleService } from './role.service';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { RoleController } from './role.controller';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './jwt.strategy';
import { Staff } from '../staff/entities/staff.entity';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Role, Staff, PasswordResetToken, RefreshToken]),
        EmailModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: (() => {
                    const secret = configService.get<string>('JWT_SECRET');
                    if (!secret) {
                        throw new Error('JWT_SECRET is required');
                    }
                    return secret;
                })(),
                signOptions: { expiresIn: '60m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController, UserController, RoleController],
    providers: [AuthService, UserService, RoleService, JwtStrategy],
    exports: [AuthService, UserService, RoleService],
})
export class AuthModule { }
