import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BranchDailyReport } from './entities/branch-daily-report.entity';
import { Branch } from '../org/entities/branch.entity';
import * as ExcelJS from 'exceljs';

export interface DailyReportDto {
    branch_id: string;
    report_date: string;
    loans_new_count?: number;
    loans_disbursed_amount?: number;
    recoveries_amount?: number;
    arrears_collected?: number;
    prepayments_due?: number;
    par_amount?: number;
    par_1_30?: number;
    par_31_60?: number;
    par_61_90?: number;
    par_90_plus?: number;
    par_ratio?: number;
    manager_comment?: string;
}

export interface ImportResult {
    total_rows: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
}

export interface PARBreakdown {
    par_1_30: number;
    par_31_60: number;
    par_61_90: number;
    par_90_plus: number;
    total_par: number;
}

@Injectable()
export class KpiService {
    constructor(
        @InjectRepository(BranchDailyReport)
        private reportRepo: Repository<BranchDailyReport>,
        @InjectRepository(Branch)
        private branchRepo: Repository<Branch>,
    ) { }

    // ==================== DAILY REPORT SUBMISSION ====================

    async submitDailyReport(data: DailyReportDto, staffId: string): Promise<BranchDailyReport> {
        const branch = await this.branchRepo.findOneBy({ id: data.branch_id });
        if (!branch) throw new BadRequestException('Branch not found');

        // Check for existing report for same date
        const existing = await this.reportRepo.findOne({
            where: {
                branch: { id: data.branch_id },
                report_date: new Date(data.report_date),
            },
        });

        if (existing) {
            // Update existing
            Object.assign(existing, {
                loans_new_count: data.loans_new_count ?? existing.loans_new_count,
                loans_disbursed_amount: data.loans_disbursed_amount ?? existing.loans_disbursed_amount,
                recoveries_amount: data.recoveries_amount ?? existing.recoveries_amount,
                arrears_collected: data.arrears_collected ?? existing.arrears_collected,
                prepayments_due: data.prepayments_due ?? existing.prepayments_due,
                par_amount: data.par_amount ?? existing.par_amount,
                par_1_30: data.par_1_30 ?? existing.par_1_30,
                par_31_60: data.par_31_60 ?? existing.par_31_60,
                par_61_90: data.par_61_90 ?? existing.par_61_90,
                par_90_plus: data.par_90_plus ?? existing.par_90_plus,
                par_ratio: data.par_ratio ?? existing.par_ratio,
                manager_comment: data.manager_comment ?? existing.manager_comment,
                status: 'submitted',
            });
            return this.reportRepo.save(existing);
        }

        const report = this.reportRepo.create({
            branch,
            report_date: new Date(data.report_date),
            submittedBy: { id: staffId } as any,
            status: 'submitted',
            loans_new_count: data.loans_new_count || 0,
            loans_disbursed_amount: data.loans_disbursed_amount || 0,
            recoveries_amount: data.recoveries_amount || 0,
            arrears_collected: data.arrears_collected || 0,
            prepayments_due: data.prepayments_due || 0,
            par_amount: data.par_amount || 0,
            par_1_30: data.par_1_30 || 0,
            par_31_60: data.par_31_60 || 0,
            par_61_90: data.par_61_90 || 0,
            par_90_plus: data.par_90_plus || 0,
            par_ratio: data.par_ratio || 0,
            manager_comment: data.manager_comment,
        });

        return this.reportRepo.save(report);
    }

    // ==================== CSV/EXCEL BULK IMPORT ====================

