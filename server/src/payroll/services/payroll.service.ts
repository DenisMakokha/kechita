import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { PayrollPeriod, PayrollPeriodStatus } from '../entities/payroll-period.entity';
import { PayrollRun, PayrollRunStatus, PayrollRunType } from '../entities/payroll-run.entity';
import { Payslip, PayslipStatus } from '../entities/payslip.entity';
import { PayslipLine } from '../entities/payslip-line.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { StaffStatus } from '../../staff/entities/staff.entity';
import { PayrollCalculationService } from './payroll-calculation.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';

export interface CreatePeriodDto {
    year: number;
    month: number;
    pay_date?: string;
    notes?: string;
}

export interface CreateRunDto {
    period_id: string;
    name: string;
    run_type?: PayrollRunType;
    branch_id?: string;
    notes?: string;
}

@Injectable()
export class PayrollService {
    private readonly logger = new Logger(PayrollService.name);

    constructor(
        @InjectRepository(PayrollPeriod) private periodRepo: Repository<PayrollPeriod>,
        @InjectRepository(PayrollRun) private runRepo: Repository<PayrollRun>,
        @InjectRepository(Payslip) private payslipRepo: Repository<Payslip>,
        @InjectRepository(PayslipLine) private lineRepo: Repository<PayslipLine>,
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
        private calc: PayrollCalculationService,
        private audit: AuditService,
        private dataSource: DataSource,
    ) {}

    // ─────────── Periods ───────────

    async createPeriod(dto: CreatePeriodDto): Promise<PayrollPeriod> {
        if (dto.month < 1 || dto.month > 12) throw new BadRequestException('Month must be 1-12');
        const existing = await this.periodRepo.findOne({ where: { year: dto.year, month: dto.month } });
        if (existing) throw new ConflictException(`Period ${dto.year}-${dto.month} already exists`);
        const start = new Date(dto.year, dto.month - 1, 1);
        const end = new Date(dto.year, dto.month, 0);
        const period = this.periodRepo.create({
            year: dto.year,
            month: dto.month,
            start_date: toISODate(start),
            end_date: toISODate(end),
            pay_date: dto.pay_date || toISODate(end),
            notes: dto.notes,
            status: PayrollPeriodStatus.OPEN,
        });
        return this.periodRepo.save(period);
    }

    async listPeriods(): Promise<PayrollPeriod[]> {
        return this.periodRepo.find({ order: { year: 'DESC', month: 'DESC' } });
    }

    async getPeriod(id: string): Promise<PayrollPeriod> {
        const p = await this.periodRepo.findOne({ where: { id }, relations: ['runs'] });
        if (!p) throw new NotFoundException('Period not found');
        return p;
    }

    async updatePeriod(id: string, dto: { pay_date?: string; notes?: string }): Promise<PayrollPeriod> {
        const p = await this.getPeriod(id);
        if (p.status === PayrollPeriodStatus.CLOSED) throw new BadRequestException('Cannot edit a closed period');
        if (dto.pay_date !== undefined) p.pay_date = dto.pay_date;
        if (dto.notes !== undefined) p.notes = dto.notes;
        return this.periodRepo.save(p);
    }

    async lockPeriod(id: string, userId?: string): Promise<PayrollPeriod> {
        const p = await this.getPeriod(id);
        if (p.status === PayrollPeriodStatus.CLOSED) throw new BadRequestException('Period is already closed');
        p.status = PayrollPeriodStatus.LOCKED;
        await this.periodRepo.save(p);
        await this.audit.log({ action: AuditAction.UPDATE, entityType: 'PayrollPeriod', entityId: id, description: `Period ${p.year}-${p.month} locked`, userId }).catch(() => {});
        return p;
    }

    async closePeriod(id: string, userId?: string): Promise<PayrollPeriod> {
        const p = await this.getPeriod(id);
        // Require all runs in PAID status
        const incompleteRuns = (p.runs || []).filter(r => r.status !== PayrollRunStatus.PAID && r.status !== PayrollRunStatus.CANCELLED);
        if (incompleteRuns.length > 0) {
            throw new BadRequestException(`Cannot close: ${incompleteRuns.length} run(s) not yet paid/cancelled`);
        }
        p.status = PayrollPeriodStatus.CLOSED;
        p.closed_by_user_id = userId;
        p.closed_at = new Date();
        await this.periodRepo.save(p);
        await this.audit.log({ action: AuditAction.UPDATE, entityType: 'PayrollPeriod', entityId: id, description: `Period ${p.year}-${p.month} closed`, userId }).catch(() => {});
        return p;
    }

    // ─────────── Runs ───────────

    async createRun(dto: CreateRunDto): Promise<PayrollRun> {
        const period = await this.getPeriod(dto.period_id);
        if (period.status !== PayrollPeriodStatus.OPEN) {
            throw new BadRequestException('Cannot create runs in a locked/closed period');
        }
        const run = this.runRepo.create({
            period_id: dto.period_id,
            name: dto.name,
            run_type: dto.run_type || PayrollRunType.REGULAR,
            branch_id: dto.branch_id,
            notes: dto.notes,
            status: PayrollRunStatus.DRAFT,
        });
        return this.runRepo.save(run);
    }

