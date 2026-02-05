import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        @InjectRepository(Staff)
        private readonly staffRepo: Repository<Staff>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: (() => {
                const secret = configService.get<string>('JWT_SECRET');
                if (!secret) {
                    throw new Error('JWT_SECRET is required');
                }
                return secret;
            })(),
        });
    }

    async validate(payload: any) {
        const userId = payload.sub;

        const staff = await this.staffRepo.findOne({
            where: { user: { id: userId } },
            select: ['id'],
            relations: ['user'],
        });

        return {
            sub: userId,
            id: userId,
            staff_id: staff?.id,
            email: payload.email,
            roles: (payload.roles || []).map((code: string) => ({ code })),
        };
    }
}
