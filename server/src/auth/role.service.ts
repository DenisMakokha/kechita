import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
    ) {}

    async findAll(includeInactive = false): Promise<Role[]> {
        const where = includeInactive ? {} : { is_active: true };
        return this.roleRepository.find({
            where,
            order: { code: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id },
        });

        if (!role) {
            throw new NotFoundException('Role not found');
        }

        return role;
    }

    async findByCode(code: string): Promise<Role | null> {
        return this.roleRepository.findOne({
            where: { code },
        });
    }

    async create(dto: CreateRoleDto): Promise<Role> {
        const existing = await this.findByCode(dto.code.toUpperCase());
        if (existing) {
            throw new ConflictException('Role with this code already exists');
        }

        const role = this.roleRepository.create({
            code: dto.code.toUpperCase(),
            name: dto.name,
            description: dto.description,
            is_active: true,
        });

        return this.roleRepository.save(role);
    }

    async update(id: string, dto: UpdateRoleDto): Promise<Role> {
        const role = await this.findOne(id);

        if (dto.name !== undefined) {
            role.name = dto.name;
        }

        if (dto.description !== undefined) {
            role.description = dto.description;
        }

        return this.roleRepository.save(role);
    }

    async activate(id: string): Promise<Role> {
        const role = await this.findOne(id);
        role.is_active = true;
        return this.roleRepository.save(role);
    }

    async deactivate(id: string): Promise<Role> {
        const role = await this.findOne(id);
        role.is_active = false;
        return this.roleRepository.save(role);
    }

    async delete(id: string): Promise<{ message: string }> {
        const role = await this.findOne(id);

        // Check if role has users
        const roleWithUsers = await this.roleRepository.findOne({
            where: { id },
            relations: ['users'],
        });

        if (roleWithUsers && roleWithUsers.users && roleWithUsers.users.length > 0) {
            throw new BadRequestException(
                `Cannot delete role "${role.code}" - it is assigned to ${roleWithUsers.users.length} user(s)`
            );
        }

        await this.roleRepository.remove(role);
        return { message: 'Role deleted successfully' };
    }

    async getUserCount(id: string): Promise<number> {
        const role = await this.roleRepository.findOne({
            where: { id },
            relations: ['users'],
        });

        return role?.users?.length || 0;
    }

    async getRoleStats(): Promise<{ code: string; name: string; userCount: number }[]> {
        const roles = await this.roleRepository.find({
            relations: ['users'],
            where: { is_active: true },
        });

        return roles.map(role => ({
            code: role.code,
            name: role.name,
            userCount: role.users?.length || 0,
        }));
    }
}
