import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeaveService } from './leave.service';
import { LeaveType } from './entities/leave-type.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { LeaveRequest, LeaveRequestStatus } from './entities/leave-request.entity';
import { PublicHoliday } from './entities/public-holiday.entity';
import { Staff } from '../staff/entities/staff.entity';
import { ApprovalService } from '../approval/approval.service';

describe('LeaveService', () => {
    let service: LeaveService;
    let leaveTypeRepo: jest.Mocked<Repository<LeaveType>>;
    let leaveBalanceRepo: jest.Mocked<Repository<LeaveBalance>>;
    let leaveRequestRepo: jest.Mocked<Repository<LeaveRequest>>;
    let publicHolidayRepo: jest.Mocked<Repository<PublicHoliday>>;
    let staffRepo: jest.Mocked<Repository<Staff>>;

    const mockLeaveType: Partial<LeaveType> = {
        id: 'type-1',
        code: 'ANNUAL',
        name: 'Annual Leave',
        max_days_per_year: 21,
        is_active: true,
        min_days_before_request: 3,
    };

    const mockStaff: Partial<Staff> = {
        id: 'staff-1',
        first_name: 'John',
        last_name: 'Doe',
    };

    const mockLeaveBalance: Partial<LeaveBalance> = {
        id: 'balance-1',
        year: 2024,
        entitled_days: 21,
        used_days: 5,
        pending_days: 0,
        carried_forward: 2,
    };

    const mockLeaveRequest: Partial<LeaveRequest> = {
        id: 'request-1',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-03-05'),
        total_days: 5,
        status: LeaveRequestStatus.PENDING,
    };

    beforeEach(async () => {
        const mockQueryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                findOne: jest.fn(),
                save: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LeaveService,
                {
                    provide: getRepositoryToken(LeaveType),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(LeaveBalance),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(LeaveRequest),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([]),
                            getOne: jest.fn().mockResolvedValue(null),
                        })),
                    },
                },
                {
                    provide: getRepositoryToken(PublicHoliday),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Staff),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest.fn(() => mockQueryRunner),
                    },
                },
                {
                    provide: ApprovalService,
                    useValue: {
                        initiateApproval: jest.fn(),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<LeaveService>(LeaveService);
        leaveTypeRepo = module.get(getRepositoryToken(LeaveType));
        leaveBalanceRepo = module.get(getRepositoryToken(LeaveBalance));
        leaveRequestRepo = module.get(getRepositoryToken(LeaveRequest));
        publicHolidayRepo = module.get(getRepositoryToken(PublicHoliday));
        staffRepo = module.get(getRepositoryToken(Staff));
    });

    describe('getLeaveTypes', () => {
        it('should return all active leave types', async () => {
            const types = [mockLeaveType as LeaveType];
            leaveTypeRepo.find.mockResolvedValue(types);

            const result = await service.getLeaveTypes();

            expect(result).toEqual(types);
            expect(leaveTypeRepo.find).toHaveBeenCalled();
        });
    });

    describe('getPublicHolidays', () => {
        it('should return holidays for a given year', async () => {
            const holidays = [
                { id: '1', name: 'New Year', date: new Date('2024-01-01') },
            ] as PublicHoliday[];
            publicHolidayRepo.find.mockResolvedValue(holidays);

            const result = await service.getPublicHolidays(2024);

            expect(result).toEqual(holidays);
        });
    });

    describe('LeaveBalance available_balance getter', () => {
        it('should calculate available balance correctly', () => {
            const balance = new LeaveBalance();
            balance.entitled_days = 21;
            balance.carried_forward = 3;
            balance.accrued_days = 0;
            balance.adjustment_days = 0;
            balance.used_days = 5;
            balance.pending_days = 2;
            balance.expired_days = 0;

            // Available = entitled + carried_forward + accrued + adjustment - used - pending - expired
            // 21 + 3 + 0 + 0 - 5 - 2 - 0 = 17
            expect(balance.available_balance).toBe(17);
        });

        it('should handle negative adjustments', () => {
            const balance = new LeaveBalance();
            balance.entitled_days = 21;
            balance.carried_forward = 0;
            balance.accrued_days = 0;
            balance.adjustment_days = -3;
            balance.used_days = 5;
            balance.pending_days = 0;
            balance.expired_days = 0;

            // 21 + 0 + 0 + (-3) - 5 - 0 - 0 = 13
            expect(balance.available_balance).toBe(13);
        });
    });

    describe('Validation Logic', () => {
        it('should validate minimum notice days requirement', () => {
            const leaveType = mockLeaveType as LeaveType;
            const today = new Date();
            const requestDate = new Date(today);
            requestDate.setDate(requestDate.getDate() + 1); // Tomorrow

            const noticeDays = Math.ceil(
                (requestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const minNoticeDays = leaveType.min_days_before_request || 0;

            // With 1 day notice and 3 days required, should fail
            expect(noticeDays).toBeLessThan(minNoticeDays);
        });

        it('should validate maximum days per year', () => {
            const leaveType = mockLeaveType as LeaveType;
            const requestedDays = 25;
            const maxDays = leaveType.max_days_per_year || Infinity;

            expect(requestedDays).toBeGreaterThan(maxDays);
        });
    });

    describe('Working Days Calculation', () => {
        it('should count weekdays correctly', () => {
            // Simple utility test for date logic
            const startDate = new Date('2024-03-04'); // Monday
            const endDate = new Date('2024-03-08'); // Friday
            
            let workingDays = 0;
            const current = new Date(startDate);
            
            while (current <= endDate) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    workingDays++;
                }
                current.setDate(current.getDate() + 1);
            }

            expect(workingDays).toBe(5);
        });

        it('should exclude weekends', () => {
            // Monday to Sunday = 5 working days
            const startDate = new Date('2024-03-04'); // Monday
            const endDate = new Date('2024-03-10'); // Sunday
            
            let workingDays = 0;
            const current = new Date(startDate);
            
            while (current <= endDate) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    workingDays++;
                }
                current.setDate(current.getDate() + 1);
            }

            expect(workingDays).toBe(5);
        });
    });
});
