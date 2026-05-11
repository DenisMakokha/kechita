import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between, In } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { StaffAllowance } from '../entities/staff-allowance.entity';
import { StaffRecurringDeduction } from '../entities/staff-recurring-deduction.entity';
import { StaffLoanRepayment, RepaymentStatus } from '../../loans/entities/staff-loan-repayment.entity';
import { LeaveRequest } from '../../leave/entities/leave-request.entity';
import { Payslip, PayslipStatus } from '../entities/payslip.entity';
import { PayslipLine, PayslipLineKind, PayslipLineCategory } from '../entities/payslip-line.entity';
import { PayrollRun } from '../entities/payroll-run.entity';
import { PayrollPeriod } from '../entities/payroll-period.entity';
import { KenyaStatutoryService } from './kenya-statutory.service';

export interface CalculationContext {
    period: PayrollPeriod;
    run: PayrollRun;
}

export interface CalculatedPayslipDraft {
    staff_id: string;
    employee_number_snapshot: string;
    full_name_snapshot: string;
    position_snapshot?: string;
    branch_snapshot?: string;
    tax_pin_snapshot?: string;
    nssf_number_snapshot?: string;
    shif_number_snapshot?: string;
    basic_salary: number;
    total_allowances: number;
    gross_pay: number;
    taxable_pay: number;
    paye: number;
    nssf_employee: number;
    nssf_employer: number;
    shif: number;
    housing_levy_employee: number;
    housing_levy_employer: number;
    nita_employer: number;
    personal_relief: number;
    insurance_relief: number;
    pension_relief: number;
    loan_deductions: number;
    advance_deductions: number;
    other_deductions: number;
    total_deductions: number;
    net_pay: number;
    days_worked: number;
    lwop_days: number;
    lines: Array<Partial<PayslipLine>>;
}

@Injectable()
export class PayrollCalculationService {
    private readonly logger = new Logger(PayrollCalculationService.name);

    constructor(
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
        @InjectRepository(StaffAllowance) private allowanceRepo: Repository<StaffAllowance>,
        @InjectRepository(StaffRecurringDeduction) private deductionRepo: Repository<StaffRecurringDeduction>,
        @InjectRepository(StaffLoanRepayment) private repaymentRepo: Repository<StaffLoanRepayment>,
        @InjectRepository(LeaveRequest) private leaveRepo: Repository<LeaveRequest>,
        private statutory: KenyaStatutoryService,
    ) {}

