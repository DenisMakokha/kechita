import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, Like, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Staff } from '../staff/entities/staff.entity';
import { EmailService } from '../email/email.service';
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
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
        @InjectRepository(PasswordResetToken)
        private resetTokenRepository: Repository<PasswordResetToken>,
        @InjectRepository(Staff)
        private staffRepository: Repository<Staff>,
        private emailService: EmailService,
        private configService: ConfigService,
    ) {}

    // Role hierarchy: lower number = higher rank
    private static readonly ROLE_HIERARCHY: Record<string, number> = {
        CEO: 1,
        HR_MANAGER: 2,
        REGIONAL_ADMIN: 3,
        HR_ASSISTANT: 4,
        REGIONAL_MANAGER: 5,
        BRANCH_MANAGER: 6,
        BDM: 7,
        ACCOUNTANT: 8,
        RELATIONSHIP_OFFICER: 9,
    };

    private getHighestRank(roles: { code: string }[]): number {
        if (!roles || roles.length === 0) return 999;
        return Math.min(...roles.map(r => UserService.ROLE_HIERARCHY[r.code] ?? 999));
    }

    private assertCanModifyUser(actorRoles: { code: string }[], targetUser: User): void {
        const actorRank = this.getHighestRank(actorRoles);
        const targetRank = this.getHighestRank(targetUser.roles || []);
        if (actorRank >= targetRank) {
            throw new ForbiddenException(
                'You cannot modify a user with an equal or higher role than yours',
            );
        }
    }

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

        const password = dto.password || crypto.randomBytes(32).toString('hex');
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const user = this.userRepository.create({
            email: dto.email.toLowerCase(),
            password_hash: passwordHash,
            is_active: dto.is_active ?? true,
        });

        let roleName: string | undefined;
        if (dto.role_code) {
            const role = await this.roleRepository.findOne({
                where: { code: dto.role_code, is_active: true },
            });
            if (!role) {
                throw new BadRequestException(`Invalid role code: ${dto.role_code}`);
            }
            user.roles = [role];
            roleName = role.name;
        }

        const savedUser = await this.userRepository.save(user);

        // Send welcome email with password setup link
        try {
            await this.sendWelcomeEmailWithSetupLink(savedUser, roleName);
        } catch (err) {
            this.logger.warn(`Failed to send welcome email to ${savedUser.email}: ${err.message}`);
        }

        return savedUser;
    }

    async update(id: string, dto: UpdateUserDto, actorRoles?: { code: string }[]): Promise<User> {
        const user = await this.findOne(id);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);

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

    async updateRoles(id: string, dto: UpdateUserRolesDto, actorRoles?: { code: string }[]): Promise<User> {
        const user = await this.findOne(id);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);

        const role = await this.roleRepository.findOne({
            where: { code: dto.role_code, is_active: true },
        });
        if (!role) {
            throw new BadRequestException(`Invalid role code: ${dto.role_code}`);
        }

        user.roles = [role];
        return this.userRepository.save(user);
    }

    async addRole(userId: string, roleCode: string, actorRoles?: { code: string }[]): Promise<User> {
        const user = await this.findOne(userId);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);
        const role = await this.roleRepository.findOne({ 
            where: { code: roleCode, is_active: true } 
        });

        if (!role) {
            throw new NotFoundException(`Role not found: ${roleCode}`);
        }

        // Single role enforcement: replace existing role
        user.roles = [role];
        await this.userRepository.save(user);

        return user;
    }

    async removeRole(userId: string, roleCode: string, actorRoles?: { code: string }[]): Promise<User> {
        const user = await this.findOne(userId);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);

        user.roles = user.roles.filter(r => r.code !== roleCode);
        return this.userRepository.save(user);
    }

    async updatePassword(id: string, dto: UpdateUserPasswordDto, actorRoles?: { code: string }[]): Promise<{ message: string }> {
        const user = await this.findOne(id);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(dto.new_password, saltRounds);

        await this.userRepository.update(id, { password_hash: passwordHash });

        return { message: 'Password updated successfully' };
    }

    async activate(id: string, actorRoles?: { code: string }[]): Promise<User> {
        const user = await this.findOne(id);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);
        user.is_active = true;
        return this.userRepository.save(user);
    }

    async deactivate(id: string, actorRoles?: { code: string }[]): Promise<User> {
        const user = await this.findOne(id);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);
        user.is_active = false;
        return this.userRepository.save(user);
    }

    async delete(id: string, actorRoles?: { code: string }[]): Promise<{ message: string }> {
        const user = await this.findOne(id);
        if (actorRoles) this.assertCanModifyUser(actorRoles, user);
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

    private async sendWelcomeEmailWithSetupLink(user: User, roleName?: string): Promise<void> {
        // Generate a password setup token (24 hours expiry)
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const resetToken = this.resetTokenRepository.create({
            token: hashedToken,
            user_id: user.id,
            expires_at: expiresAt,
        });
        await this.resetTokenRepository.save(resetToken);

        // Get staff name if linked
        const staff = await this.staffRepository.findOne({
            where: { user: { id: user.id } },
        });
        const userName = staff
            ? `${staff.first_name} ${staff.last_name}`
            : user.email.split('@')[0];

        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
        const setupUrl = `${frontendUrl}/reset-password?token=${token}`;

        await this.emailService.sendWelcomeEmail({
            email: user.email,
            name: userName,
            role: roleName,
            setupUrl,
        });

        this.logger.log(`Welcome email sent to: ${user.email}`);
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
