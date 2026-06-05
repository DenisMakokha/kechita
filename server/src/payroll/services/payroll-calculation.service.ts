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

        // Load custom database rates
        await this.statutory.loadRates();

        const basicSalary = Number(staff.basic_salary);
        const periodStart = ctx.period.start_date;
        const periodEnd = ctx.period.end_date;

        const periodStartMs = dateStringToMs(periodStart);
        const periodEndMs = dateStringToMs(periodEnd);
        const totalDays = Math.round((periodEndMs - periodStartMs) / (1000 * 3600 * 24)) + 1;

        let activeStartMs = periodStartMs;
        if (staff.hire_date) {
            const hireMs = dateStringToMs(staff.hire_date);
            if (hireMs > periodStartMs) {
                activeStartMs = hireMs;
            }
        }

        let activeEndMs = periodEndMs;
        if (staff.termination_date) {
            const termMs = dateStringToMs(staff.termination_date);
            if (termMs < periodEndMs) {
                activeEndMs = termMs;
            }
        }

        let activeDays = Math.round((activeEndMs - activeStartMs) / (1000 * 3600 * 24)) + 1;
        if (activeDays < 0) activeDays = 0;
        if (activeDays > totalDays) activeDays = totalDays;

        const isProrated = activeDays < totalDays;
        const prorationFactor = activeDays / totalDays;
        const proratedBasic = isProrated ? round2(basicSalary * prorationFactor) : basicSalary;

        const lines: Array<Partial<PayslipLine>> = [];
        let sortOrder = 0;

        // ── Basic salary line ──
        lines.push({
            kind: PayslipLineKind.EARNING,
            category: PayslipLineCategory.BASIC,
            label: isProrated ? `Basic Salary (Prorated: ${activeDays}/${totalDays} days)` : 'Basic Salary',
            amount: proratedBasic,
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
            const isLwop = l.leaveType?.code === 'LWOP' || l.leaveType?.is_paid === false;
            if (isLwop) lwopDays += Number(l.total_days || 0);
        }

        const daysWorked = Math.max(0, activeDays - lwopDays);
        const lwopDeduction = lwopDays > 0 ? round2((basicSalary / totalDays) * lwopDays) : 0;
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
        const grossPay = round2(proratedBasic + totalAllowances - lwopDeduction);
        const taxablePay = round2(grossPay - nonTaxableAllowances);

        // ── Recurring deductions (pension contributes to relief) ──
        const allRecurring = await this.deductionRepo.find({
            where: { staff_id: staff.id, is_active: true, effective_from: LessThanOrEqual(periodEnd) },
        });
        const recurring = allRecurring.filter(d => !d.effective_to || d.effective_to >= periodStart);
        
        let pensionContribution = 0;
        let insurancePremiums = 0;
        let recurringLoanDeductions = 0;
        let advanceDeductions = 0;
        let otherDeductions = 0;

        const recurringLines: Array<Partial<PayslipLine>> = [];

        for (const d of recurring) {
            const amt = Number(d.amount);
            if (amt <= 0) continue;

            let category = PayslipLineCategory.OTHER;
            if (d.type === 'pension' as any) {
                category = PayslipLineCategory.PENSION;
                if (d.tax_relievable) pensionContribution += amt;
            } else if (d.type === 'insurance' as any) {
                category = PayslipLineCategory.INSURANCE;
                insurancePremiums += amt;
            } else if (d.type === 'sacco' as any) {
                category = PayslipLineCategory.SACCO;
                otherDeductions += amt;
            } else if (d.type === 'car_loan' as any || d.type === 'staff_loan' as any) {
                category = PayslipLineCategory.LOAN;
                recurringLoanDeductions += amt;
            } else if (d.type === 'salary_advance' as any) {
                category = PayslipLineCategory.ADVANCE;
                advanceDeductions += amt;
            } else if (d.type === 'helb' as any) {
                category = PayslipLineCategory.OTHER;
                otherDeductions += amt;
            } else {
                category = PayslipLineCategory.OTHER;
                otherDeductions += amt;
            }

            recurringLines.push({
                kind: PayslipLineKind.DEDUCTION,
                category,
                label: d.label,
                amount: amt,
                taxable: false,
                sort_order: 0, // Assigned below
            });
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
        let scheduledLoanDeductions = 0;
        for (const r of repayments) {
            const outstanding = Number(r.total_amount || 0) - Number(r.paid_amount || 0) - Number(r.waived_amount || 0);
            if (outstanding > 0) scheduledLoanDeductions += outstanding;
        }

        // ── Build deduction lines ──
        if (stat.paye > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.PAYE, label: 'PAYE', amount: stat.paye, taxable: false, sort_order: sortOrder++ });
        if (stat.nssfEmployee > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.NSSF, label: 'NSSF', amount: stat.nssfEmployee, taxable: false, sort_order: sortOrder++ });
        if (stat.shif > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.SHIF, label: 'SHIF', amount: stat.shif, taxable: false, sort_order: sortOrder++ });
        if (stat.housingLevyEmployee > 0) lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.HOUSING_LEVY, label: 'Housing Levy', amount: stat.housingLevyEmployee, taxable: false, sort_order: sortOrder++ });
        
        if (scheduledLoanDeductions > 0) {
            lines.push({ kind: PayslipLineKind.DEDUCTION, category: PayslipLineCategory.LOAN, label: 'Loan Repayments', amount: scheduledLoanDeductions, taxable: false, sort_order: sortOrder++ });
        }

        // Add the recurring deduction lines
        for (const rl of recurringLines) {
            rl.sort_order = sortOrder++;
            lines.push(rl);
        }

        // Employer contributions (informational only)
        if (stat.nssfEmployer > 0) lines.push({ kind: PayslipLineKind.EMPLOYER_CONTRIBUTION, category: PayslipLineCategory.NSSF, label: 'NSSF (Employer)', amount: stat.nssfEmployer, taxable: false, sort_order: sortOrder++ });
        if (stat.housingLevyEmployer > 0) lines.push({ kind: PayslipLineKind.EMPLOYER_CONTRIBUTION, category: PayslipLineCategory.HOUSING_LEVY, label: 'Housing Levy (Employer)', amount: stat.housingLevyEmployer, taxable: false, sort_order: sortOrder++ });
        if (stat.nitaEmployer > 0) lines.push({ kind: PayslipLineKind.EMPLOYER_CONTRIBUTION, category: PayslipLineCategory.NITA, label: 'NITA (Employer)', amount: stat.nitaEmployer, taxable: false, sort_order: sortOrder++ });

        // ── Totals ──
        const totalDeductions = round2(
            stat.paye + stat.nssfEmployee + stat.shif + stat.housingLevyEmployee +
            scheduledLoanDeductions + recurringLoanDeductions + advanceDeductions + otherDeductions + pensionContribution + insurancePremiums
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
            basic_salary: proratedBasic, // Store the prorated basic salary as calculated
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
            loan_deductions: scheduledLoanDeductions + recurringLoanDeductions,
            advance_deductions: advanceDeductions,
            other_deductions: round2(otherDeductions + pensionContribution + insurancePremiums),
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

function dateStringToMs(dateVal: any): number {
    if (!dateVal) return 0;
    let str = '';
    if (dateVal instanceof Date) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getDate()).padStart(2, '0');
        str = `${y}-${m}-${d}`;
    } else {
        str = String(dateVal);
    }
    const parts = str.split('-');
    if (parts.length >= 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return Date.UTC(y, m, d);
    }
    const parsed = new Date(dateVal);
    return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}