    /**
     * Calculate a single staff member's payslip for a given run. Pure function over the inputs — does NOT save.
     */
    async calculateForStaff(staff: Staff, ctx: CalculationContext): Promise<CalculatedPayslipDraft> {
        if (!staff.basic_salary || Number(staff.basic_salary) <= 0) {
            throw new BadRequestException(`Staff ${staff.employee_number || staff.id} has no basic salary configured`);
        }

        const basicSalary = Number(staff.basic_salary);
        const periodStart = ctx.period.start_date;
        const periodEnd = ctx.period.end_date;
        const lines: Array<Partial<PayslipLine>> = [];
        let sortOrder = 0;

        // ── Basic salary line ──
        lines.push({
            kind: PayslipLineKind.EARNING,
            category: PayslipLineCategory.BASIC,
            label: 'Basic Salary',
            amount: basicSalary,
            taxable: true,
            sort_order: sortOrder++,
        });

        // ── Allowances ──
        const allAllowances = await this.allowanceRepo.find({
            where: { staff_id: staff.id, is_active: true, effective_from: LessThanOrEqual(periodEnd) },
        });
        const allowances = allAllowances.filter(a => !a.effective_to || a.effective_to >= periodStart);
        let totalAllowances = 0;
        let nonTaxableAllowances = 0;
        for (const a of allowances) {
            const amt = Number(a.amount);
            totalAllowances += amt;
            if (!a.taxable) nonTaxableAllowances += amt;
            lines.push({
                kind: PayslipLineKind.EARNING,
                category: PayslipLineCategory.ALLOWANCE,
                label: a.label,
                amount: amt,
                taxable: a.taxable,
                sort_order: sortOrder++,
            });
        }

        // ── LWOP days (Leave Without Pay during the period) ──
        const periodLeaves = await this.leaveRepo.find({
            where: { staff: { id: staff.id }, status: 'approved' as any, start_date: Between(periodStart as any, periodEnd as any) },
            relations: ['leaveType'],
        }).catch(() => [] as LeaveRequest[]);
        let lwopDays = 0;
        for (const l of periodLeaves) {
            const isLwop = (l as any).leaveType?.code === 'LWOP' || (l as any).leaveType?.is_paid === false;
            if (isLwop) lwopDays += Number((l as any).days || 0);
        }
        const standardDays = 30;
        const daysWorked = Math.max(0, standardDays - lwopDays);
        const lwopDeduction = lwopDays > 0 ? round2((basicSalary / standardDays) * lwopDays) : 0;
        if (lwopDeduction > 0) {
            lines.push({
                kind: PayslipLineKind.DEDUCTION,
                category: PayslipLineCategory.OTHER,
                label: `LWOP (${lwopDays} day${lwopDays === 1 ? '' : 's'})`,
                amount: lwopDeduction,
                taxable: false,
                sort_order: sortOrder++,
            });
        }

        // ── Gross & taxable ──
        const grossPay = round2(basicSalary + totalAllowances - lwopDeduction);
        const taxablePay = round2(grossPay - nonTaxableAllowances);

        // ── Recurring deductions (pension contributes to relief) ──
        const allRecurring = await this.deductionRepo.find({
            where: { staff_id: staff.id, is_active: true, effective_from: LessThanOrEqual(periodEnd) },
        });
        const recurring = allRecurring.filter(d => !d.effective_to || d.effective_to >= periodStart);
        let pensionContribution = 0;
        let insurancePremiums = 0;
        let saccoTotal = 0;
        let otherDeductions = 0;
        for (const d of recurring) {
            const amt = Number(d.amount);
            if (d.tax_relievable && d.type === 'pension' as any) pensionContribution += amt;
            if (d.type === 'insurance' as any) insurancePremiums += amt;
            if (d.type === 'sacco' as any) saccoTotal += amt;
            else if (d.type !== 'pension' as any && d.type !== 'insurance' as any) otherDeductions += amt;
        }

        // ── Statutory ──
        const stat = this.statutory.calcPAYE({
            grossPay,
            taxablePay,
            pensionContribution,
            insurancePremiums,
        });

        // ── Loan deductions (current period's scheduled, unpaid repayments) ──
        const repayments = await this.repaymentRepo.find({
            where: {
                status: In([RepaymentStatus.PENDING, RepaymentStatus.OVERDUE]),
                due_date: Between(periodStart as any, periodEnd as any),
                loan: { staff: { id: staff.id } } as any,
            },
            relations: ['loan'],
        }).catch(() => [] as StaffLoanRepayment[]);
        let loanDeductions = 0;
        for (const r of repayments) {
            const outstanding = Number(r.total_amount || 0) - Number(r.paid_amount || 0) - Number(r.waived_amount || 0);
            if (outstanding > 0) loanDeductions += outstanding;
        }

        // ── Build deduction lines ──
        if (stat.paye > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.PAYE, label: 'PAYE', amount: stat.paye, taxable: false, sort_order: sortOrder++ });
        if (stat.nssfEmployee > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.NSSF, label: 'NSSF', amount: stat.nssfEmployee, taxable: false, sort_order: sortOrder++ });
        if (stat.shif > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.SHIF, label: 'SHIF', amount: stat.shif, taxable: false, sort_order: sortOrder++ });
        if (stat.housingLevyEmployee > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.HOUSING_LEVY, label: 'Housing Levy', amount: stat.housingLevyEmployee, taxable: false, sort_order: sortOrder++ });
        if (loanDeductions > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.LOAN, label: 'Loan Repayments', amount: loanDeductions, taxable: false, sort_order: sortOrder++ });
        if (saccoTotal > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.SACCO, label: 'SACCO', amount: saccoTotal, taxable: false, sort_order: sortOrder++ });
        if (pensionContribution > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.PENSION, label: 'Pension Contribution', amount: pensionContribution, taxable: false, sort_order: sortOrder++ });
        if (insurancePremiums > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.INSURANCE, label: 'Insurance Premiums', amount: insurancePremiums, taxable: false, sort_order: sortOrder++ });
        if (otherDeductions > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.OTHER, label: 'Other Deductions', amount: otherDeductions, taxable: false, sort_order: sortOrder++ });

        // Employer contributions (informational only)
        if (stat.nssfEmployer > 0) lines.push({ kind: PayslipLineKind.EMPLOYER_CONTRIBUTION, category: PayslipLineCategory.NSSF, label: 'NSSF (Employer)', amount: stat.nssfEmployer, taxable: false, sort_order: sortOrder++ });
        if (stat.housingLevyEmployer > 0) lines.push({ kind: PayslipLineKind.EMPLOYER_CONTRIBUTION, category: PayslipLineCategory.HOUSING_LEVY, label: 'Housing Levy (Employer)', amount: stat.housingLevyEmployer, taxable: false, sort_order: sortOrder++ });
        if (stat.nitaEmployer > 0) lines.push({ kind: PayslipLineKind.EMPLOYER_CONTRIBUTION, category: PayslipLineCategory.NITA, label: 'NITA (Employer)', amount: stat.nitaEmployer, taxable: false, sort_order: sortOrder++ });

        // ── Totals ──
        const totalDeductions = round2(
            stat.paye + stat.nssfEmployee + stat.shif + stat.housingLevyEmployee +
            loanDeductions + saccoTotal + pensionContribution + insurancePremiums + otherDeductions,
        );
        const netPay = round2(grossPay - totalDeductions);

        return {
            staff_id: staff.id,
            employee_number_snapshot: staff.employee_number || '',
            full_name_snapshot: `${staff.first_name} ${staff.last_name}`.trim(),
            position_snapshot: (staff as any).position?.name,
            branch_snapshot: (staff as any).branch?.name,
            tax_pin_snapshot: (staff as any).tax_pin,
            nssf_number_snapshot: (staff as any).nssf_number,
            shif_number_snapshot: (staff as any).nhif_number, // SHIF replaces NHIF — same identifier in transition
            basic_salary: basicSalary,
            total_allowances: round2(totalAllowances),
            gross_pay: grossPay,
            taxable_pay: taxablePay,
            paye: stat.paye,
            nssf_employee: stat.nssfEmployee,
            nssf_employer: stat.nssfEmployer,
            shif: stat.shif,
            housing_levy_employee: stat.housingLevyEmployee,
            housing_levy_employer: stat.housingLevyEmployer,
            nita_employer: stat.nitaEmployer,
            personal_relief: stat.personalRelief,
            insurance_relief: stat.insuranceRelief,
            pension_relief: stat.pensionRelief,
            loan_deductions: loanDeductions,
            advance_deductions: 0,
            other_deductions: round2(saccoTotal + otherDeductions),
            total_deductions: totalDeductions,
            net_pay: netPay,
            days_worked: daysWorked,
            lwop_days: lwopDays,
            lines,
        };
    }
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
