import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClaimsService } from './claims.service';
import { Claim, ClaimStatus } from './entities/claim.entity';
import { ClaimType } from './entities/claim-type.entity';
import { ClaimItem, ClaimItemStatus } from './entities/claim-item.entity';
import { Staff } from '../staff/entities/staff.entity';
import { ApprovalService } from '../approval/approval.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ClaimsService', () => {
    let service: ClaimsService;

    const mockClaimRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockClaimTypeRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockClaimItemRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockStaffRepo = {
        findOne: jest.fn(),
    };

    const mockApprovalService = {
        initiateApproval: jest.fn(),
        cancelApproval: jest.fn(),
    };

    const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        },
    };

    const mockDataSource = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClaimsService,
                { provide: getRepositoryToken(Claim), useValue: mockClaimRepo },
                { provide: getRepositoryToken(ClaimType), useValue: mockClaimTypeRepo },
                { provide: getRepositoryToken(ClaimItem), useValue: mockClaimItemRepo },
                { provide: getRepositoryToken(Staff), useValue: mockStaffRepo },
                { provide: ApprovalService, useValue: mockApprovalService },
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<ClaimsService>(ClaimsService);
        jest.clearAllMocks();
    });

    describe('getClaimTypes', () => {
        it('should return active claim types by default', async () => {
            const claimTypes = [
                { id: '1', code: 'FUEL', name: 'Fuel', is_active: true },
                { id: '2', code: 'PER_DIEM', name: 'Per Diem', is_active: true },
            ];
            mockClaimTypeRepo.find.mockResolvedValue(claimTypes);

            const result = await service.getClaimTypes();

            expect(mockClaimTypeRepo.find).toHaveBeenCalledWith({
                where: { is_active: true },
                order: { display_order: 'ASC', name: 'ASC' },
            });
            expect(result).toEqual(claimTypes);
        });

        it('should return all claim types when includeInactive is true', async () => {
            const claimTypes = [
                { id: '1', code: 'FUEL', name: 'Fuel', is_active: true },
                { id: '2', code: 'OLD_TYPE', name: 'Old Type', is_active: false },
            ];
            mockClaimTypeRepo.find.mockResolvedValue(claimTypes);

            const result = await service.getClaimTypes(true);

            expect(mockClaimTypeRepo.find).toHaveBeenCalledWith({
                where: {},
                order: { display_order: 'ASC', name: 'ASC' },
            });
            expect(result).toEqual(claimTypes);
        });
    });

    describe('getClaimTypesForStaff', () => {
        it('should throw NotFoundException if staff not found', async () => {
            mockStaffRepo.findOne.mockResolvedValue(null);

            await expect(service.getClaimTypesForStaff('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return eligible claim types for staff', async () => {
            const staff = {
                id: 'staff-1',
                position: { code: 'SALES_REP' },
                user: { roles: [{ code: 'STAFF' }] },
            };
            const claimTypes = [
                { id: '1', code: 'FUEL', name: 'Fuel', is_active: true },
                { id: '2', code: 'MANAGER_ONLY', name: 'Manager Only', eligible_role_codes: ['MANAGER'] },
            ];
            mockStaffRepo.findOne.mockResolvedValue(staff);
            mockClaimTypeRepo.find.mockResolvedValue(claimTypes);

            const result = await service.getClaimTypesForStaff('staff-1');

            expect(result).toHaveLength(1);
            expect(result[0].code).toBe('FUEL');
        });
    });

    describe('createClaimType', () => {
        it('should create a new claim type', async () => {
            const dto = { name: 'Transport', code: 'TRANSPORT' };
            const created = { id: '1', ...dto };
            mockClaimTypeRepo.create.mockReturnValue(created);
            mockClaimTypeRepo.save.mockResolvedValue(created);

            const result = await service.createClaimType(dto);

            expect(mockClaimTypeRepo.create).toHaveBeenCalledWith(dto);
            expect(mockClaimTypeRepo.save).toHaveBeenCalledWith(created);
            expect(result).toEqual(created);
        });
    });

    describe('updateClaimType', () => {
        it('should throw NotFoundException if claim type not found', async () => {
            mockClaimTypeRepo.findOne.mockResolvedValue(null);

            await expect(service.updateClaimType('non-existent', { name: 'Updated' }))
                .rejects.toThrow(NotFoundException);
        });

        it('should update existing claim type', async () => {
            const existing = { id: '1', code: 'FUEL', name: 'Fuel' };
            const updated = { ...existing, name: 'Updated Fuel' };
            mockClaimTypeRepo.findOne.mockResolvedValue(existing);
            mockClaimTypeRepo.save.mockResolvedValue(updated);

            const result = await service.updateClaimType('1', { name: 'Updated Fuel' });

            expect(result.name).toBe('Updated Fuel');
        });
    });

    describe('findById', () => {
        it('should throw NotFoundException if claim not found', async () => {
            mockClaimRepo.findOne.mockResolvedValue(null);

            await expect(service.findById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return claim with relations', async () => {
            const claim = {
                id: '1',
                claim_number: 'CLM-2024-00001',
                status: ClaimStatus.SUBMITTED,
                items: [],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            const result = await service.findById('1');

            expect(result).toEqual(claim);
            expect(mockClaimRepo.findOne).toHaveBeenCalledWith({
                where: { id: '1' },
                relations: ['staff', 'staff.branch', 'staff.position', 'items', 'items.claimType', 'approvedBy', 'rejectedBy'],
            });
        });
    });

    describe('findMyClaims', () => {
        it('should return claims for staff', async () => {
            const claims = [
                { id: '1', claim_number: 'CLM-2024-00001', status: ClaimStatus.SUBMITTED },
            ];
            mockClaimRepo.find.mockResolvedValue(claims);

            const result = await service.findMyClaims('staff-1');

            expect(result).toEqual(claims);
        });

        it('should filter by status when provided', async () => {
            mockClaimRepo.find.mockResolvedValue([]);

            await service.findMyClaims('staff-1', ClaimStatus.APPROVED);

            expect(mockClaimRepo.find).toHaveBeenCalledWith({
                where: { staff: { id: 'staff-1' }, status: ClaimStatus.APPROVED },
                relations: ['items', 'items.claimType'],
                order: { created_at: 'DESC' },
            });
        });
    });

    describe('cancelClaim', () => {
        it('should throw NotFoundException if claim not found', async () => {
            mockClaimRepo.findOne.mockResolvedValue(null);

            await expect(service.cancelClaim('non-existent', 'staff-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if not own claim', async () => {
            const claim = {
                id: '1',
                staff: { id: 'other-staff' },
                status: ClaimStatus.SUBMITTED,
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            await expect(service.cancelClaim('1', 'staff-1'))
                .rejects.toThrow(ForbiddenException);
        });

        it('should throw BadRequestException if claim already processed', async () => {
            const claim = {
                id: '1',
                staff: { id: 'staff-1' },
                status: ClaimStatus.APPROVED,
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            await expect(service.cancelClaim('1', 'staff-1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should cancel claim and approval instance', async () => {
            const claim = {
                id: '1',
                staff: { id: 'staff-1' },
                status: ClaimStatus.SUBMITTED,
                approval_instance_id: 'approval-1',
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);
            mockClaimRepo.save.mockResolvedValue({ ...claim, status: ClaimStatus.CANCELLED });

            const result = await service.cancelClaim('1', 'staff-1');

            expect(result.status).toBe(ClaimStatus.CANCELLED);
            expect(mockApprovalService.cancelApproval).toHaveBeenCalledWith('approval-1');
        });
    });

    describe('submitDraft', () => {
        it('should throw NotFoundException if claim not found', async () => {
            mockClaimRepo.findOne.mockResolvedValue(null);

            await expect(service.submitDraft('non-existent', 'staff-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if not own claim', async () => {
            const claim = {
                id: '1',
                staff: { id: 'other-staff' },
                status: ClaimStatus.DRAFT,
                items: [{ id: 'item-1' }],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            await expect(service.submitDraft('1', 'staff-1'))
                .rejects.toThrow(ForbiddenException);
        });

        it('should throw BadRequestException if not a draft', async () => {
            const claim = {
                id: '1',
                staff: { id: 'staff-1' },
                status: ClaimStatus.SUBMITTED,
                items: [{ id: 'item-1' }],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            await expect(service.submitDraft('1', 'staff-1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if no items', async () => {
            const claim = {
                id: '1',
                staff: { id: 'staff-1' },
                status: ClaimStatus.DRAFT,
                items: [],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            await expect(service.submitDraft('1', 'staff-1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should submit draft and initiate approval', async () => {
            const claim = {
                id: '1',
                staff: { id: 'staff-1' },
                status: ClaimStatus.DRAFT,
                items: [{ id: 'item-1' }],
                is_urgent: false,
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);
            mockClaimRepo.save.mockResolvedValue({ ...claim, status: ClaimStatus.SUBMITTED });
            mockApprovalService.initiateApproval.mockResolvedValue({ id: 'approval-1' });

            const result = await service.submitDraft('1', 'staff-1');

            expect(result.status).toBe(ClaimStatus.SUBMITTED);
            expect(mockApprovalService.initiateApproval).toHaveBeenCalled();
        });
    });

    describe('recordPayment', () => {
        it('should throw BadRequestException if claim not approved', async () => {
            const claim = {
                id: '1',
                status: ClaimStatus.SUBMITTED,
                items: [],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            await expect(service.recordPayment('1', 1000, 'REF-001', 'bank_transfer'))
                .rejects.toThrow(BadRequestException);
        });

        it('should record payment and update status to PAID', async () => {
            const claim = {
                id: '1',
                status: ClaimStatus.APPROVED,
                approved_amount: 1000,
                paid_amount: 0,
                items: [],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);
            mockClaimRepo.save.mockImplementation(c => Promise.resolve(c));

            const result = await service.recordPayment('1', 1000, 'REF-001', 'bank_transfer');

            expect(result.paid_amount).toBe(1000);
            expect(result.status).toBe(ClaimStatus.PAID);
            expect(result.payment_reference).toBe('REF-001');
        });

        it('should set status to PARTIALLY_PAID for partial payments', async () => {
            const claim = {
                id: '1',
                status: ClaimStatus.APPROVED,
                approved_amount: 2000,
                paid_amount: 0,
                items: [],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);
            mockClaimRepo.save.mockImplementation(c => Promise.resolve(c));

            const result = await service.recordPayment('1', 500, 'REF-001', 'mpesa');

            expect(result.paid_amount).toBe(500);
            expect(result.status).toBe(ClaimStatus.PARTIALLY_PAID);
        });
    });

    describe('reviewItems', () => {
        it('should throw BadRequestException if claim not under review', async () => {
            const claim = {
                id: '1',
                status: ClaimStatus.APPROVED,
                items: [],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);

            await expect(service.reviewItems('1', 'reviewer-1', []))
                .rejects.toThrow(BadRequestException);
        });

        it('should update item statuses and amounts', async () => {
            const claim = {
                id: '1',
                status: ClaimStatus.SUBMITTED,
                items: [
                    { id: 'item-1', amount: 1000, status: ClaimItemStatus.PENDING },
                    { id: 'item-2', amount: 500, status: ClaimItemStatus.PENDING },
                ],
            };
            mockClaimRepo.findOne.mockResolvedValue(claim);
            mockClaimItemRepo.save.mockImplementation(item => Promise.resolve(item));
            mockClaimRepo.save.mockImplementation(c => Promise.resolve(c));

            const reviews = [
                { item_id: 'item-1', approved_amount: 800, status: ClaimItemStatus.PARTIALLY_APPROVED },
                { item_id: 'item-2', approved_amount: 500, status: ClaimItemStatus.APPROVED },
            ];

            const result = await service.reviewItems('1', 'reviewer-1', reviews);

            expect(result.status).toBe(ClaimStatus.UNDER_REVIEW);
            expect(result.approved_amount).toBe(1300);
        });
    });
});