    async importFromCsv(csvContent: string, staffId: string): Promise<ImportResult> {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) {
            throw new BadRequestException('CSV must have a header row and at least one data row');
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const requiredHeaders = ['branch_code', 'report_date'];
        for (const req of requiredHeaders) {
            if (!headers.includes(req)) {
                throw new BadRequestException(`Missing required column: ${req}`);
            }
        }

        const result: ImportResult = {
            total_rows: lines.length - 1,
            imported: 0,
            failed: 0,
            errors: [],
        };

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });

            try {
                await this.processImportRow(row, staffId, i + 1);
                result.imported++;
            } catch (error: any) {
                result.failed++;
                result.errors.push({ row: i + 1, error: error.message });
            }
        }

        return result;
    }

    async importFromExcel(buffer: Buffer, staffId: string): Promise<ImportResult> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new BadRequestException('Excel file has no worksheets');
        }

        const result: ImportResult = {
            total_rows: 0,
            imported: 0,
            failed: 0,
            errors: [],
        };

        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = String(cell.value || '').toLowerCase().trim();
        });

        const requiredHeaders = ['branch_code', 'report_date'];
        for (const req of requiredHeaders) {
            if (!headers.includes(req)) {
                throw new BadRequestException(`Missing required column: ${req}`);
            }
        }

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header
            result.total_rows++;
        });

        for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            const rowData: Record<string, string> = {};

            headers.forEach((header, colIdx) => {
                if (header) {
                    const cell = row.getCell(colIdx);
                    rowData[header] = cell.value ? String(cell.value) : '';
                }
            });

            if (!rowData.branch_code && !rowData.report_date) continue; // Skip empty rows

            try {
                await this.processImportRow(rowData, staffId, rowNum);
                result.imported++;
            } catch (error: any) {
                result.failed++;
                result.errors.push({ row: rowNum, error: error.message });
            }
        }

        return result;
    }

    private async processImportRow(row: Record<string, string>, staffId: string, rowNum: number): Promise<void> {
        const branchCode = row.branch_code;
        const reportDateStr = row.report_date;

        if (!branchCode) {
            throw new Error('branch_code is required');
        }
        if (!reportDateStr) {
            throw new Error('report_date is required');
        }

        const branch = await this.branchRepo.findOne({
            where: { code: branchCode },
        });
        if (!branch) {
            throw new Error(`Branch not found: ${branchCode}`);
        }

        const reportDate = new Date(reportDateStr);
        if (isNaN(reportDate.getTime())) {
            throw new Error(`Invalid date format: ${reportDateStr}`);
        }

        await this.submitDailyReport({
            branch_id: branch.id,
            report_date: reportDate.toISOString().split('T')[0],
            loans_new_count: this.parseNumber(row.loans_new_count) || this.parseNumber(row.new_loans),
            loans_disbursed_amount: this.parseNumber(row.loans_disbursed_amount) || this.parseNumber(row.disbursed),
            recoveries_amount: this.parseNumber(row.recoveries_amount) || this.parseNumber(row.recoveries) || this.parseNumber(row.collections),
            arrears_collected: this.parseNumber(row.arrears_collected) || this.parseNumber(row.arrears),
            prepayments_due: this.parseNumber(row.prepayments_due) || this.parseNumber(row.prepayments),
            par_amount: this.parseNumber(row.par_amount),
            par_1_30: this.parseNumber(row.par_1_30) || this.parseNumber(row.par1_30),
            par_31_60: this.parseNumber(row.par_31_60) || this.parseNumber(row.par31_60),
            par_61_90: this.parseNumber(row.par_61_90) || this.parseNumber(row.par61_90),
            par_90_plus: this.parseNumber(row.par_90_plus) || this.parseNumber(row.par90_plus),
            par_ratio: this.parseNumber(row.par_ratio) || this.parseNumber(row.par),
            manager_comment: row.manager_comment || row.comment || row.notes,
        }, staffId);
    }

    private parseNumber(val?: string): number | undefined {
        if (!val) return undefined;
        const num = parseFloat(val.replace(/,/g, ''));
        return isNaN(num) ? undefined : num;
    }

    // ==================== PAR CALCULATIONS ====================

    async getBranchPAR(branchId: string, date: Date): Promise<PARBreakdown> {
        const report = await this.reportRepo.findOne({
            where: {
                branch: { id: branchId },
                report_date: date,
            },
        });

        if (!report) {
            return { par_1_30: 0, par_31_60: 0, par_61_90: 0, par_90_plus: 0, total_par: 0 };
        }

        const par_1_30 = Number(report.par_1_30 || 0);
        const par_31_60 = Number(report.par_31_60 || 0);
        const par_61_90 = Number(report.par_61_90 || 0);
        const par_90_plus = Number(report.par_90_plus || 0);
        const total_par = Number(report.par_amount || (par_1_30 + par_31_60 + par_61_90 + par_90_plus));

        return { par_1_30, par_31_60, par_61_90, par_90_plus, total_par };
    }

    async getRegionalPARSummary(regionId: string, startDate: Date, endDate: Date): Promise<{
        region_id: string;
        branches: Array<{ branch_id: string; branch_name: string; par_ratio: number }>;
        average_par: number;
        highest_par_branch: string;
        lowest_par_branch: string;
    }> {
        const branches = await this.branchRepo.find({
            where: { region: { id: regionId } },
        });

        const branchPARs: Array<{ branch_id: string; branch_name: string; par_ratio: number }> = [];

        for (const branch of branches) {
            const reports = await this.reportRepo.find({
                where: {
                    branch: { id: branch.id },
                    report_date: Between(startDate, endDate),
                },
            });

            const avgPAR = reports.length > 0
                ? reports.reduce((sum, r) => sum + Number(r.par_ratio || 0), 0) / reports.length
                : 0;

            branchPARs.push({
                branch_id: branch.id,
                branch_name: branch.name,
                par_ratio: Math.round(avgPAR * 100) / 100,
            });
        }

        const sortedByPAR = [...branchPARs].sort((a, b) => b.par_ratio - a.par_ratio);
        const avgPAR = branchPARs.length > 0
            ? branchPARs.reduce((sum, b) => sum + b.par_ratio, 0) / branchPARs.length
            : 0;

        return {
            region_id: regionId,
            branches: branchPARs,
            average_par: Math.round(avgPAR * 100) / 100,
            highest_par_branch: sortedByPAR[0]?.branch_name || '',
            lowest_par_branch: sortedByPAR[sortedByPAR.length - 1]?.branch_name || '',
        };
    }

    // ==================== REPORTS ====================

    async getMonthlyKPISummary(year: number, month: number): Promise<{
        period: string;
        total_disbursed: number;
        total_recoveries: number;
        total_new_loans: number;
        average_par: number;
        branch_count: number;
        report_count: number;
    }> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const reports = await this.reportRepo.find({
            where: { report_date: Between(startDate, endDate) },
            relations: ['branch'],
        });

        const uniqueBranches = new Set(reports.map(r => r.branch?.id));

        const totals = reports.reduce(
            (acc, r) => ({
                disbursed: acc.disbursed + Number(r.loans_disbursed_amount || 0),
                recoveries: acc.recoveries + Number(r.recoveries_amount || 0),
                newLoans: acc.newLoans + (r.loans_new_count || 0),
                par: acc.par + Number(r.par_ratio || 0),
            }),
            { disbursed: 0, recoveries: 0, newLoans: 0, par: 0 },
        );

        return {
            period: `${year}-${month.toString().padStart(2, '0')}`,
            total_disbursed: totals.disbursed,
            total_recoveries: totals.recoveries,
            total_new_loans: totals.newLoans,
            average_par: reports.length > 0 ? Math.round((totals.par / reports.length) * 100) / 100 : 0,
            branch_count: uniqueBranches.size,
            report_count: reports.length,
        };
    }

    async generateImportTemplate(): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('KPI Import Template');

        // Add headers
        sheet.columns = [
            { header: 'branch_code', key: 'branch_code', width: 15 },
            { header: 'report_date', key: 'report_date', width: 12 },
            { header: 'loans_new_count', key: 'loans_new_count', width: 15 },
            { header: 'loans_disbursed_amount', key: 'loans_disbursed_amount', width: 22 },
            { header: 'recoveries_amount', key: 'recoveries_amount', width: 18 },
            { header: 'arrears_collected', key: 'arrears_collected', width: 16 },
            { header: 'prepayments_due', key: 'prepayments_due', width: 15 },
            { header: 'par_amount', key: 'par_amount', width: 12 },
            { header: 'par_1_30', key: 'par_1_30', width: 12 },
            { header: 'par_31_60', key: 'par_31_60', width: 12 },
            { header: 'par_61_90', key: 'par_61_90', width: 12 },
            { header: 'par_90_plus', key: 'par_90_plus', width: 12 },
            { header: 'par_ratio', key: 'par_ratio', width: 10 },
            { header: 'manager_comment', key: 'manager_comment', width: 30 },
        ];

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4A1D96' },
        };
        headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Add example row
        sheet.addRow({
            branch_code: 'BR001',
            report_date: new Date().toISOString().split('T')[0],
            loans_new_count: 5,
            loans_disbursed_amount: 500000,
            recoveries_amount: 350000,
            arrears_collected: 25000,
            prepayments_due: 10000,
            par_amount: 75000,
            par_1_30: 30000,
            par_31_60: 20000,
            par_61_90: 15000,
            par_90_plus: 10000,
            par_ratio: 3.5,
            manager_comment: 'Good performance this period',
        });

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(arrayBuffer);
    }
}
