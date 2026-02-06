import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgService } from './org.service';
import { Region } from './entities/region.entity';
import { Branch } from './entities/branch.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('OrgService', () => {
    let service: OrgService;
    let regionRepo: jest.Mocked<Repository<Region>>;
    let branchRepo: jest.Mocked<Repository<Branch>>;
    let departmentRepo: jest.Mocked<Repository<Department>>;
    let positionRepo: jest.Mocked<Repository<Position>>;

    const mockRegion: Partial<Region> = {
        id: 'region-1',
        name: 'Nairobi',
        code: 'NRB',
        is_active: true,
        branches: [],
    };

    const mockBranch: Partial<Branch> = {
        id: 'branch-1',
        name: 'Westlands',
        code: 'WESTLANDS',
        is_active: true,
        region: mockRegion as Region,
    };

    const mockDepartment: Partial<Department> = {
        id: 'dept-1',
        name: 'Operations',
        code: 'OPS',
        is_active: true,
        children: [],
    };

    const mockPosition: Partial<Position> = {
        id: 'pos-1',
        name: 'Branch Manager',
        code: 'BM',
        level: 3,
        is_active: true,
    };

    const createMockRepository = () => ({
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        count: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        })),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrgService,
                { provide: getRepositoryToken(Region), useValue: createMockRepository() },
                { provide: getRepositoryToken(Branch), useValue: createMockRepository() },
                { provide: getRepositoryToken(Department), useValue: createMockRepository() },
                { provide: getRepositoryToken(Position), useValue: createMockRepository() },
            ],
        }).compile();

        service = module.get<OrgService>(OrgService);
        regionRepo = module.get(getRepositoryToken(Region));
        branchRepo = module.get(getRepositoryToken(Branch));
        departmentRepo = module.get(getRepositoryToken(Department));
        positionRepo = module.get(getRepositoryToken(Position));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== REGIONS ====================

    describe('createRegion', () => {
        it('should create a region with auto-generated code', async () => {
            regionRepo.findOne.mockResolvedValue(null);
            regionRepo.create.mockReturnValue(mockRegion as Region);
            regionRepo.save.mockResolvedValue(mockRegion as Region);

            const result = await service.createRegion({ name: 'Nairobi' });

            expect(regionRepo.create).toHaveBeenCalled();
            expect(regionRepo.save).toHaveBeenCalled();
        });

        it('should throw ConflictException for duplicate code', async () => {
            regionRepo.findOne.mockResolvedValue(mockRegion as Region);

            await expect(
                service.createRegion({ name: 'Nairobi', code: 'NRB' })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('getRegion', () => {
        it('should return a region by id', async () => {
            regionRepo.findOne.mockResolvedValue(mockRegion as Region);

            const result = await service.getRegion('region-1');

            expect(result).toEqual(mockRegion);
        });

        it('should throw NotFoundException when region not found', async () => {
            regionRepo.findOne.mockResolvedValue(null);

            await expect(service.getRegion('invalid-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteRegion', () => {
        it('should delete a region with no branches', async () => {
            regionRepo.findOne.mockResolvedValue({ ...mockRegion, branches: [] } as Region);
            regionRepo.remove.mockResolvedValue(mockRegion as Region);

            const result = await service.deleteRegion('region-1');

            expect(result.message).toContain('deleted');
        });

        it('should throw BadRequestException when region has branches', async () => {
            regionRepo.findOne.mockResolvedValue({
                ...mockRegion,
                branches: [mockBranch],
            } as Region);

            await expect(service.deleteRegion('region-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ==================== BRANCHES ====================

    describe('createBranch', () => {
        it('should create a branch', async () => {
            regionRepo.findOne.mockResolvedValue(mockRegion as Region);
            branchRepo.findOne.mockResolvedValue(null);
            branchRepo.create.mockReturnValue(mockBranch as Branch);
            branchRepo.save.mockResolvedValue(mockBranch as Branch);

            const result = await service.createBranch({
                name: 'Westlands',
                region_id: 'region-1',
            });

            expect(branchRepo.create).toHaveBeenCalled();
            expect(branchRepo.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException for invalid region', async () => {
            regionRepo.findOne.mockResolvedValue(null);

            await expect(
                service.createBranch({ name: 'Test', region_id: 'invalid-id' })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getBranch', () => {
        it('should return a branch by id', async () => {
            branchRepo.findOne.mockResolvedValue(mockBranch as Branch);

            const result = await service.getBranch('branch-1');

            expect(result).toEqual(mockBranch);
        });

        it('should throw NotFoundException when branch not found', async () => {
            branchRepo.findOne.mockResolvedValue(null);

            await expect(service.getBranch('invalid-id')).rejects.toThrow(NotFoundException);
        });
    });

    // ==================== DEPARTMENTS ====================

    describe('createDepartment', () => {
        it('should create a department', async () => {
            departmentRepo.findOne.mockResolvedValue(null);
            departmentRepo.create.mockReturnValue(mockDepartment as Department);
            departmentRepo.save.mockResolvedValue(mockDepartment as Department);

            const result = await service.createDepartment({ name: 'Operations' });

            expect(departmentRepo.create).toHaveBeenCalled();
            expect(departmentRepo.save).toHaveBeenCalled();
        });

        it('should create department with parent', async () => {
            departmentRepo.findOne
                .mockResolvedValueOnce(null) // code check
                .mockResolvedValueOnce(mockDepartment as Department); // parent check
            departmentRepo.create.mockReturnValue(mockDepartment as Department);
            departmentRepo.save.mockResolvedValue(mockDepartment as Department);

            await service.createDepartment({
                name: 'Sub-Operations',
                parent_id: 'dept-1',
            });

            expect(departmentRepo.save).toHaveBeenCalled();
        });
    });

    describe('deleteDepartment', () => {
        it('should delete a department with no children', async () => {
            departmentRepo.findOne.mockResolvedValue({ ...mockDepartment, children: [] } as Department);
            departmentRepo.remove.mockResolvedValue(mockDepartment as Department);

            const result = await service.deleteDepartment('dept-1');

            expect(result.message).toContain('deleted');
        });

        it('should throw BadRequestException when department has children', async () => {
            departmentRepo.findOne.mockResolvedValue({
                ...mockDepartment,
                children: [{ id: 'child-1' }],
            } as Department);

            await expect(service.deleteDepartment('dept-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ==================== POSITIONS ====================

    describe('createPosition', () => {
        it('should create a position', async () => {
            positionRepo.findOne.mockResolvedValue(null);
            positionRepo.create.mockReturnValue(mockPosition as Position);
            positionRepo.save.mockResolvedValue(mockPosition as Position);

            const result = await service.createPosition({ name: 'Branch Manager' });

            expect(positionRepo.create).toHaveBeenCalled();
            expect(positionRepo.save).toHaveBeenCalled();
        });

        it('should create position with department and reports_to', async () => {
            positionRepo.findOne
                .mockResolvedValueOnce(null) // code check
                .mockResolvedValueOnce(mockPosition as Position); // reports_to check
            departmentRepo.findOne.mockResolvedValue(mockDepartment as Department);
            positionRepo.create.mockReturnValue(mockPosition as Position);
            positionRepo.save.mockResolvedValue(mockPosition as Position);

            await service.createPosition({
                name: 'Loan Officer',
                department_id: 'dept-1',
                reports_to_id: 'pos-1',
            });

            expect(positionRepo.save).toHaveBeenCalled();
        });
    });

    describe('updatePosition', () => {
        it('should throw BadRequestException when position reports to itself', async () => {
            positionRepo.findOne.mockResolvedValue(mockPosition as Position);

            await expect(
                service.updatePosition('pos-1', { reports_to_id: 'pos-1' })
            ).rejects.toThrow(BadRequestException);
        });
    });

    // ==================== STATS ====================

    describe('getOrgStats', () => {
        it('should return org statistics', async () => {
            regionRepo.count.mockResolvedValue(5);
            branchRepo.count.mockResolvedValue(20);
            departmentRepo.count.mockResolvedValue(8);
            positionRepo.count.mockResolvedValue(15);

            const result = await service.getOrgStats();

            expect(result).toEqual({
                regions: 5,
                branches: 20,
                departments: 8,
                positions: 15,
            });
        });
    });

    describe('getRegionStats', () => {
        it('should return region stats with branch counts', async () => {
            const regionsWithBranches = [
                { ...mockRegion, branches: [mockBranch, mockBranch] },
                { ...mockRegion, id: 'region-2', name: 'Coast', branches: [] },
            ] as Region[];
            regionRepo.find.mockResolvedValue(regionsWithBranches);

            const result = await service.getRegionStats();

            expect(result).toHaveLength(2);
            expect(result[0].branchCount).toBe(2);
            expect(result[1].branchCount).toBe(0);
        });
    });
});