    async getRun(id: string): Promise<PayrollRun> {
        const run = await this.runRepo.findOne({ where: { id }, relations: ['period', 'payslips'] });
        if (!run) throw new NotFoundException('Payroll run not found');
        return run;
    }

    async listRuns(periodId?: string): Promise<PayrollRun[]> {
        const where = periodId ? { period_id: periodId } : {};
        return this.runRepo.find({ where, order: { created_at: 'DESC' }, relations: ['period'] });
    }

    /**
     * Calculate payslips for every eligible staff in the run.
     * Idempotent: re-running deletes previous payslips and recalculates.
     */
    async calculateRun(runId: string, userId?: string): Promise<PayrollRun> {
        const run = await this.runRepo.findOne({ where: { id: runId }, relations: ['period'] });
        if (!run) throw new NotFoundException('Payroll run not found');
        if (run.status === PayrollRunStatus.APPROVED || run.status === PayrollRunStatus.PAID) {
            throw new BadRequestException('Cannot recalculate an approved/paid run');
        }

        const period = await this.getPeriod(run.period_id);
        const periodStart = period.start_date;
        const periodEnd = period.end_date;

        // Find eligible staff (active, probation, suspended, or exited during this period)
        const allStaff = await this.staffRepo.find({
            where: [
                {
                    status: In([StaffStatus.ACTIVE, StaffStatus.PROBATION, StaffStatus.SUSPENDED]),
                    ...(run.branch_id ? { branch: { id: run.branch_id } } : {}),
                },
                {
                    status: In([StaffStatus.TERMINATED, StaffStatus.RESIGNED, StaffStatus.EX_STAFF]),
                    ...(run.branch_id ? { branch: { id: run.branch_id } } : {}),
                }
            ],
            relations: ['branch', 'position'],
        });

        const staffList = allStaff.filter(staff => {
            // Must be hired on or before periodEnd
            if (staff.hire_date) {
                const hire = toISODate(new Date(staff.hire_date));
                if (hire > periodEnd) return false;
            }
            // If terminated/resigned/ex-staff, they must have been terminated on or after periodStart
            const isExit = [StaffStatus.TERMINATED, StaffStatus.RESIGNED, StaffStatus.EX_STAFF].includes(staff.status);
            if (isExit) {
                if (!staff.termination_date) return false;
                const term = toISODate(new Date(staff.termination_date));
                if (term < periodStart) return false;
            }
            return true;
        });

        // Delete prior payslips for this run (cascade lines)
        await this.payslipRepo.delete({ run_id: runId });

        let totalGross = 0, totalPaye = 0, totalNssf = 0, totalShif = 0, totalHousing = 0, totalNita = 0, totalLoan = 0, totalOther = 0, totalNet = 0;
        let processed = 0;

        for (const staff of staffList) {
            try {
                const draft = await this.calc.calculateForStaff(staff, { period, run });
                const payslipNumber = `PS-${period.year}-${String(period.month).padStart(2, '0')}-${staff.employee_number || staff.id.slice(0, 6)}`;
                const payslip = this.payslipRepo.create({
                    payslip_number: payslipNumber,
                    run_id: runId,
                    staff_id: staff.id,
                    status: PayslipStatus.DRAFT,
                    employee_number_snapshot: draft.employee_number_snapshot,
                    full_name_snapshot: draft.full_name_snapshot,
                    position_snapshot: draft.position_snapshot,
                    branch_snapshot: draft.branch_snapshot,
                    tax_pin_snapshot: draft.tax_pin_snapshot,
                    nssf_number_snapshot: draft.nssf_number_snapshot,
                    shif_number_snapshot: draft.shif_number_snapshot,
                    basic_salary: draft.basic_salary,
                    total_allowances: draft.total_allowances,
                    gross_pay: draft.gross_pay,
                    taxable_pay: draft.taxable_pay,
                    paye: draft.paye,
                    nssf_employee: draft.nssf_employee,
                    nssf_employer: draft.nssf_employer,
                    shif: draft.shif,
                    housing_levy_employee: draft.housing_levy_employee,
                    housing_levy_employer: draft.housing_levy_employer,
                    nita_employer: draft.nita_employer,
                    personal_relief: draft.personal_relief,
                    insurance_relief: draft.insurance_relief,
                    pension_relief: draft.pension_relief,
                    loan_deductions: draft.loan_deductions,
                    advance_deductions: draft.advance_deductions,
                    other_deductions: draft.other_deductions,
                    total_deductions: draft.total_deductions,
                    net_pay: draft.net_pay,
                    days_worked: draft.days_worked,
                    lwop_days: draft.lwop_days,
                });
                const savedPayslip = await this.payslipRepo.save(payslip);
                // Save lines
                for (const ln of draft.lines) {
                    const line = this.lineRepo.create({ ...ln, payslip_id: savedPayslip.id });
                    await this.lineRepo.save(line);
                }

                totalGross += Number(draft.gross_pay);
                totalPaye += Number(draft.paye);
                totalNssf += Number(draft.nssf_employee);
                totalShif += Number(draft.shif);
                totalHousing += Number(draft.housing_levy_employee);
                totalNita += Number(draft.nita_employer);
                totalLoan += Number(draft.loan_deductions);
                totalOther += Number(draft.other_deductions);
                totalNet += Number(draft.net_pay);
                processed++;
            } catch (err: any) {
                this.logger.warn(`Skipped staff ${staff.employee_number || staff.id}: ${err.message}`);
            }
        }

        run.employee_count = processed;
        run.total_gross = round2(totalGross);
        run.total_paye = round2(totalPaye);
        run.total_nssf = round2(totalNssf);
        run.total_shif = round2(totalShif);
        run.total_housing_levy = round2(totalHousing);
        run.total_nita = round2(totalNita);
        run.total_loan_deductions = round2(totalLoan);
        run.total_other_deductions = round2(totalOther);
        run.total_net = round2(totalNet);
        run.status = PayrollRunStatus.CALCULATED;
        run.calculated_at = new Date();
        run.calculated_by_user_id = userId;
        await this.runRepo.save(run);

        await this.audit.log({
            action: AuditAction.CREATE,
            entityType: 'PayrollRun',
            entityId: run.id,
            description: `Payroll run "${run.name}" calculated: ${processed} payslips, net total KES ${totalNet.toFixed(2)}`,
            userId,
        }).catch(() => {});

        return run;
    }

