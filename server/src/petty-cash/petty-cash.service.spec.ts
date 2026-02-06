import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PettyCashService } from './petty-cash.service';
import { PettyCashFloat, FloatTier } from './entities/petty-cash-float.entity';
import { PettyCashTransaction, TransactionType, ExpenseCategory, TransactionStatus } from './entities/petty-cash-transaction.entity';
import { PettyCashReplenishment, ReplenishmentStatus } from './entities/petty-cash-replenishment.entity';
import { PettyCashReconciliation, ReconciliationStatus } from './entities/petty-cash-reconciliation.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PettyCashService', () => {
    let service: PettyCashService;

    const mockFloatRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
    };

    const mockTransactionRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
            getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
        }),
    };

    const mockReplenishmentRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockReconciliationRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PettyCashService,
                { provide: getRepositoryToken(PettyCashFloat), useValue: mockFloatRepo },
                { provide: getRepositoryToken(PettyCashTransaction), useValue: mockTransactionRepo },
                { provide: getRepositoryToken(PettyCashReplenishment), useValue: mockReplenishmentRepo },
                { provide: getRepositoryToken(PettyCashReconciliation), useValue: mockReconciliationRepo },
            ],
        }).compile();

        service = module.get<PettyCashService>(PettyCashService);
        jest.clearAllMocks();
    });

    describe('getAllFloats', () => {
        it('should return all floats', async () => {
            const floats = [
                { id: '1', tier: FloatTier.MEDIUM, current_balance: 10000 },
                { id: '2', tier: FloatTier.LARGE, current_balance: 25000 },
            ];
            mockFloatRepo.find.mockResolvedValue(floats);

            const result = await service.getAllFloats();

            expect(mockFloatRepo.find).toHaveBeenCalled();
            expect(result).toEqual(floats);
        });
    });

    describe('getFloat', () => {
        it('should throw NotFoundException if float not found', async () => {
            mockFloatRepo.findOne.mockResolvedValue(null);

            await expect(service.getFloat('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return float with relations', async () => {
            const float = { id: '1', tier: FloatTier.MEDIUM, branch: { name: 'Main' } };
            mockFloatRepo.findOne.mockResolvedValue(float);

            const result = await service.getFloat('1');

            expect(result).toEqual(float);
        });
    });

    describe('createFloat', () => {
        it('should throw BadRequestException if float already exists for branch', async () => {
            mockFloatRepo.findOne.mockResolvedValue({ id: '1' });

            await expect(service.createFloat({
                branch_id: 'branch-1',
                tier: FloatTier.MEDIUM,
            }, 'staff-1')).rejects.toThrow(BadRequestException);
        });

        it('should create a new float', async () => {
            const created = { id: '1', tier: FloatTier.MEDIUM, current_balance: 5000, branch: { id: 'branch-1' } };
            // First call checks if float exists for branch (returns null)
            // Second call is getFloat after creation (returns the created float)
            mockFloatRepo.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(created);
            mockFloatRepo.create.mockReturnValue(created);
            mockFloatRepo.save.mockResolvedValue(created);
            mockTransactionRepo.create.mockReturnValue({});
            mockTransactionRepo.save.mockResolvedValue({});

            const result = await service.createFloat({
                branch_id: 'branch-1',
                tier: FloatTier.MEDIUM,
                initial_balance: 5000,
            }, 'staff-1');

            expect(mockFloatRepo.create).toHaveBeenCalled();
            expect(mockFloatRepo.save).toHaveBeenCalled();
        });

        it('should throw if initial balance exceeds tier limit', async () => {
            mockFloatRepo.findOne.mockResolvedValue(null);

            await expect(service.createFloat({
                branch_id: 'branch-1',
                tier: FloatTier.SMALL,
                initial_balance: 100000, // exceeds small tier limit of 50000
            }, 'staff-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('updateFloatCustodian', () => {
        it('should throw NotFoundException if float not found', async () => {
            mockFloatRepo.findOne.mockResolvedValue(null);

            await expect(service.updateFloatCustodian('non-existent', 'staff-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should update custodian', async () => {
            const float = { id: '1', custodian: null };
            mockFloatRepo.findOne.mockResolvedValue(float);
            mockFloatRepo.update.mockResolvedValue({ affected: 1 });

            await service.updateFloatCustodian('1', 'staff-1');

            expect(mockFloatRepo.update).toHaveBeenCalled();
        });
    });

    describe('recordExpense', () => {
        it('should throw NotFoundException if float not found', async () => {
            mockFloatRepo.findOne.mockResolvedValue(null);

            await expect(service.recordExpense({
                float_id: 'non-existent',
                category: ExpenseCategory.OFFICE_SUPPLIES,
                description: 'Pens',
                amount: 100,
                transaction_date: '2024-01-15',
            }, 'staff-1')).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if insufficient balance', async () => {
            mockFloatRepo.findOne.mockResolvedValue({ id: '1', current_balance: 50 });

            await expect(service.recordExpense({
                float_id: '1',
                category: ExpenseCategory.OFFICE_SUPPLIES,
                description: 'Pens',
                amount: 100,
                transaction_date: '2024-01-15',
            }, 'staff-1')).rejects.toThrow(BadRequestException);
        });

        it('should record expense and update balance', async () => {
            const float = { id: '1', current_balance: 1000 };
            mockFloatRepo.findOne.mockResolvedValue(float);
            const transaction = { id: 't1', amount: 100 };
            mockTransactionRepo.create.mockReturnValue(transaction);
            mockTransactionRepo.save.mockResolvedValue(transaction);
            mockFloatRepo.update.mockResolvedValue({ affected: 1 });

            const result = await service.recordExpense({
                float_id: '1',
                category: ExpenseCategory.OFFICE_SUPPLIES,
                description: 'Pens',
                amount: 100,
                transaction_date: '2024-01-15',
            }, 'staff-1');

            expect(mockTransactionRepo.save).toHaveBeenCalled();
        });
    });

    describe('requestReplenishment', () => {
        it('should throw NotFoundException if float not found', async () => {
            mockFloatRepo.findOne.mockResolvedValue(null);

            await expect(service.requestReplenishment({
                float_id: 'non-existent',
                amount_requested: 5000,
            }, 'staff-1')).rejects.toThrow(NotFoundException);
        });

        it('should create replenishment request', async () => {
            const float = { id: '1', current_balance: 1000, maximum_limit: 20000 };
            mockFloatRepo.findOne.mockResolvedValue(float);
            const replenishment = { id: 'r1', amount_requested: 5000, status: ReplenishmentStatus.REQUESTED };
            mockReplenishmentRepo.create.mockReturnValue(replenishment);
            mockReplenishmentRepo.save.mockResolvedValue(replenishment);

            const result = await service.requestReplenishment({
                float_id: '1',
                amount_requested: 5000,
            }, 'staff-1');

            expect(mockReplenishmentRepo.save).toHaveBeenCalled();
        });
    });

    describe('approveReplenishment', () => {
        it('should throw NotFoundException if replenishment not found', async () => {
            mockReplenishmentRepo.findOne.mockResolvedValue(null);

            await expect(service.approveReplenishment('non-existent', 'staff-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should approve replenishment', async () => {
            const replenishment = { id: 'r1', status: ReplenishmentStatus.REQUESTED, amount_requested: 5000 };
            mockReplenishmentRepo.findOne.mockResolvedValue(replenishment);
            mockReplenishmentRepo.save.mockResolvedValue({
                ...replenishment,
                status: ReplenishmentStatus.APPROVED,
                amount_approved: 5000,
            });

            const result = await service.approveReplenishment('r1', 'staff-1');

            expect(result.status).toBe(ReplenishmentStatus.APPROVED);
        });
    });

    describe('performCashCount', () => {
        it('should throw NotFoundException if float not found', async () => {
            mockFloatRepo.findOne.mockResolvedValue(null);

            await expect(service.performCashCount({
                float_id: 'non-existent',
                physical_count: 5000,
            }, 'staff-1')).rejects.toThrow(NotFoundException);
        });

        it('should create reconciliation record', async () => {
            const float = { id: '1', current_balance: 5000 };
            mockFloatRepo.findOne.mockResolvedValue(float);
            const reconciliation = { id: 'rec1', physical_count: 5000, system_balance: 5000, variance: 0 };
            mockReconciliationRepo.create.mockReturnValue(reconciliation);
            mockReconciliationRepo.save.mockResolvedValue(reconciliation);

            const result = await service.performCashCount({
                float_id: '1',
                physical_count: 5000,
            }, 'staff-1');

            expect(mockReconciliationRepo.save).toHaveBeenCalled();
        });

        it('should calculate variance correctly', async () => {
            const float = { id: '1', current_balance: 5000 };
            mockFloatRepo.findOne.mockResolvedValue(float);
            const reconciliation = { id: 'rec1', physical_count: 4800, system_balance: 5000, variance: -200 };
            mockReconciliationRepo.create.mockReturnValue(reconciliation);
            mockReconciliationRepo.save.mockResolvedValue(reconciliation);

            const result = await service.performCashCount({
                float_id: '1',
                physical_count: 4800,
                variance_explanation: 'Missing receipt',
            }, 'staff-1');

            expect(mockReconciliationRepo.save).toHaveBeenCalled();
        });
    });

    describe('getFloatsNeedingReplenishment', () => {
        it('should return floats below minimum threshold', async () => {
            const floats = [
                { id: '1', current_balance: 1000, minimum_threshold: 2000 },
            ];
            mockFloatRepo.find.mockResolvedValue(floats);

            const result = await service.getFloatsNeedingReplenishment();

            expect(mockFloatRepo.find).toHaveBeenCalled();
        });
    });

    describe('getDashboardStats', () => {
        it('should return dashboard statistics', async () => {
            mockFloatRepo.find.mockResolvedValue([
                { id: '1', current_balance: 5000, maximum_limit: 20000 },
                { id: '2', current_balance: 15000, maximum_limit: 20000 },
            ]);
            mockReplenishmentRepo.find.mockResolvedValue([]);
            mockReconciliationRepo.find.mockResolvedValue([]);

            const result = await service.getDashboardStats();

            expect(result).toHaveProperty('total_floats');
            expect(result).toHaveProperty('total_balance');
        });
    });
});
