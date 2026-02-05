import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { StaffLoan, LoanType, LoanStatus } from './entities/staff-loan.entity';
import { StaffLoanRepayment, RepaymentStatus } from './entities/staff-loan-repayment.entity';
import { ApprovalService, ApprovalCompletedEvent } from '../approval/approval.service';
import { Staff } from '../staff/entities/staff.entity';
import { randomDigits } from '../common/id-utils';

interface ApplyLoanDto {
    loan_type: LoanType;
    principal: number;
    term_months: number;
    interest_rate?: number;
    purpose?: string;
    is_urgent?: boolean;
    deduct_from_salary?: boolean;
    max_salary_deduction_percent?: number;
    guarantor_id?: string;
}

interface RecordPaymentDto {
    repayment_id?: string;
    amount: number;
    payment_reference: string;
    payment_method: string;
    notes?: string;
}

@Injectable()
export class LoansService {
    private readonly logger = new Logger(LoansService.name);

    constructor(
        @InjectRepository(StaffLoan)
        private loanRepo: Repository<StaffLoan>,
        @InjectRepository(StaffLoanRepayment)
        private repaymentRepo: Repository<StaffLoanRepayment>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        private approvalService: ApprovalService,
        private dataSource: DataSource,
    ) { }

    // ==================== APPROVAL EVENT LISTENER ====================

    @OnEvent('approval.completed')
    async handleApprovalCompleted(event: ApprovalCompletedEvent) {
        if (event.targetType !== 'staff_loan') return;

        const loan = await this.loanRepo.findOne({
            where: { id: event.targetId },
            relations: ['staff'],
        });
        if (!loan) return;

        const approver = await this.staffRepo.findOne({ where: { id: event.approverId } });

        if (event.status === 'approved') {
            loan.status = LoanStatus.APPROVED;
            loan.approval_date = new Date();
            loan.approval_comment = event.comment;
            if (approver) loan.approvedBy = approver;
        } else if (event.status === 'rejected') {
            loan.status = LoanStatus.REJECTED;
            loan.rejection_reason = event.comment;
            if (approver) loan.rejectedBy = approver;
        }

        await this.loanRepo.save(loan);
        this.logger.log(`Loan ${loan.loan_number} status updated to ${loan.status}`);
    }

    // ==================== LOAN APPLICATION ====================

    private generateLoanNumber(type: LoanType): string {
        const prefix = type === LoanType.SALARY_ADVANCE ? 'ADV' : type === LoanType.EMERGENCY_LOAN ? 'EMG' : 'LN';
        const year = new Date().getFullYear();
        const random = randomDigits(5);
        return `${prefix}-${year}-${random}`;
    }

    async applyForLoan(staffId: string, dto: ApplyLoanDto): Promise<StaffLoan> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const staff = await queryRunner.manager.findOne(Staff, {
                where: { id: staffId },
                relations: ['branch', 'position'],
            });
            if (!staff) throw new NotFoundException('Staff not found');

            // Validate no existing active loan (for staff loans)
            if (dto.loan_type === LoanType.STAFF_LOAN) {
                const existingActive = await queryRunner.manager.findOne(StaffLoan, {
                    where: {
                        staff: { id: staffId },
                        loan_type: LoanType.STAFF_LOAN,
                        status: In([LoanStatus.PENDING, LoanStatus.APPROVED, LoanStatus.DISBURSED, LoanStatus.ACTIVE]),
                    },
                });
                if (existingActive) {
                    throw new BadRequestException('You already have an active or pending staff loan');
                }
            }

            // Validate salary advance - only one per month
            if (dto.loan_type === LoanType.SALARY_ADVANCE) {
                const thisMonth = new Date();
                const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
                const endOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);

                const existingAdvance = await queryRunner.manager.createQueryBuilder(StaffLoan, 'loan')
                    .where('loan.staff_id = :staffId', { staffId })
                    .andWhere('loan.loan_type = :type', { type: LoanType.SALARY_ADVANCE })
                    .andWhere('loan.application_date BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
                    .andWhere('loan.status NOT IN (:...excludedStatus)', {
                        excludedStatus: [LoanStatus.REJECTED, LoanStatus.CANCELLED],
                    })
                    .getOne();

                if (existingAdvance) {
                    throw new BadRequestException('You can only request one salary advance per month');
                }
            }

