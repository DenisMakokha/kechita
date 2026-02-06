import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { LoansService } from './loans.service';
import { StaffLoan, LoanType, LoanStatus } from './entities/staff-loan.entity';
import { StaffLoanRepayment, RepaymentStatus } from './entities/staff-loan-repayment.entity';
import { Staff } from '../staff/entities/staff.entity';
import { ApprovalService } from '../approval/approval.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('LoansService', () => {
    let service: LoansService;

    const mockLoanRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockRepaymentRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
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
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            }),
        },
    };

    const mockDataSource = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoansService,
                { provide: getRepositoryToken(StaffLoan), useValue: mockLoanRepo },
                { provide: getRepositoryToken(StaffLoanRepayment), useValue: mockRepaymentRepo },
                { provide: getRepositoryToken(Staff), useValue: mockStaffRepo },
                { provide: ApprovalService, useValue: mockApprovalService },
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<LoansService>(LoansService);
        jest.clearAllMocks();
    });

    describe('findById', () => {
        it('should throw NotFoundException if loan not found', async () => {
            mockLoanRepo.findOne.mockResolvedValue(null);

            await expect(service.findById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return loan with relations', async () => {
            const loan = {
                id: '1',
                loan_number: 'LN-2024-00001',
                status: LoanStatus.ACTIVE,
                repayments: [],
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);

            const result = await service.findById('1');

            expect(result).toEqual(loan);
            expect(mockLoanRepo.findOne).toHaveBeenCalledWith({
                where: { id: '1' },
                relations: ['staff', 'staff.branch', 'staff.position', 'repayments', 'approvedBy', 'rejectedBy', 'guarantor'],
            });
        });
    });

    describe('findMyLoans', () => {
        it('should return loans for staff', async () => {
            const loans = [
                { id: '1', loan_number: 'LN-2024-00001', status: LoanStatus.ACTIVE },
            ];
            mockLoanRepo.find.mockResolvedValue(loans);

            const result = await service.findMyLoans('staff-1');

            expect(result).toEqual(loans);
        });

        it('should filter by status when provided', async () => {
            mockLoanRepo.find.mockResolvedValue([]);

            await service.findMyLoans('staff-1', LoanStatus.COMPLETED);

            expect(mockLoanRepo.find).toHaveBeenCalledWith({
                where: { staff: { id: 'staff-1' }, status: LoanStatus.COMPLETED },
                relations: ['repayments'],
                order: { created_at: 'DESC' },
            });
        });
    });

    describe('cancelLoan', () => {
        it('should throw NotFoundException if loan not found', async () => {
            mockLoanRepo.findOne.mockResolvedValue(null);

            await expect(service.cancelLoan('non-existent', 'staff-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if not own loan', async () => {
            const loan = {
                id: '1',
                staff: { id: 'other-staff' },
                status: LoanStatus.PENDING,
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);

            await expect(service.cancelLoan('1', 'staff-1'))
                .rejects.toThrow(ForbiddenException);
        });

        it('should throw BadRequestException if loan already processed', async () => {
            const loan = {
                id: '1',
                staff: { id: 'staff-1' },
                status: LoanStatus.DISBURSED,
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);

            await expect(service.cancelLoan('1', 'staff-1'))
                .rejects.toThrow(BadRequestException);
        });

        it('should cancel loan and approval instance', async () => {
            const loan = {
                id: '1',
                staff: { id: 'staff-1' },
                status: LoanStatus.PENDING,
                approval_instance_id: 'approval-1',
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);
            mockLoanRepo.save.mockResolvedValue({ ...loan, status: LoanStatus.CANCELLED });

            const result = await service.cancelLoan('1', 'staff-1');

            expect(result.status).toBe(LoanStatus.CANCELLED);
            expect(mockApprovalService.cancelApproval).toHaveBeenCalledWith('approval-1');
        });
    });

    describe('disburseLoan', () => {
        it('should throw BadRequestException if loan not approved', async () => {
            const loan = {
                id: '1',
                status: LoanStatus.PENDING,
                repayments: [],
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);

            await expect(service.disburseLoan('1', 'disburser-1', 'REF-001', 'bank_transfer'))
                .rejects.toThrow(BadRequestException);
        });

        it('should disburse loan and generate schedule', async () => {
            const loan = {
                id: '1',
                status: LoanStatus.APPROVED,
                principal: 10000,
                total_interest: 1200,
                total_payable: 11200,
                term_months: 12,
                interest_rate: 12,
                repayments: [],
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);
            mockLoanRepo.save.mockImplementation(l => Promise.resolve(l));
            mockStaffRepo.findOne.mockResolvedValue({ id: 'disburser-1', full_name: 'Disburser' });
            mockRepaymentRepo.delete.mockResolvedValue({});
            mockRepaymentRepo.create.mockImplementation(data => data);
            mockRepaymentRepo.save.mockImplementation(r => Promise.resolve({ id: 'rep-1', ...r }));

            const result = await service.disburseLoan('1', 'disburser-1', 'REF-001', 'bank_transfer');

            expect(result.status).toBe(LoanStatus.ACTIVE);
            expect(result.disbursement_reference).toBe('REF-001');
        });
    });

    describe('recordRepayment', () => {
        it('should throw BadRequestException if loan not active', async () => {
            const loan = {
                id: '1',
                status: LoanStatus.PENDING,
                repayments: [],
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);

            await expect(service.recordRepayment('1', {
                amount: 1000,
                payment_reference: 'REF-001',
                payment_method: 'bank_transfer',
            })).rejects.toThrow(BadRequestException);
        });

        it('should record payment and update loan balance', async () => {
            const loan = {
                id: '1',
                status: LoanStatus.ACTIVE,
                total_payable: 10000,
                total_paid: 0,
                outstanding_balance: 10000,
                repayments: [],
            };
            const repayment = {
                id: 'rep-1',
                loan: { id: '1' },
                total_amount: 1000,
                paid_amount: 0,
                status: RepaymentStatus.SCHEDULED,
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);
            mockRepaymentRepo.findOne.mockResolvedValue(repayment);
            mockRepaymentRepo.save.mockImplementation(r => Promise.resolve(r));
            mockLoanRepo.save.mockImplementation(l => Promise.resolve(l));

            const result = await service.recordRepayment('1', {
                amount: 1000,
                payment_reference: 'REF-001',
                payment_method: 'bank_transfer',
            });

            expect(result.total_paid).toBe(1000);
            expect(result.outstanding_balance).toBe(9000);
        });

        it('should mark loan as completed when fully paid', async () => {
            const loan = {
                id: '1',
                status: LoanStatus.ACTIVE,
                total_payable: 1000,
                total_paid: 0,
                outstanding_balance: 1000,
                repayments: [],
            };
            const repayment = {
                id: 'rep-1',
                loan: { id: '1' },
                total_amount: 1000,
                paid_amount: 0,
                status: RepaymentStatus.SCHEDULED,
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);
            mockRepaymentRepo.findOne.mockResolvedValue(repayment);
            mockRepaymentRepo.save.mockImplementation(r => Promise.resolve(r));
            mockLoanRepo.save.mockImplementation(l => Promise.resolve(l));

            const result = await service.recordRepayment('1', {
                amount: 1000,
                payment_reference: 'REF-001',
                payment_method: 'bank_transfer',
            });

            expect(result.status).toBe(LoanStatus.COMPLETED);
            expect(result.outstanding_balance).toBe(0);
        });
    });

    describe('generateRepaymentSchedule', () => {
        it('should throw NotFoundException if loan not found', async () => {
            mockLoanRepo.findOne.mockResolvedValue(null);

            await expect(service.generateRepaymentSchedule('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should generate repayment schedule for loan', async () => {
            const loan = {
                id: '1',
                principal: 12000,
                total_interest: 1200,
                total_payable: 13200,
                term_months: 12,
                interest_rate: 12,
                approval_date: new Date(),
            };
            mockLoanRepo.findOne.mockResolvedValue(loan);
            mockRepaymentRepo.delete.mockResolvedValue({});
            mockRepaymentRepo.create.mockImplementation(data => data);
            mockRepaymentRepo.save.mockImplementation(r => Promise.resolve({ id: 'rep-1', ...r }));

            const result = await service.generateRepaymentSchedule('1');

            expect(result).toHaveLength(12);
            expect(mockRepaymentRepo.delete).toHaveBeenCalledWith({ loan: { id: '1' } });
        });
    });

    describe('findPendingApproval', () => {
        it('should return pending loans ordered by urgency', async () => {
            const loans = [
                { id: '1', is_urgent: true, status: LoanStatus.PENDING },
                { id: '2', is_urgent: false, status: LoanStatus.PENDING },
            ];
            mockLoanRepo.find.mockResolvedValue(loans);

            const result = await service.findPendingApproval();

            expect(result).toEqual(loans);
            expect(mockLoanRepo.find).toHaveBeenCalledWith({
                where: { status: LoanStatus.PENDING },
                relations: ['staff', 'staff.branch', 'guarantor'],
                order: { is_urgent: 'DESC', application_date: 'ASC' },
            });
        });
    });

    describe('applyForLoan', () => {
        it('should throw NotFoundException if staff not found', async () => {
            mockQueryRunner.manager.findOne.mockResolvedValue(null);

            await expect(service.applyForLoan('non-existent', {
                loan_type: LoanType.STAFF_LOAN,
                principal: 10000,
                term_months: 12,
            })).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if guarantor is self', async () => {
            const staff = { id: 'staff-1', branch: {}, position: {} };
            mockQueryRunner.manager.findOne
                .mockResolvedValueOnce(staff) // Staff lookup
                .mockResolvedValueOnce(null) // Existing loan check
                .mockResolvedValueOnce(staff); // Guarantor lookup (same as staff)

            await expect(service.applyForLoan('staff-1', {
                loan_type: LoanType.STAFF_LOAN,
                principal: 10000,
                term_months: 12,
                guarantor_id: 'staff-1',
            })).rejects.toThrow(BadRequestException);
        });
    });

    describe('calculateEMI', () => {
        it('should calculate EMI correctly for zero interest', () => {
            const emi = (service as any).calculateEMI(12000, 0, 12);
            expect(emi).toBe(1000);
        });

        it('should calculate EMI correctly with interest', () => {
            const emi = (service as any).calculateEMI(10000, 12, 12);
            expect(emi).toBeGreaterThan(0);
            expect(emi).toBeLessThan(1000); // Monthly payment should be less than principal/months + some interest
        });
    });

    describe('calculateTotalInterest', () => {
        it('should return 0 for zero interest rate', () => {
            const interest = (service as any).calculateTotalInterest(10000, 0, 12);
            expect(interest).toBe(0);
        });

        it('should calculate flat rate interest', () => {
            const interest = (service as any).calculateTotalInterest(10000, 12, 12);
            expect(interest).toBe(1200); // 10000 * 0.01 * 12 = 1200
        });
    });
});
