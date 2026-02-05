import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Staff)
        private staffRepository: Repository<Staff>,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersRepository.findOne({
            where: { email },
            select: ['id', 'email', 'password_hash', 'is_active'],
            relations: ['roles']
        });

        if (user && user.is_active && await bcrypt.compare(pass, user.password_hash)) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async getMe(userId: string) {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['roles'],
        });
        if (!user) {
            throw new UnauthorizedException('Invalid user');
        }

        const staff = await this.staffRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });

        return {
            id: user.id,
            email: user.email,
            roles: (user.roles || []).map((r) => ({ code: r.code })),
            staff_id: staff?.id,
            first_name: staff?.first_name,
            last_name: staff?.last_name,
        };
    }

    async login(user: any) {
        const payload = {
            email: user.email,
            sub: user.id,
            roles: user.roles.map((r: any) => r.code)
        };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
