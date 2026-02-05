import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { StaffLoanRepayment } from './staff-loan-repayment.entity';

export enum LoanType {
    SALARY_ADVANCE = 'salary_advance',
    STAFF_LOAN = 'staff_loan',
    EMERGENCY_LOAN = 'emergency_loan',
}

export enum LoanStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    DISBURSED = 'disbursed',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    DEFAULTED = 'defaulted',
    CANCELLED = 'cancelled',
    WRITTEN_OFF = 'written_off',
}

@Entity('staff_loans')
export class StaffLoan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Unique loan reference
    @Column({ unique: true })
    loan_number: string;

    @ManyToOne(() => Staff, { eager: true })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    // Loan Type
    @Column({
        type: 'enum',
        enum: LoanType,
        default: LoanType.STAFF_LOAN,
    })
    loan_type: LoanType;

    // Financial details
    @Column('decimal', { precision: 12, scale: 2 })
    principal: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total_interest: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total_payable: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total_paid: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    outstanding_balance: number;

    @Column({ default: 'KES' })
    currency: string;

    // Terms
    @Column()
    term_months: number;

    @Column('decimal', { precision: 5, scale: 2, default: 0 })
    interest_rate: number; // Annual interest rate as percentage

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    monthly_installment?: number;

    // Dates
    @Column({ type: 'date' })
    application_date: Date;

    @Column({ type: 'date', nullable: true })
    approval_date?: Date;

    @Column({ type: 'date', nullable: true })
    disbursement_date?: Date;

    @Column({ type: 'date', nullable: true })
    first_repayment_date?: Date;

    @Column({ type: 'date', nullable: true })
    maturity_date?: Date;

    // Status
    @Column({
        type: 'enum',
        enum: LoanStatus,
        default: LoanStatus.PENDING,
    })
    status: LoanStatus;

    // Purpose
    @Column({ type: 'text', nullable: true })
    purpose?: string;

    @Column({ type: 'text', nullable: true })
    remarks?: string;

    // Approval workflow
    @Column({ type: 'uuid', nullable: true })
    approval_instance_id?: string;

    // Tracking
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'created_by_id' })
    createdBy?: Staff;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'approved_by_id' })
    approvedBy?: Staff;

    @Column({ type: 'text', nullable: true })
    approval_comment?: string;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'rejected_by_id' })
    rejectedBy?: Staff;

    @Column({ type: 'text', nullable: true })
    rejection_reason?: string;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'disbursed_by_id' })
    disbursedBy?: Staff;

    @Column({ nullable: true })
    disbursement_reference?: string;

    @Column({ nullable: true })
    disbursement_method?: string; // bank_transfer, cash, mpesa

    // Flags
    @Column({ default: false })
    is_urgent: boolean;

    @Column({ default: true })
    deduct_from_salary: boolean;

    // Deduction configuration
    @Column('decimal', { precision: 5, scale: 2, nullable: true })
    max_salary_deduction_percent?: number; // Max % of salary that can be deducted

    // Guarantor (for staff loans)
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'guarantor_id' })
    guarantor?: Staff;

    @Column({ nullable: true })
    guarantor_consent_date?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => StaffLoanRepayment, (repayment) => repayment.loan, { cascade: true })
    repayments: StaffLoanRepayment[];

    // Calculated properties
    get repayment_progress(): number {
        if (!this.total_payable || Number(this.total_payable) === 0) return 0;
        return (Number(this.total_paid) / Number(this.total_payable)) * 100;
    }

    get is_overdue(): boolean {
        if (this.status !== LoanStatus.ACTIVE && this.status !== LoanStatus.DISBURSED) return false;
        return this.repayments?.some(r => r.status === 'overdue') || false;
    }
}
