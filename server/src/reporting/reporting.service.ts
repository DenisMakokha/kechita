import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { BranchDailyReport } from './entities/branch-daily-report.entity';
import { Staff, StaffStatus } from '../staff/entities/staff.entity';
import { LeaveRequest, LeaveRequestStatus } from '../leave/entities/leave-request.entity';
import { Claim, ClaimStatus } from '../claims/entities/claim.entity';
import { StaffLoan, LoanStatus } from '../loans/entities/staff-loan.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface RegionPerformance {
    name: string;
    disbursed: number;
    collections: number;
    par: number;
    loansCount: number;
    branchCount: number;
}

export interface MonthlyTrend {
    month: string;
    disbursed: number;
    collections: number;
    newLoans: number;
    par: number;
}

export interface SubmitReportDto {
    branch_id: string;
    report_date?: string;
    loans_new_count?: number;
    loans_disbursed_amount?: number;
    recoveries_amount?: number;
    arrears_collected?: number;
    prepayments_due?: number;
    par_amount?: number;
    par_ratio?: number;
    par_1_30?: number;
    par_31_60?: number;
    par_61_90?: number;
    par_90_plus?: number;
    manager_comment?: string;
}

export interface AnalyticsSummary {
    period: { start: Date; end: Date };
    totalDisbursed: number;
    totalRecoveries: number;
    totalNewLoans: number;
    avgPAR: number;
    reportCount: number;
    regionPerformance: RegionPerformance[];
    monthlyTrends: MonthlyTrend[];
    topPerformingBranches: { name: string; collections: number; par: number }[];
    riskAlerts: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[];
    staffStats: {
        total: number;
        active: number;
        onLeave: number;
        onboarding: number;
        probation: number;
        byRegion: { regionName: string; count: number }[];
    };
    leaveStats: {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        totalDays: number;
    };
    claimsStats: {
        total: number;
        submitted: number;
        approved: number;
        rejected: number;
        totalAmount: number;
        approvedAmount: number;
        pendingCount: number;
    };
    loanStats: {
        total: number;
        pending: number;
        active: number;
        completed: number;
        totalDisbursed: number;
        totalOutstanding: number;
    };
    trends: {
        disbursedChange: number;
        recoveriesChange: number;
        newLoansChange: number;
        parChange: number;
    };
}

@Injectable()
export class ReportingService {
    constructor(
        @InjectRepository(BranchDailyReport)
        private reportRepo: Repository<BranchDailyReport>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        @InjectRepository(LeaveRequest)
        private leaveRepo: Repository<LeaveRequest>,
        @InjectRepository(Claim)
        private claimRepo: Repository<Claim>,
        @InjectRepository(StaffLoan)
        private loanRepo: Repository<StaffLoan>,
        @InjectRepository(Region)
        private regionRepo: Repository<Region>,
        @InjectRepository(Branch)
        private branchRepo: Repository<Branch>,
    ) { }

    async submitReport(staffId: string, branchId: string, dto: SubmitReportDto) {
        const report = this.reportRepo.create({
            branch: { id: branchId } as any,
            submittedBy: { id: staffId } as any,
            status: 'submitted',
            report_date: dto.report_date ? new Date(dto.report_date) : new Date(),
            loans_new_count: dto.loans_new_count,
            loans_disbursed_amount: dto.loans_disbursed_amount,
            recoveries_amount: dto.recoveries_amount,
            arrears_collected: dto.arrears_collected,
            prepayments_due: dto.prepayments_due,
            par_amount: dto.par_amount,
            par_ratio: dto.par_ratio,
            par_1_30: dto.par_1_30,
            par_31_60: dto.par_31_60,
            par_61_90: dto.par_61_90,
            par_90_plus: dto.par_90_plus,
            manager_comment: dto.manager_comment,
        });
        return this.reportRepo.save(report);
    }

    async getReportsByBranch(branchId: string, startDate?: Date, endDate?: Date) {
        const where: any = { branch: { id: branchId } };
        if (startDate && endDate) {
            where.report_date = Between(startDate, endDate);
        }
        return this.reportRepo.find({ where, order: { report_date: 'DESC' } });
    }

    async getReportsByRegion(regionId: string) {
        return this.reportRepo.find({
            where: { branch: { region: { id: regionId } } },
            relations: ['branch'],
            order: { report_date: 'DESC' },
        });
    }

