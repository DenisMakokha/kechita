import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollRun } from '../entities/payroll-run.entity';
import { Payslip } from '../entities/payslip.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { StaffBankAccount } from '../../staff/entities/staff-bank-account.entity';

/**
 * Generates Kenya statutory return exports in the formats accepted by:
 *  - KRA iTax (PAYE P10 monthly return) — CSV
 *  - NSSF byProduct CSV
 *  - SHIF (eCitizen Hapa Care) — CSV
 *  - Affordable Housing Levy — CSV (KRA)
 *  - NITA — CSV
 *
 * NOTE: The exact column layouts here follow the published templates as of 2026.
 * If the templates change, update the headers + row builders below.
 */

@Injectable()
export class StatutoryExportService {
    constructor(
        @InjectRepository(PayrollRun) private runRepo: Repository<PayrollRun>,
        @InjectRepository(Payslip) private payslipRepo: Repository<Payslip>,
    ) {}

    private async loadRunPayslips(runId: string): Promise<{ run: PayrollRun; payslips: Payslip[] }> {
        const run = await this.runRepo.findOne({ where: { id: runId }, relations: ['period'] });
        if (!run) throw new NotFoundException('Run not found');
        const payslips = await this.payslipRepo.find({ where: { run_id: runId }, order: { full_name_snapshot: 'ASC' } });
        return { run, payslips };
    }

    /** KRA iTax PAYE P10 monthly return — CSV */
    async exportPAYE(runId: string): Promise<string> {
        const { payslips } = await this.loadRunPayslips(runId);
        const headers = [
            'PIN of Employee',
            'Name of Employee',
            'Residential Status',
            'Type of Employee',
            'Employee Director PIN',
            'Basic Salary',
            'House Allowance',
            'Transport Allowance',
            'Leave Pay',
            'Overtime',
            'Directors Fee',
            'Lump Sum (if any)',
            'Other Allowances',
            'Total Cash Pay',
            'Value of Quarters',
            'Non-Cash Benefit (above Ksh 3,000)',
            'Total Gross Pay',
            'Defined Contribution Pension',
            'Owner Occupied Interest',
            'Tax Relief',
            'Personal Relief (Ksh 2,400)',
            'Insurance Relief',
            'Allowable Pension Fund Contribution',
            'PAYE Tax',
            'SHIF',
            'NSSF',
            'Affordable Housing Levy',
            'Self Assessed PAYE',
        ];
        const rows = payslips.map(p => [
            p.tax_pin_snapshot || '',
            p.full_name_snapshot,
            'Resident',
            'Primary Employee',
            '',
            p.basic_salary,
            '', '', '', '', '', '',
            p.total_allowances,
            Number(p.basic_salary) + Number(p.total_allowances),
            0,
            0,
            p.gross_pay,
            p.pension_relief,
            0,
            0,
            p.personal_relief,
            p.insurance_relief,
            p.pension_relief,
            p.paye,
            p.shif,
            p.nssf_employee,
            p.housing_levy_employee,
            p.paye,
        ]);
        return toCSV(headers, rows);
    }

    /** NSSF byProduct CSV */
    async exportNSSF(runId: string): Promise<string> {
        const { payslips } = await this.loadRunPayslips(runId);
        const headers = [
            'NSSF Number',
            'KRA PIN',
            'Surname',
            'Other Names',
            'Gross Pay',
            'Voluntary Contribution',
            'Employee Contribution',
            'Employer Contribution',
            'Total Contribution',
        ];
        const rows = payslips.map(p => {
            const [surname, ...others] = p.full_name_snapshot.split(' ').reverse();
            const otherNames = others.reverse().join(' ');
            return [
                p.nssf_number_snapshot || '',
                p.tax_pin_snapshot || '',
                surname,
                otherNames,
                p.gross_pay,
                0,
                p.nssf_employee,
                p.nssf_employer,
                Number(p.nssf_employee) + Number(p.nssf_employer),
            ];
        });
        return toCSV(headers, rows);
    }

    /** SHIF (Social Health Insurance Fund) — CSV */
    async exportSHIF(runId: string): Promise<string> {
        const { payslips } = await this.loadRunPayslips(runId);
        const headers = [
            'SHIF Number',
            'KRA PIN',
            'Member Name',
            'ID/Passport No',
            'Gross Salary',
            'Contribution Amount',
        ];
        const rows = payslips.map(p => [
            p.shif_number_snapshot || '',
            p.tax_pin_snapshot || '',
            p.full_name_snapshot,
            '',
            p.gross_pay,
            p.shif,
        ]);
        return toCSV(headers, rows);
    }

    /** Affordable Housing Levy — KRA CSV */
    async exportHousingLevy(runId: string): Promise<string> {
        const { payslips } = await this.loadRunPayslips(runId);
        const headers = [
            'KRA PIN',
            'Employee Name',
            'Gross Pay',
            'Employee Contribution (1.5%)',
            'Employer Contribution (1.5%)',
            'Total Levy',
        ];
        const rows = payslips.map(p => [
            p.tax_pin_snapshot || '',
            p.full_name_snapshot,
            p.gross_pay,
            p.housing_levy_employee,
            p.housing_levy_employer,
            Number(p.housing_levy_employee) + Number(p.housing_levy_employer),
        ]);
        return toCSV(headers, rows);
    }

    /** NITA monthly levy — CSV */
    async exportNITA(runId: string): Promise<string> {
        const { payslips } = await this.loadRunPayslips(runId);
        const headers = ['KRA PIN', 'Employee Name', 'Levy (KES)'];
        const rows = payslips.map(p => [
            p.tax_pin_snapshot || '',
            p.full_name_snapshot,
            p.nita_employer,
        ]);
        return toCSV(headers, rows);
    }

    /** Bank net-pay file — generic CSV */
    async exportBankNetPay(runId: string): Promise<string> {
        const { payslips } = await this.loadRunPayslips(runId);
        const headers = ['Employee Number', 'Full Name', 'KRA PIN', 'Bank Account', 'Bank Name', 'Net Pay'];

        const bankAccountRepo = this.runRepo.manager.getRepository(StaffBankAccount);
        const staffRepo = this.runRepo.manager.getRepository(Staff);
        const rows: any[][] = [];

        for (const p of payslips) {
            let bankName = '';
            let bankAccountNum = '';

            const activePrimary = await bankAccountRepo.findOne({
                where: { staff_id: p.staff_id, is_primary: true, is_active: true }
            });

            if (activePrimary) {
                bankName = activePrimary.bank_name;
                bankAccountNum = activePrimary.account_number;
            } else {
                const staff = await staffRepo.findOne({ where: { id: p.staff_id } });
                if (staff) {
                    bankName = staff.bank_name || '';
                    bankAccountNum = staff.bank_account_number || '';
                }
            }

            rows.push([
                p.employee_number_snapshot,
                p.full_name_snapshot,
                p.tax_pin_snapshot || '',
                bankAccountNum,
                bankName,
                p.net_pay,
            ]);
        }
        return toCSV(headers, rows);
    }
}

function toCSV(headers: string[], rows: any[][]): string {
    const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const out: string[] = [];
    out.push(headers.map(escape).join(','));
    for (const r of rows) out.push(r.map(escape).join(','));
    return out.join('\n');
}
