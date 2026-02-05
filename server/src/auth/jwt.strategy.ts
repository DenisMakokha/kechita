import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'supersecretkey',
        });
    }

    async validate(payload: any) {
        // This payload is what is injected into request.user
        return {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles.map((code: string) => ({ code }))
        };
    }
}
