import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserRolesDto, UpdateUserPasswordDto } from './dto/update-user.dto';

export interface UserListQuery {
    page?: number;
    limit?: number;
    search?: string;
    role_code?: string;
    is_active?: boolean;
}

export interface PaginatedUsers {
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
    ) {}

    async findAll(query: UserListQuery): Promise<PaginatedUsers> {
        const { page = 1, limit = 20, search, role_code, is_active } = query;
        const skip = (page - 1) * limit;

        const qb = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'role')
            .leftJoinAndSelect('user.staff', 'staff');

        if (search) {
            qb.andWhere(
                '(user.email ILIKE :search OR staff.first_name ILIKE :search OR staff.last_name ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (role_code) {
            qb.andWhere('role.code = :role_code', { role_code });
        }

        if (is_active !== undefined) {
            qb.andWhere('user.is_active = :is_active', { is_active });
        }

        qb.orderBy('user.created_at', 'DESC');

        const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['roles', 'staff'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { email },
            relations: ['roles'],
        });
    }

    async create(dto: CreateUserDto): Promise<User> {
        const existing = await this.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = this.userRepository.create({
            email: dto.email.toLowerCase(),
            password_hash: passwordHash,
            is_active: dto.is_active ?? true,
        });

        if (dto.role_codes && dto.role_codes.length > 0) {
            const roles = await this.roleRepository.find({
                where: { code: In(dto.role_codes), is_active: true },
            });

            if (roles.length !== dto.role_codes.length) {
                const foundCodes = roles.map(r => r.code);
                const missingCodes = dto.role_codes.filter(c => !foundCodes.includes(c));
                throw new BadRequestException(`Invalid role codes: ${missingCodes.join(', ')}`);
            }

            user.roles = roles;
        }

        return this.userRepository.save(user);
    }

    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);

        if (dto.email && dto.email !== user.email) {
            const existing = await this.findByEmail(dto.email);
            if (existing) {
                throw new ConflictException('User with this email already exists');
            }
            user.email = dto.email.toLowerCase();
        }

        if (dto.is_active !== undefined) {
            user.is_active = dto.is_active;
        }

        return this.userRepository.save(user);
    }

    async updateRoles(id: string, dto: UpdateUserRolesDto): Promise<User> {
        const user = await this.findOne(id);

        const roles = await this.roleRepository.find({
            where: { code: In(dto.role_codes), is_active: true },
        });

        if (roles.length !== dto.role_codes.length) {
            const foundCodes = roles.map(r => r.code);
            const missingCodes = dto.role_codes.filter(c => !foundCodes.includes(c));
            throw new BadRequestException(`Invalid role codes: ${missingCodes.join(', ')}`);
        }

        user.roles = roles;
        return this.userRepository.save(user);
    }

    async addRole(userId: string, roleCode: string): Promise<User> {
        const user = await this.findOne(userId);
        const role = await this.roleRepository.findOne({ 
            where: { code: roleCode, is_active: true } 
        });

        if (!role) {
            throw new NotFoundException(`Role not found: ${roleCode}`);
        }

        const hasRole = user.roles.some(r => r.code === roleCode);
        if (!hasRole) {
            user.roles.push(role);
            await this.userRepository.save(user);
        }

        return user;
    }

    async removeRole(userId: string, roleCode: string): Promise<User> {
        const user = await this.findOne(userId);

        user.roles = user.roles.filter(r => r.code !== roleCode);
        return this.userRepository.save(user);
    }

    async updatePassword(id: string, dto: UpdateUserPasswordDto): Promise<{ message: string }> {
        const user = await this.userRepository.findOne({
            where: { id },
            select: ['id'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(dto.new_password, saltRounds);

        await this.userRepository.update(id, { password_hash: passwordHash });

        return { message: 'Password updated successfully' };
    }

    async activate(id: string): Promise<User> {
        const user = await this.findOne(id);
        user.is_active = true;
        return this.userRepository.save(user);
    }

    async deactivate(id: string): Promise<User> {
        const user = await this.findOne(id);
        user.is_active = false;
        return this.userRepository.save(user);
    }

    async delete(id: string): Promise<{ message: string }> {
        const user = await this.findOne(id);
        await this.userRepository.remove(user);
        return { message: 'User deleted successfully' };
    }

    async getUsersWithRole(roleCode: string): Promise<User[]> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'role')
            .leftJoinAndSelect('user.staff', 'staff')
            .where('role.code = :roleCode', { roleCode })
            .andWhere('user.is_active = true')
            .getMany();
    }

    async countByRole(): Promise<{ role: string; count: number }[]> {
        const result = await this.userRepository
            .createQueryBuilder('user')
            .leftJoin('user.roles', 'role')
            .select('role.code', 'role')
            .addSelect('COUNT(DISTINCT user.id)', 'count')
            .where('user.is_active = true')
            .groupBy('role.code')
            .getRawMany();

        return result.map(r => ({
            role: r.role,
            count: parseInt(r.count, 10),
        }));
    }
}
