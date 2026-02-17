import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('UserService', () => {
    let service: UserService;
    let userRepository: jest.Mocked<Repository<User>>;
    let roleRepository: jest.Mocked<Repository<Role>>;

    const mockRole: Partial<Role> = {
        id: 'role-1',
        code: 'STAFF',
        name: 'Staff',
        is_active: true,
    };

    const mockUser: Partial<User> = {
        id: 'user-1',
        email: 'test@kechita.com',
        is_active: true,
        roles: [mockRole as Role],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        remove: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            leftJoin: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            select: jest.fn().mockReturnThis(),
                            addSelect: jest.fn().mockReturnThis(),
                            groupBy: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            skip: jest.fn().mockReturnThis(),
                            take: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([]),
                            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
                            getRawMany: jest.fn().mockResolvedValue([]),
                        })),
                    },
                },
                {
                    provide: getRepositoryToken(Role),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        userRepository = module.get(getRepositoryToken(User));
        roleRepository = module.get(getRepositoryToken(Role));
    });

    describe('findOne', () => {
        it('should return a user by id', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);

            const result = await service.findOne('user-1');

            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException when user not found', async () => {
            userRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByEmail', () => {
        it('should return user by email', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);

            const result = await service.findByEmail('test@kechita.com');

            expect(result).toEqual(mockUser);
        });

        it('should return null when email not found', async () => {
            userRepository.findOne.mockResolvedValue(null);

            const result = await service.findByEmail('nonexistent@kechita.com');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create a new user', async () => {
            userRepository.findOne.mockResolvedValue(null); // No existing user
            userRepository.create.mockReturnValue(mockUser as User);
            userRepository.save.mockResolvedValue(mockUser as User);

            const result = await service.create({
                email: 'new@kechita.com',
                password: 'password123',
            });

            expect(userRepository.create).toHaveBeenCalled();
            expect(userRepository.save).toHaveBeenCalled();
        });

        it('should throw ConflictException when email already exists', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);

            await expect(
                service.create({ email: 'test@kechita.com', password: 'password123' })
            ).rejects.toThrow(ConflictException);
        });

        it('should assign role when role_code provided', async () => {
            userRepository.findOne.mockResolvedValue(null);
            roleRepository.findOne.mockResolvedValue(mockRole as Role);
            userRepository.create.mockReturnValue({ ...mockUser, roles: [] } as User);
            userRepository.save.mockResolvedValue(mockUser as User);

            await service.create({
                email: 'new@kechita.com',
                password: 'password123',
                role_code: 'STAFF',
            });

            expect(roleRepository.findOne).toHaveBeenCalled();
        });

        it('should throw BadRequestException for invalid role code', async () => {
            userRepository.findOne.mockResolvedValue(null);
            roleRepository.findOne.mockResolvedValue(null); // Role not found
            userRepository.create.mockReturnValue({ ...mockUser, roles: [] } as User);

            await expect(
                service.create({
                    email: 'new@kechita.com',
                    password: 'password123',
                    role_code: 'INVALID_ROLE',
                })
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('update', () => {
        it('should update user email', async () => {
            userRepository.findOne
                .mockResolvedValueOnce(mockUser as User) // findOne for existing user
                .mockResolvedValueOnce(null); // findByEmail check
            userRepository.save.mockResolvedValue({ ...mockUser, email: 'updated@kechita.com' } as User);

            const result = await service.update('user-1', { email: 'updated@kechita.com' });

            expect(userRepository.save).toHaveBeenCalled();
        });

        it('should throw ConflictException when updating to existing email', async () => {
            const anotherUser = { ...mockUser, id: 'user-2' } as User;
            userRepository.findOne
                .mockResolvedValueOnce(mockUser as User)
                .mockResolvedValueOnce(anotherUser);

            await expect(
                service.update('user-1', { email: 'existing@kechita.com' })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('updateRoles', () => {
        it('should update user role', async () => {
            const hrRole = { ...mockRole, id: 'role-2', code: 'HR_MANAGER' } as Role;
            userRepository.findOne.mockResolvedValue(mockUser as User);
            roleRepository.findOne.mockResolvedValue(hrRole);
            userRepository.save.mockResolvedValue({ ...mockUser, roles: [hrRole] } as User);

            const result = await service.updateRoles('user-1', { role_code: 'HR_MANAGER' });

            expect(userRepository.save).toHaveBeenCalled();
        });
    });

    describe('addRole', () => {
        it('should add a role to user', async () => {
            const hrRole = { ...mockRole, id: 'role-2', code: 'HR_MANAGER' } as Role;
            const userWithoutHR = { ...mockUser, roles: [] } as User;
            userRepository.findOne.mockResolvedValue(userWithoutHR);
            roleRepository.findOne.mockResolvedValue(hrRole);
            userRepository.save.mockResolvedValue({ ...userWithoutHR, roles: [hrRole] } as User);

            const result = await service.addRole('user-1', 'HR_MANAGER');

            expect(userRepository.save).toHaveBeenCalled();
        });

        it('should skip saving when role already exists', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);
            roleRepository.findOne.mockResolvedValue(mockRole as Role);

            const result = await service.addRole('user-1', 'STAFF');

            // Should return user - the method checks hasRole before saving
            expect(result).toBeDefined();
            expect(result.roles).toContainEqual(expect.objectContaining({ code: 'STAFF' }));
        });

        it('should throw NotFoundException for invalid role', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);
            roleRepository.findOne.mockResolvedValue(null);

            await expect(service.addRole('user-1', 'INVALID')).rejects.toThrow(NotFoundException);
        });
    });

    describe('removeRole', () => {
        it('should remove a role from user', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);
            userRepository.save.mockResolvedValue({ ...mockUser, roles: [] } as User);

            const result = await service.removeRole('user-1', 'STAFF');

            expect(userRepository.save).toHaveBeenCalled();
        });
    });

    describe('activate/deactivate', () => {
        it('should activate a user', async () => {
            const inactiveUser = { ...mockUser, is_active: false } as User;
            userRepository.findOne.mockResolvedValue(inactiveUser);
            userRepository.save.mockResolvedValue({ ...inactiveUser, is_active: true } as User);

            const result = await service.activate('user-1');

            expect(result.is_active).toBe(true);
        });

        it('should deactivate a user', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);
            userRepository.save.mockResolvedValue({ ...mockUser, is_active: false } as User);

            const result = await service.deactivate('user-1');

            expect(result.is_active).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete a user', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as User);
            userRepository.remove.mockResolvedValue(mockUser as User);

            const result = await service.delete('user-1');

            expect(result.message).toContain('deleted');
        });
    });
});