    async approveReport(reportId: string, comment?: string) {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Report not found');
        report.status = 'approved';
        if (comment) report.rm_comment = comment;
        return this.reportRepo.save(report);
    }

    async getCEODashboard(): Promise<AnalyticsSummary> {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        // ==================== BRANCH DAILY REPORTS ====================
        const reports = await this.reportRepo.find({
            where: { report_date: Between(monthStart, today) },
            relations: ['branch', 'branch.region'],
        });

        const prevMonthReports = await this.reportRepo.find({
            where: { report_date: Between(prevMonthStart, prevMonthEnd) },
        });

        // Calculate current month totals
        const totals = reports.reduce(
            (acc, r) => ({
                totalDisbursed: acc.totalDisbursed + Number(r.loans_disbursed_amount || 0),
                totalRecoveries: acc.totalRecoveries + Number(r.recoveries_amount || 0),
                totalNewLoans: acc.totalNewLoans + (r.loans_new_count || 0),
                avgPAR: acc.avgPAR + Number(r.par_ratio || 0),
            }),
            { totalDisbursed: 0, totalRecoveries: 0, totalNewLoans: 0, avgPAR: 0 },
        );

        // Calculate previous month totals for trends
        const prevTotals = prevMonthReports.reduce(
            (acc, r) => ({
                totalDisbursed: acc.totalDisbursed + Number(r.loans_disbursed_amount || 0),
                totalRecoveries: acc.totalRecoveries + Number(r.recoveries_amount || 0),
                totalNewLoans: acc.totalNewLoans + (r.loans_new_count || 0),
                avgPAR: acc.avgPAR + Number(r.par_ratio || 0),
            }),
            { totalDisbursed: 0, totalRecoveries: 0, totalNewLoans: 0, avgPAR: 0 },
        );

        if (reports.length > 0) {
            totals.avgPAR = totals.avgPAR / reports.length;
        }
        if (prevMonthReports.length > 0) {
            prevTotals.avgPAR = prevTotals.avgPAR / prevMonthReports.length;
        }

        // Calculate trends (month-over-month percentage change)
        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Number((((current - previous) / previous) * 100).toFixed(1));
        };

        const trends = {
            disbursedChange: calculateChange(totals.totalDisbursed, prevTotals.totalDisbursed),
            recoveriesChange: calculateChange(totals.totalRecoveries, prevTotals.totalRecoveries),
            newLoansChange: calculateChange(totals.totalNewLoans, prevTotals.totalNewLoans),
            parChange: calculateChange(totals.avgPAR, prevTotals.avgPAR),
        };

        // Group by region for regional performance
        const regionMap = new Map<string, RegionPerformance>();
        for (const report of reports) {
            const regionName = report.branch?.region?.name || 'Unknown';
            const existing = regionMap.get(regionName) || {
                name: regionName,
                disbursed: 0,
                collections: 0,
                par: 0,
                loansCount: 0,
                branchCount: 0,
            };
            existing.disbursed += Number(report.loans_disbursed_amount || 0);
            existing.collections += Number(report.recoveries_amount || 0);
            existing.par += Number(report.par_ratio || 0);
            existing.loansCount += report.loans_new_count || 0;
            existing.branchCount++;
            regionMap.set(regionName, existing);
        }

        // Normalize PAR for regions
        const regionPerformance = Array.from(regionMap.values()).map(r => ({
            ...r,
            par: r.branchCount > 0 ? r.par / r.branchCount : 0,
        }));

        // ==================== REAL STAFF STATISTICS ====================
        const staffStats = await this.getStaffStats(today);

        // ==================== REAL LEAVE STATISTICS ====================
        const leaveStats = await this.getLeaveStats(yearStart, today);

        // ==================== REAL CLAIMS STATISTICS ====================
        const claimsStats = await this.getClaimsStats(yearStart, today);

        // ==================== REAL LOAN STATISTICS ====================
        const loanStats = await this.getLoanStats(yearStart, today);

        // Generate monthly trends (last 6 months)
        const monthlyTrends = await this.getMonthlyTrends(6);

        // Get top performing branches
        const topPerformingBranches = await this.getTopPerformingBranches(5);

        // Risk alerts (including HR-related alerts)
        const riskAlerts = await this.generateComprehensiveRiskAlerts(
            regionPerformance,
            totals.avgPAR,
            staffStats,
            leaveStats,
            claimsStats,
            loanStats,
        );

