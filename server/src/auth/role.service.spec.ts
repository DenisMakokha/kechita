import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('RoleService', () => {
    let service: RoleService;
    let roleRepository: jest.Mocked<Repository<Role>>;

    const mockRole: Partial<Role> = {
        id: 'role-1',
        code: 'STAFF',
        name: 'Staff',
        description: 'Regular staff member',
        is_active: true,
        users: [],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleService,
                {
                    provide: getRepositoryToken(Role),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        remove: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RoleService>(RoleService);
        roleRepository = module.get(getRepositoryToken(Role));
    });

    describe('findAll', () => {
        it('should return all active roles by default', async () => {
            const roles = [mockRole as Role];
            roleRepository.find.mockResolvedValue(roles);

            const result = await service.findAll();

            expect(result).toEqual(roles);
            expect(roleRepository.find).toHaveBeenCalledWith({
                where: { is_active: true },
                order: { code: 'ASC' },
            });
        });

        it('should include inactive roles when requested', async () => {
            const roles = [mockRole as Role];
            roleRepository.find.mockResolvedValue(roles);

            await service.findAll(true);

            expect(roleRepository.find).toHaveBeenCalledWith({
                where: {},
                order: { code: 'ASC' },
            });
        });
    });

    describe('findOne', () => {
        it('should return a role by id', async () => {
            roleRepository.findOne.mockResolvedValue(mockRole as Role);

            const result = await service.findOne('role-1');

            expect(result).toEqual(mockRole);
        });

        it('should throw NotFoundException when role not found', async () => {
            roleRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByCode', () => {
        it('should return role by code', async () => {
            roleRepository.findOne.mockResolvedValue(mockRole as Role);

            const result = await service.findByCode('STAFF');

            expect(result).toEqual(mockRole);
        });

        it('should return null when code not found', async () => {
            roleRepository.findOne.mockResolvedValue(null);

            const result = await service.findByCode('INVALID');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create a new role', async () => {
            roleRepository.findOne.mockResolvedValue(null);
            roleRepository.create.mockReturnValue(mockRole as Role);
            roleRepository.save.mockResolvedValue(mockRole as Role);

            const result = await service.create({
                code: 'NEW_ROLE',
                name: 'New Role',
            });

            expect(roleRepository.create).toHaveBeenCalled();
            expect(roleRepository.save).toHaveBeenCalled();
        });

        it('should throw ConflictException when code already exists', async () => {
            roleRepository.findOne.mockResolvedValue(mockRole as Role);

            await expect(
                service.create({ code: 'STAFF', name: 'Staff' })
            ).rejects.toThrow(ConflictException);
        });

        it('should uppercase the role code', async () => {
            roleRepository.findOne.mockResolvedValue(null);
            roleRepository.create.mockReturnValue(mockRole as Role);
            roleRepository.save.mockResolvedValue(mockRole as Role);

            await service.create({ code: 'new_role', name: 'New Role' });

            expect(roleRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ code: 'NEW_ROLE' })
            );
        });
    });

    describe('update', () => {
        it('should update role name', async () => {
            roleRepository.findOne.mockResolvedValue(mockRole as Role);
            roleRepository.save.mockResolvedValue({ ...mockRole, name: 'Updated Staff' } as Role);

            const result = await service.update('role-1', { name: 'Updated Staff' });

            expect(roleRepository.save).toHaveBeenCalled();
        });

        it('should update role description', async () => {
            roleRepository.findOne.mockResolvedValue(mockRole as Role);
            roleRepository.save.mockResolvedValue({ ...mockRole, description: 'New description' } as Role);

            const result = await service.update('role-1', { description: 'New description' });

            expect(roleRepository.save).toHaveBeenCalled();
        });
    });

    describe('activate/deactivate', () => {
        it('should activate a role', async () => {
            const inactiveRole = { ...mockRole, is_active: false } as Role;
            roleRepository.findOne.mockResolvedValue(inactiveRole);
            roleRepository.save.mockResolvedValue({ ...inactiveRole, is_active: true } as Role);

            const result = await service.activate('role-1');

            expect(result.is_active).toBe(true);
        });

        it('should deactivate a role', async () => {
            roleRepository.findOne.mockResolvedValue(mockRole as Role);
            roleRepository.save.mockResolvedValue({ ...mockRole, is_active: false } as Role);

            const result = await service.deactivate('role-1');

            expect(result.is_active).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete a role with no users', async () => {
            roleRepository.findOne
                .mockResolvedValueOnce(mockRole as Role)
                .mockResolvedValueOnce({ ...mockRole, users: [] } as Role);
            roleRepository.remove.mockResolvedValue(mockRole as Role);

            const result = await service.delete('role-1');

            expect(result.message).toContain('deleted');
        });

        it('should throw BadRequestException when role has users', async () => {
            const roleWithUsers = {
                ...mockRole,
                users: [{ id: 'user-1' }],
            } as Role;
            roleRepository.findOne
                .mockResolvedValueOnce(mockRole as Role)
                .mockResolvedValueOnce(roleWithUsers);

            await expect(service.delete('role-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('getUserCount', () => {
        it('should return user count for role', async () => {
            const roleWithUsers = {
                ...mockRole,
                users: [{ id: 'user-1' }, { id: 'user-2' }],
            } as Role;
            roleRepository.findOne.mockResolvedValue(roleWithUsers);

            const result = await service.getUserCount('role-1');

            expect(result).toBe(2);
        });

        it('should return 0 for role with no users', async () => {
            roleRepository.findOne.mockResolvedValue({ ...mockRole, users: [] } as Role);

            const result = await service.getUserCount('role-1');

            expect(result).toBe(0);
        });
    });

    describe('getRoleStats', () => {
        it('should return role stats with user counts', async () => {
            const roles = [
                { ...mockRole, users: [{ id: 'user-1' }] },
                { code: 'HR_MANAGER', name: 'HR Manager', is_active: true, users: [] },
            ] as Role[];
            roleRepository.find.mockResolvedValue(roles);

            const result = await service.getRoleStats();

            expect(result).toHaveLength(2);
            expect(result[0].userCount).toBe(1);
            expect(result[1].userCount).toBe(0);
        });
    });
});