            // Get guarantor if provided
            let guarantor: Staff | null = null;
            if (dto.guarantor_id) {
                guarantor = await queryRunner.manager.findOne(Staff, { where: { id: dto.guarantor_id } });
                if (!guarantor) throw new BadRequestException('Guarantor not found');
                if (guarantor.id === staffId) throw new BadRequestException('You cannot be your own guarantor');
            }

            // Calculate interest and totals
            const interestRate = dto.interest_rate || (dto.loan_type === LoanType.SALARY_ADVANCE ? 0 : 12);
            const totalInterest = this.calculateTotalInterest(dto.principal, interestRate, dto.term_months);
            const totalPayable = dto.principal + totalInterest;
            const monthlyInstallment = this.calculateEMI(dto.principal, interestRate, dto.term_months);

            // Create loan
            const loan = queryRunner.manager.create(StaffLoan, {
                loan_number: this.generateLoanNumber(dto.loan_type),
                staff,
                loan_type: dto.loan_type,
                principal: dto.principal,
                total_interest: totalInterest,
                total_payable: totalPayable,
                outstanding_balance: totalPayable,
                currency: 'KES',
                term_months: dto.term_months,
                interest_rate: interestRate,
                monthly_installment: monthlyInstallment,
                application_date: new Date(),
                status: LoanStatus.PENDING,
                purpose: dto.purpose,
                is_urgent: dto.is_urgent || false,
                deduct_from_salary: dto.deduct_from_salary !== false,
                max_salary_deduction_percent: dto.max_salary_deduction_percent || 33,
                guarantor: guarantor || undefined,
                createdBy: staff,
            });

            const savedLoan = await queryRunner.manager.save(loan);
            await queryRunner.commitTransaction();

            // Initiate approval workflow
            try {
                const flowCode = dto.loan_type === LoanType.SALARY_ADVANCE
                    ? 'SALARY_ADVANCE_DEFAULT'
                    : 'STAFF_LOAN_DEFAULT';

                const instance = await this.approvalService.initiateApproval(
                    'staff_loan',
                    savedLoan.id,
                    flowCode,
                    staff.id,
                    dto.is_urgent,
                );
                savedLoan.approval_instance_id = instance.id;
                await this.loanRepo.save(savedLoan);
            } catch (approvalErr: any) {
                console.warn('Could not initiate loan approval:', approvalErr.message);
            }

            return this.findById(savedLoan.id);

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async cancelLoan(loanId: string, staffId: string): Promise<StaffLoan> {
        const loan = await this.loanRepo.findOne({
            where: { id: loanId },
            relations: ['staff'],
        });

        if (!loan) throw new NotFoundException('Loan not found');
        if (loan.staff.id !== staffId) {
            throw new ForbiddenException('You can only cancel your own loan applications');
        }
        if (loan.status !== LoanStatus.PENDING && loan.status !== LoanStatus.DRAFT) {
            throw new BadRequestException('Only pending or draft loans can be cancelled');
        }

        loan.status = LoanStatus.CANCELLED;
        await this.loanRepo.save(loan);

        // Cancel approval instance if exists
        if (loan.approval_instance_id) {
            try {
                await this.approvalService.cancelApproval(loan.approval_instance_id);
            } catch (err: any) {
                console.warn('Could not cancel approval:', err.message);
            }
        }

        return loan;
    }

    // ==================== REPAYMENT SCHEDULE ====================