    async approveRun(runId: string, userId?: string): Promise<PayrollRun> {
        const run = await this.runRepo.findOne({ where: { id: runId }, relations: ['period'] });
        if (!run) throw new NotFoundException('Payroll run not found');
        if (run.status !== PayrollRunStatus.CALCULATED) {
            throw new BadRequestException('Only calculated runs can be approved');
        }
        run.status = PayrollRunStatus.APPROVED;
        run.approved_at = new Date();
        run.approved_by_user_id = userId;
        await this.runRepo.save(run);
        // Mark payslips finalized
        await this.payslipRepo.update({ run_id: runId }, { status: PayslipStatus.FINALIZED });
        await this.audit.log({ action: AuditAction.UPDATE, entityType: 'PayrollRun', entityId: run.id, description: `Run approved`, userId }).catch(() => {});
        return run;
    }

    async markPaid(runId: string, userId?: string): Promise<PayrollRun> {
        const run = await this.runRepo.findOne({ where: { id: runId }, relations: ['period'] });
        if (!run) throw new NotFoundException('Payroll run not found');
        if (run.status !== PayrollRunStatus.APPROVED) {
            throw new BadRequestException('Only approved runs can be marked paid');
        }
        run.status = PayrollRunStatus.PAID;
        run.paid_at = new Date();
        run.paid_by_user_id = userId;
        await this.runRepo.save(run);
        await this.payslipRepo.update({ run_id: runId }, { status: PayslipStatus.PAID });
        await this.audit.log({ action: AuditAction.UPDATE, entityType: 'PayrollRun', entityId: run.id, description: `Run marked paid`, userId }).catch(() => {});
        return run;
    }

    async cancelRun(runId: string, reason: string, userId?: string): Promise<PayrollRun> {
        const run = await this.runRepo.findOne({ where: { id: runId }, relations: ['period'] });
        if (!run) throw new NotFoundException('Payroll run not found');
        if (run.status === PayrollRunStatus.PAID) throw new BadRequestException('Cannot cancel a paid run');
        run.status = PayrollRunStatus.CANCELLED;
        run.notes = (run.notes ? run.notes + '\n' : '') + `[CANCELLED] ${reason}`;
        await this.runRepo.save(run);
        await this.payslipRepo.update({ run_id: runId }, { status: PayslipStatus.VOIDED });
        await this.audit.log({ action: AuditAction.UPDATE, entityType: 'PayrollRun', entityId: run.id, description: `Run cancelled: ${reason}`, userId }).catch(() => {});
        return run;
    }

    // ─────────── Payslips ───────────

    async listPayslips(runId: string): Promise<Payslip[]> {
        return this.payslipRepo.find({ where: { run_id: runId }, order: { full_name_snapshot: 'ASC' } });
    }

    async getPayslip(id: string): Promise<Payslip> {
        const p = await this.payslipRepo.findOne({ where: { id }, relations: ['lines', 'run', 'run.period'] });
        if (!p) throw new NotFoundException('Payslip not found');
        return p;
    }

    async getStaffPayslips(staffId: string): Promise<Payslip[]> {
        return this.payslipRepo.find({
            where: { staff_id: staffId, status: In([PayslipStatus.FINALIZED, PayslipStatus.PAID]) },
            relations: ['run', 'run.period'],
            order: { created_at: 'DESC' },
        });
    }
}

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
