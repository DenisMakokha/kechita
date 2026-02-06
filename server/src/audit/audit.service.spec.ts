import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

describe('AuditService', () => {
    let service: AuditService;

    const mockAuditLogRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(10),
            getMany: jest.fn().mockResolvedValue([]),
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
        jest.clearAllMocks();
    });

    describe('log', () => {
        it('should create and save audit log', async () => {
            const dto = {
                userId: 'user-1',
                action: AuditAction.CREATE,
                entityType: 'Staff',
                entityId: 'staff-1',
                description: 'Created staff record',
            };
            const created = { id: '1', ...dto };
            mockAuditLogRepo.create.mockReturnValue(created);
            mockAuditLogRepo.save.mockResolvedValue(created);

            const result = await service.log(dto);

            expect(mockAuditLogRepo.create).toHaveBeenCalled();
            expect(mockAuditLogRepo.save).toHaveBeenCalled();
            expect(result.action).toBe(AuditAction.CREATE);
        });

        it('should default is_successful to true', async () => {
            const dto = {
                action: AuditAction.LOGIN,
                entityType: 'User',
            };
            const created = { id: '1', ...dto, is_successful: true };
            mockAuditLogRepo.create.mockReturnValue(created);
            mockAuditLogRepo.save.mockResolvedValue(created);

            const result = await service.log(dto);

            expect(result.is_successful).toBe(true);
        });
    });

    describe('logAction', () => {
        it('should call log with correct parameters', async () => {
            const created = { id: '1', action: AuditAction.UPDATE };
            mockAuditLogRepo.create.mockReturnValue(created);
            mockAuditLogRepo.save.mockResolvedValue(created);

            const result = await service.logAction(
                'user-1',
                AuditAction.UPDATE,
                'Staff',
                'staff-1',
                'Updated staff record',
                { field: 'name' },
            );

            expect(mockAuditLogRepo.create).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return audit logs with pagination', async () => {
            const logs = [{ id: '1' }, { id: '2' }];
            mockAuditLogRepo.createQueryBuilder.mockReturnValue({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(100),
                getMany: jest.fn().mockResolvedValue(logs),
            });

            const result = await service.findAll({ limit: 10, offset: 0 });

            expect(result.data).toEqual(logs);
            expect(result.total).toBe(100);
        });

        it('should apply filters when provided', async () => {
            const qb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(5),
                getMany: jest.fn().mockResolvedValue([]),
            };
            mockAuditLogRepo.createQueryBuilder.mockReturnValue(qb);

            await service.findAll({
                userId: 'user-1',
                action: AuditAction.LOGIN,
                entityType: 'User',
            });

            expect(qb.andWhere).toHaveBeenCalledTimes(3);
        });
    });

    describe('findByEntity', () => {
        it('should return logs for specific entity', async () => {
            const logs = [
                { id: '1', entity_type: 'Staff', entity_id: 'staff-1' },
                { id: '2', entity_type: 'Staff', entity_id: 'staff-1' },
            ];
            mockAuditLogRepo.find.mockResolvedValue(logs);

            const result = await service.findByEntity('Staff', 'staff-1');

            expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
                where: { entity_type: 'Staff', entity_id: 'staff-1' },
                relations: ['user'],
                order: { created_at: 'DESC' },
            });
            expect(result).toEqual(logs);
        });
    });

    describe('findByUser', () => {
        it('should return logs for specific user', async () => {
            const logs = [{ id: '1', user_id: 'user-1' }];
            mockAuditLogRepo.find.mockResolvedValue(logs);

            const result = await service.findByUser('user-1', 50);

            expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
                where: { user_id: 'user-1' },
                order: { created_at: 'DESC' },
                take: 50,
            });
            expect(result).toEqual(logs);
        });
    });

    describe('getRecentActivity', () => {
        it('should return recent audit logs', async () => {
            const logs = [{ id: '1' }, { id: '2' }];
            mockAuditLogRepo.find.mockResolvedValue(logs);

            const result = await service.getRecentActivity(20);

            expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
                relations: ['user'],
                order: { created_at: 'DESC' },
                take: 20,
            });
            expect(result).toEqual(logs);
        });
    });

    describe('getActivityStats', () => {
        it('should return activity statistics', async () => {
            const logs = [
                { action: AuditAction.CREATE, entity_type: 'Staff', is_successful: true },
                { action: AuditAction.CREATE, entity_type: 'Staff', is_successful: true },
                { action: AuditAction.LOGIN, entity_type: 'User', is_successful: false },
                { action: AuditAction.UPDATE, entity_type: 'Leave', is_successful: true },
            ];
            mockAuditLogRepo.find.mockResolvedValue(logs);

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');
            const result = await service.getActivityStats(startDate, endDate);

            expect(result.totalActions).toBe(4);
            expect(result.failedActions).toBe(1);
            expect(result.actionCounts[AuditAction.CREATE]).toBe(2);
            expect(result.entityTypeCounts['Staff']).toBe(2);
        });
    });

    describe('getLoginHistory', () => {
        it('should return login history for user', async () => {
            const logs = [
                { id: '1', action: AuditAction.LOGIN },
                { id: '2', action: AuditAction.LOGIN },
            ];
            mockAuditLogRepo.find.mockResolvedValue(logs);

            const result = await service.getLoginHistory('user-1', 10);

            expect(mockAuditLogRepo.find).toHaveBeenCalledWith({
                where: { user_id: 'user-1', action: AuditAction.LOGIN },
                order: { created_at: 'DESC' },
                take: 10,
            });
            expect(result).toEqual(logs);
        });
    });

    describe('cleanOldLogs', () => {
        it('should delete logs older than retention period', async () => {
            mockAuditLogRepo.delete.mockResolvedValue({ affected: 100 });

            const result = await service.cleanOldLogs(90);

            expect(mockAuditLogRepo.delete).toHaveBeenCalled();
            expect(result).toBe(100);
        });
    });
});