    async generateRepaymentSchedule(loanId: string): Promise<StaffLoanRepayment[]> {
        const loan = await this.loanRepo.findOne({ where: { id: loanId } });
        if (!loan) throw new NotFoundException('Loan not found');

        // Delete existing schedule
        await this.repaymentRepo.delete({ loan: { id: loanId } });

        const monthlyTotal = this.calculateEMI(Number(loan.principal), Number(loan.interest_rate), loan.term_months);
        const monthlyInterest = (Number(loan.principal) * (Number(loan.interest_rate) / 100 / 12));
        const repayments: StaffLoanRepayment[] = [];

        let runningBalance = Number(loan.total_payable);
        const startDate = loan.first_repayment_date || loan.disbursement_date || loan.approval_date || new Date();

        for (let i = 1; i <= loan.term_months; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            // For flat rate: equal principal and interest each month
            const principalComponent = Number(loan.principal) / loan.term_months;
            const interestComponent = Number(loan.total_interest) / loan.term_months;
            const totalAmount = principalComponent + interestComponent;

            runningBalance -= totalAmount;

            const repayment = this.repaymentRepo.create({
                loan,
                installment_number: i,
                due_date: dueDate,
                principal_component: principalComponent,
                interest_component: interestComponent,
                total_amount: totalAmount,
                paid_amount: 0,
                running_balance: Math.max(0, runningBalance),
                status: RepaymentStatus.SCHEDULED,
            });
            repayments.push(await this.repaymentRepo.save(repayment));
        }

        return repayments;
    }

    // ==================== APPROVAL CALLBACKS ====================

    async onLoanApproved(loanId: string, approverId: string, comment?: string): Promise<void> {
        const loan = await this.findById(loanId);
        const approver = await this.staffRepo.findOne({ where: { id: approverId } });

        loan.status = LoanStatus.APPROVED;
        loan.approval_date = new Date();
        loan.approvedBy = approver || undefined;
        loan.approval_comment = comment;

        await this.loanRepo.save(loan);
    }

    async onLoanRejected(loanId: string, rejecterId: string, reason: string): Promise<void> {
        const loan = await this.findById(loanId);
        const rejecter = await this.staffRepo.findOne({ where: { id: rejecterId } });

        loan.status = LoanStatus.REJECTED;
        loan.rejectedBy = rejecter || undefined;
        loan.rejection_reason = reason;

        await this.loanRepo.save(loan);
    }

    // ==================== DISBURSEMENT ====================

    async disburseLoan(
        loanId: string,
        disburserId: string,
        disbursementReference: string,
        disbursementMethod: string,
        firstRepaymentDate?: Date,
    ): Promise<StaffLoan> {
        const loan = await this.findById(loanId);
        if (loan.status !== LoanStatus.APPROVED) {
            throw new BadRequestException('Only approved loans can be disbursed');
        }

        const disburser = await this.staffRepo.findOne({ where: { id: disburserId } });

        loan.status = LoanStatus.DISBURSED;
        loan.disbursement_date = new Date();
        loan.disbursedBy = disburser || undefined;
        loan.disbursement_reference = disbursementReference;
        loan.disbursement_method = disbursementMethod;
        loan.first_repayment_date = firstRepaymentDate || this.getNextPayrollDate();

        // Calculate maturity date
        const maturityDate = new Date(loan.first_repayment_date);
        maturityDate.setMonth(maturityDate.getMonth() + loan.term_months);
        loan.maturity_date = maturityDate;

        await this.loanRepo.save(loan);

        // Generate repayment schedule
        await this.generateRepaymentSchedule(loanId);

        // Update status to active
        loan.status = LoanStatus.ACTIVE;
        return this.loanRepo.save(loan);
    }

