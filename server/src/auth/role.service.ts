import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
        @InjectRepository(Permission)
        private permissionRepository: Repository<Permission>,
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

    // ==================== PERMISSIONS ====================

    async findAllPermissions(): Promise<Permission[]> {
        return this.permissionRepository.find({ order: { module: 'ASC', code: 'ASC' } });
    }

    async getPermissionsByModule(): Promise<Record<string, Permission[]>> {
        const permissions = await this.findAllPermissions();
        const grouped: Record<string, Permission[]> = {};
        for (const p of permissions) {
            if (!grouped[p.module]) grouped[p.module] = [];
            grouped[p.module].push(p);
        }
        return grouped;
    }

    async getRolePermissions(roleId: string): Promise<Permission[]> {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });
        if (!role) throw new NotFoundException('Role not found');
        return role.permissions || [];
    }

    async setRolePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });
        if (!role) throw new NotFoundException('Role not found');

        if (permissionIds.length === 0) {
            role.permissions = [];
        } else {
            const permissions = await this.permissionRepository.find({
                where: { id: In(permissionIds) },
            });
            if (permissions.length !== permissionIds.length) {
                throw new BadRequestException('One or more permission IDs are invalid');
            }
            role.permissions = permissions;
        }

        return this.roleRepository.save(role);
    }

    async addPermissionsToRole(roleId: string, permissionIds: string[]): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });
        if (!role) throw new NotFoundException('Role not found');

        const newPerms = await this.permissionRepository.find({
            where: { id: In(permissionIds) },
        });

        const existingIds = new Set(role.permissions.map(p => p.id));
        for (const p of newPerms) {
            if (!existingIds.has(p.id)) {
                role.permissions.push(p);
            }
        }

        return this.roleRepository.save(role);
    }

    async removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: ['permissions'],
        });
        if (!role) throw new NotFoundException('Role not found');

        const removeSet = new Set(permissionIds);
        role.permissions = role.permissions.filter(p => !removeSet.has(p.id));

        return this.roleRepository.save(role);
    }
}