        return {
            period: { start: monthStart, end: today },
            ...totals,
            reportCount: reports.length,
            regionPerformance,
            monthlyTrends,
            topPerformingBranches,
            riskAlerts,
            staffStats,
            leaveStats,
            claimsStats,
            loanStats,
            trends,
        };
    }

    // ==================== REAL DATA FETCHING METHODS ====================

    private async getStaffStats(today: Date): Promise<AnalyticsSummary['staffStats']> {
        const todayStr = today.toISOString().split('T')[0];

        // Total staff count by status
        const statusCounts = await this.staffRepo
            .createQueryBuilder('staff')
            .select('staff.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('staff.status')
            .getRawMany();

        const statusMap = statusCounts.reduce((acc, curr) => {
            acc[curr.status] = parseInt(curr.count);
            return acc;
        }, {} as Record<string, number>);

        // Count staff on leave today
        const onLeaveCount = await this.leaveRepo
            .createQueryBuilder('leave')
            .where('leave.status = :status', { status: LeaveRequestStatus.APPROVED })
            .andWhere('leave.start_date <= :today', { today: todayStr })
            .andWhere('leave.end_date >= :today', { today: todayStr })
            .getCount();

        // Staff by region
        const byRegion = await this.staffRepo
            .createQueryBuilder('staff')
            .leftJoin('staff.region', 'region')
            .select('region.name', 'regionName')
            .addSelect('COUNT(*)', 'count')
            .where('staff.status IN (:...activeStatuses)', {
                activeStatuses: [StaffStatus.ACTIVE, StaffStatus.PROBATION, StaffStatus.ONBOARDING],
            })
            .groupBy('region.name')
            .getRawMany();

        const total = Object.values(statusMap).reduce((a: number, b: number) => a + b, 0);
        const active = statusMap[StaffStatus.ACTIVE] || 0;
        const onboarding = statusMap[StaffStatus.ONBOARDING] || 0;
        const probation = statusMap[StaffStatus.PROBATION] || 0;

        return {
            total: total as number,
            active,
            onLeave: onLeaveCount,
            onboarding,
            probation,
            byRegion: byRegion.map(r => ({
                regionName: r.regionName || 'Unassigned',
                count: parseInt(r.count),
            })),
        };
    }

    private async getLeaveStats(startDate: Date, endDate: Date): Promise<AnalyticsSummary['leaveStats']> {
        const baseQuery = this.leaveRepo
            .createQueryBuilder('leave')
            .where('leave.requested_at BETWEEN :startDate AND :endDate', { startDate, endDate });

        const total = await baseQuery.clone().getCount();
        const approved = await baseQuery.clone()
            .andWhere('leave.status = :status', { status: LeaveRequestStatus.APPROVED })
            .getCount();
        const pending = await baseQuery.clone()
            .andWhere('leave.status = :status', { status: LeaveRequestStatus.PENDING })
            .getCount();
        const rejected = await baseQuery.clone()
            .andWhere('leave.status = :status', { status: LeaveRequestStatus.REJECTED })
            .getCount();

        const totalDaysResult = await baseQuery.clone()
            .andWhere('leave.status = :status', { status: LeaveRequestStatus.APPROVED })
            .select('SUM(leave.total_days)', 'totalDays')
            .getRawOne();

        return {
            total,
            approved,
            pending,
            rejected,
            totalDays: Number(totalDaysResult?.totalDays || 0),
        };
    }

    private async getClaimsStats(startDate: Date, endDate: Date): Promise<AnalyticsSummary['claimsStats']> {
        const baseQuery = this.claimRepo
            .createQueryBuilder('claim')
            .where('claim.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });

        const total = await baseQuery.clone().getCount();
        const submitted = await baseQuery.clone()
            .andWhere('claim.status = :status', { status: ClaimStatus.SUBMITTED })
            .getCount();
        const approved = await baseQuery.clone()
            .andWhere('claim.status = :status', { status: ClaimStatus.APPROVED })
            .getCount();
        const rejected = await baseQuery.clone()
            .andWhere('claim.status = :status', { status: ClaimStatus.REJECTED })
            .getCount();
        const pendingCount = await baseQuery.clone()
            .andWhere('claim.status IN (:...statuses)', { statuses: [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW] })
            .getCount();

        const amountsResult = await baseQuery.clone()
            .select('SUM(claim.total_amount)', 'totalAmount')
            .addSelect('SUM(claim.approved_amount)', 'approvedAmount')
            .getRawOne();

        return {
            total,
            submitted,
            approved,
            rejected,
            totalAmount: Number(amountsResult?.totalAmount || 0),
            approvedAmount: Number(amountsResult?.approvedAmount || 0),
            pendingCount,
        };
    }

    private async getLoanStats(startDate: Date, endDate: Date): Promise<AnalyticsSummary['loanStats']> {
        const baseQuery = this.loanRepo
            .createQueryBuilder('loan')
            .where('loan.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });

        const total = await baseQuery.clone().getCount();
        const pending = await baseQuery.clone()
            .andWhere('loan.status = :status', { status: LoanStatus.PENDING })
            .getCount();
        const active = await baseQuery.clone()
            .andWhere('loan.status IN (:...statuses)', { statuses: [LoanStatus.ACTIVE, LoanStatus.DISBURSED] })
            .getCount();
        const completed = await baseQuery.clone()
            .andWhere('loan.status = :status', { status: LoanStatus.COMPLETED })
            .getCount();

        const amountsResult = await this.loanRepo
            .createQueryBuilder('loan')
            .where('loan.status IN (:...statuses)', {
                statuses: [LoanStatus.ACTIVE, LoanStatus.DISBURSED, LoanStatus.COMPLETED],
            })
            .select('SUM(loan.principal)', 'totalDisbursed')
            .addSelect('SUM(loan.outstanding_balance)', 'totalOutstanding')
            .getRawOne();

        return {
            total,
            pending,
            active,
            completed,
            totalDisbursed: Number(amountsResult?.totalDisbursed || 0),
            totalOutstanding: Number(amountsResult?.totalOutstanding || 0),
        };
    }

    private async generateComprehensiveRiskAlerts(
        regions: RegionPerformance[],
        avgPAR: number,
        staffStats: AnalyticsSummary['staffStats'],
        leaveStats: AnalyticsSummary['leaveStats'],
        claimsStats: AnalyticsSummary['claimsStats'],
        loanStats: AnalyticsSummary['loanStats'],
    ): Promise<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }[]> {
        const alerts: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];

        // Portfolio risk alerts
        if (avgPAR > 5) {
            alerts.push({
                type: 'Portfolio Risk',
                message: `Portfolio at Risk is ${avgPAR.toFixed(2)}%, above the 5% threshold`,
                severity: 'high',
            });
        } else if (avgPAR > 3) {
            alerts.push({
                type: 'Portfolio Risk',
                message: `Portfolio at Risk is ${avgPAR.toFixed(2)}%, approaching threshold`,
                severity: 'medium',
            });
        }

        // Region-specific alerts
        for (const region of regions) {
            if (region.par > 5) {
                alerts.push({
                    type: 'Region Risk',
                    message: `${region.name} region PAR is ${region.par.toFixed(2)}%`,
                    severity: 'high',
                });
            }
            const collectionRate = region.disbursed > 0 ? (region.collections / region.disbursed) * 100 : 0;
            if (collectionRate < 80 && region.disbursed > 0) {
                alerts.push({
                    type: 'Collection Rate',
                    message: `${region.name} collection rate is ${collectionRate.toFixed(1)}%`,
                    severity: collectionRate < 70 ? 'high' : 'medium',
                });
            }
        }

        // Staff-related alerts
        const leavePercentage = staffStats.total > 0 ? (staffStats.onLeave / staffStats.total) * 100 : 0;
        if (leavePercentage > 15) {
            alerts.push({
                type: 'Staff Coverage',
                message: `${leavePercentage.toFixed(0)}% of staff currently on leave`,
                severity: leavePercentage > 25 ? 'high' : 'medium',
            });
        }

        // Pending approvals alert
        if (leaveStats.pending > 10) {
            alerts.push({
                type: 'Pending Leave',
                message: `${leaveStats.pending} leave requests awaiting approval`,
                severity: leaveStats.pending > 20 ? 'high' : 'medium',
            });
        }

        // Claims backlog alert
        if (claimsStats.pendingCount > 15) {
            alerts.push({
                type: 'Claims Backlog',
                message: `${claimsStats.pendingCount} expense claims pending review`,
                severity: claimsStats.pendingCount > 30 ? 'high' : 'medium',
            });
        }

        // Loan approval backlog
        if (loanStats.pending > 5) {
            alerts.push({
                type: 'Loan Approvals',
                message: `${loanStats.pending} staff loan applications pending`,
                severity: loanStats.pending > 10 ? 'high' : 'medium',
            });
        }

        return alerts.slice(0, 8); // Limit to 8 alerts
    }

    private async getMonthlyTrends(months: number): Promise<MonthlyTrend[]> {
        const trends: MonthlyTrend[] = [];
        const today = new Date();

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            const reports = await this.reportRepo.find({
                where: { report_date: Between(monthStart, monthEnd) },
            });

            const monthData = reports.reduce(
                (acc, r) => ({
                    disbursed: acc.disbursed + Number(r.loans_disbursed_amount || 0),
                    collections: acc.collections + Number(r.recoveries_amount || 0),
                    newLoans: acc.newLoans + (r.loans_new_count || 0),
                    par: acc.par + Number(r.par_ratio || 0),
                    count: acc.count + 1,
                }),
                { disbursed: 0, collections: 0, newLoans: 0, par: 0, count: 0 },
            );

            trends.push({
                month: monthName,
                disbursed: monthData.disbursed,
                collections: monthData.collections,
                newLoans: monthData.newLoans,
                par: monthData.count > 0 ? monthData.par / monthData.count : 0,
            });
        }

        return trends;
    }

    private async getTopPerformingBranches(limit: number) {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const reports = await this.reportRepo.find({
            where: { report_date: Between(monthStart, today) },
            relations: ['branch'],
        });

        const branchMap = new Map<string, { name: string; collections: number; par: number; count: number }>();
        for (const report of reports) {
            const branchName = report.branch?.name || 'Unknown';
            const existing = branchMap.get(branchName) || { name: branchName, collections: 0, par: 0, count: 0 };
            existing.collections += Number(report.recoveries_amount || 0);
            existing.par += Number(report.par_ratio || 0);
            existing.count++;
            branchMap.set(branchName, existing);
        }

        return Array.from(branchMap.values())
            .map(b => ({ name: b.name, collections: b.collections, par: b.count > 0 ? b.par / b.count : 0 }))
            .sort((a, b) => b.collections - a.collections)
            .slice(0, limit);
    }

    private generateRiskAlerts(
        regions: RegionPerformance[],
        avgPAR: number,
    ): { type: string; message: string; severity: 'low' | 'medium' | 'high' }[] {
        const alerts: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];

        // High PAR alert
        if (avgPAR > 5) {
            alerts.push({
                type: 'portfolio_risk',
                message: `Portfolio at Risk is ${avgPAR.toFixed(2)}%, above the 5% threshold`,
                severity: 'high',
            });
        } else if (avgPAR > 3) {
            alerts.push({
                type: 'portfolio_risk',
                message: `Portfolio at Risk is ${avgPAR.toFixed(2)}%, approaching threshold`,
                severity: 'medium',
            });
        }

        // Region-specific alerts
        for (const region of regions) {
            if (region.par > 5) {
                alerts.push({
                    type: 'region_risk',
                    message: `${region.name} region PAR is ${region.par.toFixed(2)}%`,
                    severity: 'high',
                });
            }
            const collectionRate = region.disbursed > 0 ? (region.collections / region.disbursed) * 100 : 0;
            if (collectionRate < 80) {
                alerts.push({
                    type: 'collection_rate',
                    message: `${region.name} collection rate is ${collectionRate.toFixed(1)}%`,
                    severity: collectionRate < 70 ? 'high' : 'medium',
                });
            }
        }

        return alerts.slice(0, 5); // Limit to 5 alerts
    }

    // ==================== EXPORT METHODS ====================

    async exportToExcel(
        reportType: 'summary' | 'regional' | 'branches',
        period: { start?: Date; end?: Date } = {},
    ): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Kechita Staff Portal';
        workbook.created = new Date();

        const dashboard = await this.getCEODashboard();

        if (reportType === 'summary' || reportType === 'regional') {
            // Summary Sheet
            const summarySheet = workbook.addWorksheet('Executive Summary');
            this.addSummarySheet(summarySheet, dashboard);

            // Regional Performance Sheet
            const regionalSheet = workbook.addWorksheet('Regional Performance');
            this.addRegionalSheet(regionalSheet, dashboard.regionPerformance);
        }

        if (reportType === 'summary' || reportType === 'branches') {
            // Top Branches Sheet
            const branchesSheet = workbook.addWorksheet('Top Branches');
            this.addBranchesSheet(branchesSheet, dashboard.topPerformingBranches);
        }

        // Monthly Trends Sheet
        const trendsSheet = workbook.addWorksheet('Monthly Trends');
        this.addTrendsSheet(trendsSheet, dashboard.monthlyTrends);

        return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    }

    private addSummarySheet(sheet: ExcelJS.Worksheet, dashboard: AnalyticsSummary) {
        // Title
        sheet.mergeCells('A1:D1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'KECHITA MICROFINANCE - EXECUTIVE SUMMARY';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A1D96' } };
        titleCell.alignment = { horizontal: 'center' };

        // Period
        sheet.mergeCells('A2:D2');
        sheet.getCell('A2').value = `Report Period: ${dashboard.period.start.toLocaleDateString()} - ${dashboard.period.end.toLocaleDateString()}`;
        sheet.getCell('A2').font = { italic: true };

        // Add empty row
        sheet.addRow([]);

        // KPIs
        const kpiData = [
            ['Total Disbursed (MTD)', `KES ${dashboard.totalDisbursed.toLocaleString()}`],
            ['Total Recoveries (MTD)', `KES ${dashboard.totalRecoveries.toLocaleString()}`],
            ['New Loans (MTD)', dashboard.totalNewLoans.toString()],
            ['Portfolio at Risk', `${dashboard.avgPAR.toFixed(2)}%`],
            ['Report Count', dashboard.reportCount.toString()],
        ];

        sheet.addRow(['KEY PERFORMANCE INDICATORS', '', '', '']);
        sheet.getRow(sheet.rowCount).font = { bold: true };

        for (const [label, value] of kpiData) {
            const row = sheet.addRow([label, value]);
            row.getCell(1).font = { bold: true };
        }

        // Staff Overview
        sheet.addRow([]);
        sheet.addRow(['STAFF OVERVIEW', '', '', '']);
        sheet.getRow(sheet.rowCount).font = { bold: true };
        sheet.addRow(['Total Staff', dashboard.staffStats.total.toString()]);
        sheet.addRow(['Active', dashboard.staffStats.active.toString()]);
        sheet.addRow(['On Leave', dashboard.staffStats.onLeave.toString()]);
        sheet.addRow(['Onboarding', dashboard.staffStats.onboarding.toString()]);

        // Style columns
        sheet.getColumn(1).width = 25;
        sheet.getColumn(2).width = 20;
    }

    private addRegionalSheet(sheet: ExcelJS.Worksheet, regions: RegionPerformance[]) {
        // Headers
        sheet.addRow(['Region', 'Disbursed (KES)', 'Collections (KES)', 'Collection Rate', 'PAR %', 'Loans Count']);
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A1D96' } };

        // Data
        for (const region of regions) {
            const collectionRate = region.disbursed > 0 ? ((region.collections / region.disbursed) * 100).toFixed(1) : '0';
            sheet.addRow([
                region.name,
                region.disbursed,
                region.collections,
                `${collectionRate}%`,
                `${region.par.toFixed(2)}%`,
                region.loansCount,
            ]);
        }

        // Format
        sheet.getColumn(1).width = 15;
        sheet.getColumn(2).width = 18;
        sheet.getColumn(3).width = 18;
        sheet.getColumn(4).width = 15;
        sheet.getColumn(5).width = 10;
        sheet.getColumn(6).width = 12;

        // Number formatting
        sheet.getColumn(2).numFmt = '#,##0';
        sheet.getColumn(3).numFmt = '#,##0';
    }

    private addBranchesSheet(sheet: ExcelJS.Worksheet, branches: { name: string; collections: number; par: number }[]) {
        sheet.addRow(['Rank', 'Branch', 'Collections (KES)', 'PAR %']);
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A1D96' } };

        branches.forEach((branch, index) => {
            sheet.addRow([index + 1, branch.name, branch.collections, `${branch.par.toFixed(2)}%`]);
        });

        sheet.getColumn(1).width = 8;
        sheet.getColumn(2).width = 20;
        sheet.getColumn(3).width = 18;
        sheet.getColumn(4).width = 10;
        sheet.getColumn(3).numFmt = '#,##0';
    }

    private addTrendsSheet(sheet: ExcelJS.Worksheet, trends: MonthlyTrend[]) {
        sheet.addRow(['Month', 'Disbursed (KES)', 'Collections (KES)', 'New Loans', 'PAR %']);
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A1D96' } };

        for (const trend of trends) {
            sheet.addRow([trend.month, trend.disbursed, trend.collections, trend.newLoans, `${trend.par.toFixed(2)}%`]);
        }

        sheet.getColumn(1).width = 12;
        sheet.getColumn(2).width = 18;
        sheet.getColumn(3).width = 18;
        sheet.getColumn(4).width = 12;
        sheet.getColumn(5).width = 10;
        sheet.getColumn(2).numFmt = '#,##0';
        sheet.getColumn(3).numFmt = '#,##0';
    }

    async exportToPdf(reportType: string = 'summary'): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const dashboard = await this.getCEODashboard();
                const doc = new PDFDocument({ margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                doc.fontSize(20).fillColor('#4A1D96').text('KECHITA MICROFINANCE', { align: 'center' });
                doc.fontSize(14).fillColor('#666666').text('Executive Summary Report', { align: 'center' });
                doc.moveDown();
                doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
                doc.moveDown(2);

                // Divider
                doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E2E8F0');
                doc.moveDown();

                // KPIs Section
                doc.fontSize(14).fillColor('#1E293B').text('Key Performance Indicators (MTD)', { underline: true });
                doc.moveDown(0.5);

                const kpis = [
                    { label: 'Total Disbursed', value: `KES ${dashboard.totalDisbursed.toLocaleString()}` },
                    { label: 'Total Recoveries', value: `KES ${dashboard.totalRecoveries.toLocaleString()}` },
                    { label: 'New Loans', value: dashboard.totalNewLoans.toString() },
                    { label: 'Portfolio at Risk', value: `${dashboard.avgPAR.toFixed(2)}%` },
                ];

                doc.fontSize(11).fillColor('#475569');
                for (const kpi of kpis) {
                    doc.text(`• ${kpi.label}: `, { continued: true }).fillColor('#1E293B').text(kpi.value);
                    doc.fillColor('#475569');
                }
                doc.moveDown(1.5);

                // Regional Performance
                doc.fontSize(14).fillColor('#1E293B').text('Regional Performance', { underline: true });
                doc.moveDown(0.5);

                // Table header
                const tableTop = doc.y;
                const colWidths = [100, 120, 120, 80, 80];
                let xPos = 50;

                doc.fontSize(10).fillColor('#FFFFFF');
                doc.rect(50, tableTop, 500, 20).fill('#4A1D96');
                doc.text('Region', xPos + 5, tableTop + 5);
                xPos += colWidths[0];
                doc.text('Disbursed', xPos + 5, tableTop + 5);
                xPos += colWidths[1];
                doc.text('Collections', xPos + 5, tableTop + 5);
                xPos += colWidths[2];
                doc.text('Rate', xPos + 5, tableTop + 5);
                xPos += colWidths[3];
                doc.text('PAR', xPos + 5, tableTop + 5);

                // Table rows
                let rowY = tableTop + 20;
                doc.fillColor('#1E293B');
                for (const region of dashboard.regionPerformance) {
                    const collectionRate = region.disbursed > 0 ? ((region.collections / region.disbursed) * 100).toFixed(1) : '0';
                    xPos = 50;

                    // Alternate row colors
                    const rowIndex = dashboard.regionPerformance.indexOf(region);
                    if (rowIndex % 2 === 1) {
                        doc.rect(50, rowY, 500, 18).fill('#F8FAFC');
                        doc.fillColor('#1E293B');
                    }

                    doc.text(region.name, xPos + 5, rowY + 4);
                    xPos += colWidths[0];
                    doc.text(`KES ${region.disbursed.toLocaleString()}`, xPos + 5, rowY + 4);
                    xPos += colWidths[1];
                    doc.text(`KES ${region.collections.toLocaleString()}`, xPos + 5, rowY + 4);
                    xPos += colWidths[2];
                    doc.text(`${collectionRate}%`, xPos + 5, rowY + 4);
                    xPos += colWidths[3];
                    doc.text(`${region.par.toFixed(2)}%`, xPos + 5, rowY + 4);

                    rowY += 18;
                }
                doc.moveDown(3);

                // Risk Alerts
                if (dashboard.riskAlerts.length > 0) {
                    doc.y = rowY + 20;
                    doc.fontSize(14).fillColor('#1E293B').text('Risk Alerts', { underline: true });
                    doc.moveDown(0.5);

                    for (const alert of dashboard.riskAlerts) {
                        const color = alert.severity === 'high' ? '#DC2626' : alert.severity === 'medium' ? '#F59E0B' : '#22C55E';
                        doc.fontSize(10).fillColor(color).text(`⚠ ${alert.message}`);
                    }
                }

                // Footer
                doc.moveDown(2);
                doc.fontSize(8).fillColor('#94A3B8').text('This report is confidential and intended for internal use only.', { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    // ==================== GET SINGLE REPORT ====================

    async getReportById(reportId: string): Promise<BranchDailyReport> {
        const report = await this.reportRepo.findOne({
            where: { id: reportId },
            relations: ['branch', 'submittedBy'],
        });

        if (!report) throw new NotFoundException('Report not found');
        return report;
    }

    // ==================== MY REPORTS ====================

    async getMyReports(staffId: string, status?: string): Promise<BranchDailyReport[]> {
        const where: any = { submittedBy: { id: staffId } };
        if (status) where.status = status;

        return this.reportRepo.find({
            where,
            relations: ['branch'],
            order: { report_date: 'DESC' },
        });
    }

    // ==================== REJECT REPORT ====================

    async rejectReport(reportId: string, reason: string): Promise<BranchDailyReport> {
        const report = await this.reportRepo.findOne({
            where: { id: reportId },
            relations: ['branch', 'submittedBy'],
        });

        if (!report) throw new NotFoundException('Report not found');
        if (report.status !== 'submitted') {
            throw new BadRequestException('Only submitted reports can be rejected');
        }

        report.status = 'rejected';
        report.rm_comment = reason;

        return this.reportRepo.save(report);
    }

    // ==================== DELETE DRAFT REPORT ====================

    async deleteDraftReport(reportId: string, staffId: string): Promise<{ message: string }> {
        const report = await this.reportRepo.findOne({
            where: { id: reportId },
            relations: ['submittedBy'],
        });

        if (!report) throw new NotFoundException('Report not found');
        if (report.submittedBy?.id !== staffId) {
            throw new ForbiddenException('You can only delete your own reports');
        }
        if (report.status !== 'draft') {
            throw new BadRequestException('Only draft reports can be deleted');
        }

        await this.reportRepo.remove(report);
        return { message: 'Draft report deleted successfully' };
    }

    // ==================== UPDATE DRAFT REPORT ====================

    async updateDraftReport(reportId: string, staffId: string, dto: SubmitReportDto): Promise<BranchDailyReport> {
        const report = await this.reportRepo.findOne({
            where: { id: reportId },
            relations: ['submittedBy'],
        });

        if (!report) throw new NotFoundException('Report not found');
        if (report.submittedBy?.id !== staffId) {
            throw new ForbiddenException('You can only update your own reports');
        }
        if (report.status !== 'draft') {
            throw new BadRequestException('Only draft reports can be updated');
        }

        // Update fields
        if (dto.loans_new_count !== undefined) report.loans_new_count = dto.loans_new_count;
        if (dto.loans_disbursed_amount !== undefined) report.loans_disbursed_amount = dto.loans_disbursed_amount;
        if (dto.recoveries_amount !== undefined) report.recoveries_amount = dto.recoveries_amount;
        if (dto.arrears_collected !== undefined) report.arrears_collected = dto.arrears_collected;
        if (dto.prepayments_due !== undefined) report.prepayments_due = dto.prepayments_due;
        if (dto.par_amount !== undefined) report.par_amount = dto.par_amount;
        if (dto.par_ratio !== undefined) report.par_ratio = dto.par_ratio;
        if (dto.par_1_30 !== undefined) report.par_1_30 = dto.par_1_30;
        if (dto.par_31_60 !== undefined) report.par_31_60 = dto.par_31_60;
        if (dto.par_61_90 !== undefined) report.par_61_90 = dto.par_61_90;
        if (dto.par_90_plus !== undefined) report.par_90_plus = dto.par_90_plus;
        if (dto.manager_comment !== undefined) report.manager_comment = dto.manager_comment;

        return this.reportRepo.save(report);
    }
}