    private getNextPayrollDate(): Date {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 25); // Assume 25th is payroll
        return nextMonth;
    }

    // ==================== PAYMENTS ====================

    async recordRepayment(loanId: string, dto: RecordPaymentDto): Promise<StaffLoan> {
        const loan = await this.findById(loanId);
        if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.DISBURSED) {
            throw new BadRequestException('Can only record payments for active loans');
        }

        let repayment: StaffLoanRepayment | null;

        if (dto.repayment_id) {
            // Payment for specific installment
            repayment = await this.repaymentRepo.findOne({ where: { id: dto.repayment_id } });
            if (!repayment) throw new NotFoundException('Repayment not found');
        } else {
            // Find next unpaid repayment
            repayment = await this.repaymentRepo.findOne({
                where: { loan: { id: loanId }, status: In([RepaymentStatus.SCHEDULED, RepaymentStatus.PENDING, RepaymentStatus.OVERDUE, RepaymentStatus.PARTIALLY_PAID]) },
                order: { due_date: 'ASC' },
            });
            if (!repayment) throw new BadRequestException('No pending repayments found');
        }

        // Update repayment
        repayment.paid_amount = Number(repayment.paid_amount) + dto.amount;
        repayment.payment_date = new Date();
        repayment.payment_reference = dto.payment_reference;
        repayment.payment_method = dto.payment_method;
        repayment.notes = dto.notes;

        if (repayment.paid_amount >= Number(repayment.total_amount)) {
            repayment.status = RepaymentStatus.PAID;
        } else {
            repayment.status = RepaymentStatus.PARTIALLY_PAID;
        }

        await this.repaymentRepo.save(repayment);

        // Update loan totals
        loan.total_paid = Number(loan.total_paid) + dto.amount;
        loan.outstanding_balance = Number(loan.total_payable) - Number(loan.total_paid);

        // Check if loan is fully paid
        if (loan.outstanding_balance <= 0) {
            loan.status = LoanStatus.COMPLETED;
            loan.outstanding_balance = 0;
        }

        return this.loanRepo.save(loan);
    }

    async recordPayrollDeduction(
        loanId: string,
        amount: number,
        payrollMonth: string,
        payrollReference: string,
    ): Promise<StaffLoan> {
        return this.recordRepayment(loanId, {
            amount,
            payment_reference: payrollReference,
            payment_method: 'salary_deduction',
            notes: `Payroll deduction for ${payrollMonth}`,
        });
    }

    // ==================== QUERIES ====================

    async findById(id: string): Promise<StaffLoan> {
        const loan = await this.loanRepo.findOne({
            where: { id },
            relations: ['staff', 'staff.branch', 'staff.position', 'repayments', 'approvedBy', 'rejectedBy', 'guarantor'],
        });
        if (!loan) throw new NotFoundException('Loan not found');
        return loan;
    }

    async findMyLoans(staffId: string, status?: LoanStatus): Promise<StaffLoan[]> {
        const where: any = { staff: { id: staffId } };
        if (status) where.status = status;

        return this.loanRepo.find({
            where,
            relations: ['repayments'],
            order: { created_at: 'DESC' },
        });
    }

    async findAll(filters?: {
        status?: LoanStatus;
        loanType?: LoanType;
        staffId?: string;
        branchId?: string;
    }): Promise<StaffLoan[]> {
        const query = this.loanRepo.createQueryBuilder('loan')
            .leftJoinAndSelect('loan.staff', 'staff')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('staff.position', 'position')
            .leftJoinAndSelect('loan.repayments', 'repayments')
            .orderBy('loan.created_at', 'DESC');

        if (filters?.status) {
            query.andWhere('loan.status = :status', { status: filters.status });
        }
        if (filters?.loanType) {
            query.andWhere('loan.loan_type = :loanType', { loanType: filters.loanType });
        }
        if (filters?.staffId) {
            query.andWhere('staff.id = :staffId', { staffId: filters.staffId });
        }
        if (filters?.branchId) {
            query.andWhere('branch.id = :branchId', { branchId: filters.branchId });
        }

        return query.getMany();
    }

    async findPendingApproval(): Promise<StaffLoan[]> {
        return this.loanRepo.find({
            where: { status: LoanStatus.PENDING },
            relations: ['staff', 'staff.branch', 'guarantor'],
            order: { is_urgent: 'DESC', application_date: 'ASC' },
        });
    }

    async findOverdueLoans(): Promise<StaffLoan[]> {
        const loans = await this.loanRepo.find({
            where: { status: In([LoanStatus.ACTIVE, LoanStatus.DISBURSED]) },
            relations: ['staff', 'repayments'],
        });

        return loans.filter(loan =>
            loan.repayments.some(r =>
                (r.status === RepaymentStatus.SCHEDULED || r.status === RepaymentStatus.PENDING) &&
                new Date(r.due_date) < new Date()
            )
        );
    }

    // ==================== STATISTICS ====================

    async getLoanStats(filters?: { staffId?: string; year?: number }): Promise<{
        total: number;
        pending: number;
        active: number;
        completed: number;
        defaulted: number;
        totalDisbursed: number;
        totalOutstanding: number;
        totalRepaid: number;
        byType: { type: string; count: number; amount: number }[];
    }> {
        const year = filters?.year || new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        const query = this.loanRepo.createQueryBuilder('loan')
            .where('loan.application_date BETWEEN :startDate AND :endDate', { startDate, endDate });

        if (filters?.staffId) {
            query.andWhere('loan.staff_id = :staffId', { staffId: filters.staffId });
        }

        const loans = await query.getMany();

        const pending = loans.filter(l => l.status === LoanStatus.PENDING).length;
        const active = loans.filter(l => l.status === LoanStatus.ACTIVE || l.status === LoanStatus.DISBURSED).length;
        const completed = loans.filter(l => l.status === LoanStatus.COMPLETED).length;
        const defaulted = loans.filter(l => l.status === LoanStatus.DEFAULTED).length;

        const totalDisbursed = loans
            .filter(l => l.status !== LoanStatus.PENDING && l.status !== LoanStatus.REJECTED)
            .reduce((sum, l) => sum + Number(l.principal), 0);
        const totalOutstanding = loans.reduce((sum, l) => sum + Number(l.outstanding_balance), 0);
        const totalRepaid = loans.reduce((sum, l) => sum + Number(l.total_paid), 0);

        // By type
        const byTypeMap = new Map<string, { count: number; amount: number }>();
        for (const loan of loans) {
            const existing = byTypeMap.get(loan.loan_type) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += Number(loan.principal);
            byTypeMap.set(loan.loan_type, existing);
        }

        return {
            total: loans.length,
            pending,
            active,
            completed,
            defaulted,
            totalDisbursed,
            totalOutstanding,
            totalRepaid,
            byType: Array.from(byTypeMap.entries()).map(([type, data]) => ({
                type,
                ...data,
            })),
        };
    }

    // ==================== PAYROLL EXPORT ====================

    async getPayrollExport(month: string): Promise<{
        month: string;
        exportDate: Date;
        totalDeductions: number;
        staffCount: number;
        deductions: {
            staffId: string;
            staffNumber: string;
            staffName: string;
            branchName: string;
            loanId: string;
            loanNumber: string;
            loanType: string;
            installmentNumber: number;
            amount: number;
            principalComponent: number;
            interestComponent: number;
            outstandingBalance: number;
        }[];
    }> {
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        // Find all repayments due this month for active loans with salary deduction
        const repayments = await this.repaymentRepo.createQueryBuilder('repayment')
            .leftJoinAndSelect('repayment.loan', 'loan')
            .leftJoinAndSelect('loan.staff', 'staff')
            .leftJoinAndSelect('staff.branch', 'branch')
            .where('repayment.due_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('repayment.status IN (:...statuses)', {
                statuses: [RepaymentStatus.SCHEDULED, RepaymentStatus.PENDING, RepaymentStatus.OVERDUE]
            })
            .andWhere('loan.status IN (:...loanStatuses)', {
                loanStatuses: [LoanStatus.ACTIVE, LoanStatus.DISBURSED]
            })
            .andWhere('loan.deduct_from_salary = :deduct', { deduct: true })
            .orderBy('staff.employee_number', 'ASC')
            .addOrderBy('loan.loan_number', 'ASC')
            .getMany();

        const deductions = repayments.map(r => ({
            staffId: r.loan.staff.id,
            staffNumber: r.loan.staff.employee_number || '',
            staffName: r.loan.staff.full_name,
            branchName: r.loan.staff.branch?.name || 'Unknown',
            loanId: r.loan.id,
            loanNumber: r.loan.loan_number,
            loanType: r.loan.loan_type,
            installmentNumber: r.installment_number,
            amount: Number(r.total_amount),
            principalComponent: Number(r.principal_component),
            interestComponent: Number(r.interest_component),
            outstandingBalance: Number(r.running_balance),
        }));

        const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        const uniqueStaff = new Set(deductions.map(d => d.staffId));

        return {
            month,
            exportDate: new Date(),
            totalDeductions,
            staffCount: uniqueStaff.size,
            deductions,
        };
    }

    async processPayrollDeductions(
        month: string,
        payrollReference: string,
    ): Promise<{
        processed: number;
        failed: number;
        results: { loanId: string; loanNumber: string; success: boolean; error?: string }[];
    }> {
        const export_ = await this.getPayrollExport(month);
        const results: { loanId: string; loanNumber: string; success: boolean; error?: string }[] = [];

        let processed = 0;
        let failed = 0;

        for (const deduction of export_.deductions) {
            try {
                await this.recordPayrollDeduction(
                    deduction.loanId,
                    deduction.amount,
                    month,
                    payrollReference,
                );
                results.push({ loanId: deduction.loanId, loanNumber: deduction.loanNumber, success: true });
                processed++;
            } catch (err: any) {
                results.push({
                    loanId: deduction.loanId,
                    loanNumber: deduction.loanNumber,
                    success: false,
                    error: err.message
                });
                failed++;
            }
        }

        return { processed, failed, results };
    }

    async getPayrollSummaryByBranch(month: string): Promise<{
        branchId: string;
        branchName: string;
        staffCount: number;
        totalDeductions: number;
        loanCount: number;
    }[]> {
        const export_ = await this.getPayrollExport(month);

        const branchMap = new Map<string, {
            branchId: string;
            branchName: string;
            staffIds: Set<string>;
            totalDeductions: number;
            loanIds: Set<string>;
        }>();

        for (const deduction of export_.deductions) {
            const branchId = deduction.branchName; // Using name as key since we don't have ID in export
            const existing = branchMap.get(branchId) || {
                branchId,
                branchName: deduction.branchName,
                staffIds: new Set<string>(),
                totalDeductions: 0,
                loanIds: new Set<string>(),
            };

            existing.staffIds.add(deduction.staffId);
            existing.totalDeductions += deduction.amount;
            existing.loanIds.add(deduction.loanId);

            branchMap.set(branchId, existing);
        }

        return Array.from(branchMap.values()).map(b => ({
            branchId: b.branchId,
            branchName: b.branchName,
            staffCount: b.staffIds.size,
            totalDeductions: b.totalDeductions,
            loanCount: b.loanIds.size,
        }));
    }

    async getStaffPayrollDeductions(staffId: string, year?: number): Promise<{
        month: string;
        loanNumber: string;
        loanType: string;
        amount: number;
        status: string;
        paymentDate?: Date;
    }[]> {
        const targetYear = year || new Date().getFullYear();
        const startDate = new Date(targetYear, 0, 1);
        const endDate = new Date(targetYear, 11, 31);

        const repayments = await this.repaymentRepo.createQueryBuilder('repayment')
            .leftJoinAndSelect('repayment.loan', 'loan')
            .leftJoin('loan.staff', 'staff')
            .where('staff.id = :staffId', { staffId })
            .andWhere('repayment.due_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('loan.deduct_from_salary = :deduct', { deduct: true })
            .orderBy('repayment.due_date', 'ASC')
            .getMany();

        return repayments.map(r => ({
            month: `${new Date(r.due_date).getFullYear()}-${(new Date(r.due_date).getMonth() + 1).toString().padStart(2, '0')}`,
            loanNumber: r.loan.loan_number,
            loanType: r.loan.loan_type,
            amount: Number(r.total_amount),
            status: r.status,
            paymentDate: r.payment_date,
        }));
    }

    // ==================== UTILITIES ====================

    private calculateEMI(principal: number, annualRate: number, months: number): number {
        if (annualRate === 0) {
            return principal / months;
        }
        const monthlyRate = annualRate / 100 / 12;
        const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        return Math.round(emi * 100) / 100;
    }

    private calculateTotalInterest(principal: number, annualRate: number, months: number): number {
        if (annualRate === 0) return 0;
        // Using flat rate for simplicity
        const monthlyRate = annualRate / 100 / 12;
        return Math.round(principal * monthlyRate * months * 100) / 100;
    }
}
