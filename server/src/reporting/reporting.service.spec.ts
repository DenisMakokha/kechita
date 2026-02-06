import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportingService } from './reporting.service';
import { BranchDailyReport } from './entities/branch-daily-report.entity';
import { NotFoundException } from '@nestjs/common';

describe('ReportingService', () => {
    let service: ReportingService;

    const mockReportRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportingService,
                { provide: getRepositoryToken(BranchDailyReport), useValue: mockReportRepo },
            ],
        }).compile();

        service = module.get<ReportingService>(ReportingService);
        jest.clearAllMocks();
    });

    describe('submitReport', () => {
        it('should create and save a new report', async () => {
            const dto = {
                branch_id: 'branch-1',
                loans_new_count: 10,
                loans_disbursed_amount: 50000,
                recoveries_amount: 30000,
            };
            const created = { id: '1', ...dto, status: 'submitted' };
            mockReportRepo.create.mockReturnValue(created);
            mockReportRepo.save.mockResolvedValue(created);

            const result = await service.submitReport('staff-1', 'branch-1', dto);

            expect(mockReportRepo.create).toHaveBeenCalled();
            expect(mockReportRepo.save).toHaveBeenCalledWith(created);
            expect(result).toEqual(created);
        });

        it('should use current date if report_date not provided', async () => {
            const dto = { branch_id: 'branch-1' };
            const created = { id: '1', status: 'submitted' };
            mockReportRepo.create.mockReturnValue(created);
            mockReportRepo.save.mockResolvedValue(created);

            await service.submitReport('staff-1', 'branch-1', dto);

            expect(mockReportRepo.create).toHaveBeenCalled();
        });
    });

    describe('getReportsByBranch', () => {
        it('should return reports for a branch', async () => {
            const reports = [
                { id: '1', branch: { id: 'branch-1' }, loans_disbursed_amount: 50000 },
                { id: '2', branch: { id: 'branch-1' }, loans_disbursed_amount: 60000 },
            ];
            mockReportRepo.find.mockResolvedValue(reports);

            const result = await service.getReportsByBranch('branch-1');

            expect(mockReportRepo.find).toHaveBeenCalled();
            expect(result).toEqual(reports);
        });

        it('should filter by date range if provided', async () => {
            const reports = [{ id: '1', branch: { id: 'branch-1' } }];
            mockReportRepo.find.mockResolvedValue(reports);

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');
            const result = await service.getReportsByBranch('branch-1', startDate, endDate);

            expect(mockReportRepo.find).toHaveBeenCalled();
            expect(result).toEqual(reports);
        });
    });

    describe('getReportsByRegion', () => {
        it('should return reports for a region', async () => {
            const reports = [
                { id: '1', branch: { id: 'b1', region: { id: 'region-1' } } },
                { id: '2', branch: { id: 'b2', region: { id: 'region-1' } } },
            ];
            mockReportRepo.find.mockResolvedValue(reports);

            const result = await service.getReportsByRegion('region-1');

            expect(mockReportRepo.find).toHaveBeenCalledWith({
                where: { branch: { region: { id: 'region-1' } } },
                relations: ['branch'],
                order: { report_date: 'DESC' },
            });
            expect(result).toEqual(reports);
        });
    });

    describe('approveReport', () => {
        it('should throw NotFoundException if report not found', async () => {
            mockReportRepo.findOne.mockResolvedValue(null);

            await expect(service.approveReport('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should approve report without comment', async () => {
            const report = { id: '1', status: 'submitted', rm_comment: null };
            mockReportRepo.findOne.mockResolvedValue(report);
            mockReportRepo.save.mockResolvedValue({ ...report, status: 'approved' });

            const result = await service.approveReport('1');

            expect(result.status).toBe('approved');
        });

        it('should approve report with comment', async () => {
            const report = { id: '1', status: 'submitted', rm_comment: null };
            mockReportRepo.findOne.mockResolvedValue(report);
            mockReportRepo.save.mockResolvedValue({
                ...report,
                status: 'approved',
                rm_comment: 'Good work',
            });

            const result = await service.approveReport('1', 'Good work');

            expect(result.status).toBe('approved');
            expect(result.rm_comment).toBe('Good work');
        });
    });

    describe('getCEODashboard', () => {
        it('should return dashboard analytics summary', async () => {
            const reports = [
                {
                    id: '1',
                    loans_disbursed_amount: 50000,
                    recoveries_amount: 30000,
                    loans_new_count: 10,
                    par_ratio: 5,
                    branch: { id: 'b1', name: 'Branch 1', region: { id: 'r1', name: 'Region 1' } },
                },
                {
                    id: '2',
                    loans_disbursed_amount: 60000,
                    recoveries_amount: 40000,
                    loans_new_count: 15,
                    par_ratio: 3,
                    branch: { id: 'b2', name: 'Branch 2', region: { id: 'r1', name: 'Region 1' } },
                },
            ];
            mockReportRepo.find.mockResolvedValue(reports);

            const result = await service.getCEODashboard();

            expect(result).toHaveProperty('totalDisbursed');
            expect(result).toHaveProperty('totalRecoveries');
            expect(result).toHaveProperty('totalNewLoans');
            expect(result).toHaveProperty('avgPAR');
            expect(result).toHaveProperty('reportCount');
            expect(result).toHaveProperty('regionPerformance');
        });

        it('should handle empty reports', async () => {
            mockReportRepo.find.mockResolvedValue([]);

            const result = await service.getCEODashboard();

            expect(result.totalDisbursed).toBe(0);
            expect(result.totalRecoveries).toBe(0);
            expect(result.totalNewLoans).toBe(0);
            expect(result.reportCount).toBe(0);
        });
    });
});
