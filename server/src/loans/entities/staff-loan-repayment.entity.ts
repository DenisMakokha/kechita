import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StaffLoan } from './staff-loan.entity';

export enum RepaymentStatus {
    SCHEDULED = 'scheduled',
    PENDING = 'pending',
    PAID = 'paid',
    PARTIALLY_PAID = 'partially_paid',
    OVERDUE = 'overdue',
    WAIVED = 'waived',
}

@Entity('staff_loan_repayments')
export class StaffLoanRepayment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => StaffLoan, (loan) => loan.repayments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_loan_id' })
    loan: StaffLoan;

    // Installment number (1, 2, 3, etc.)
    @Column()
    installment_number: number;

    // Due date
    @Column({ type: 'date' })
    due_date: Date;

    // Amounts
    @Column('decimal', { precision: 12, scale: 2 })
    principal_component: number;

    @Column('decimal', { precision: 12, scale: 2 })
    interest_component: number;

    @Column('decimal', { precision: 12, scale: 2 })
    total_amount: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    paid_amount: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    waived_amount: number;

    // Balance after this payment
    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    running_balance: number;

    // Status
    @Column({
        type: 'enum',
        enum: RepaymentStatus,
        default: RepaymentStatus.SCHEDULED,
    })
    status: RepaymentStatus;

    // Payment details
    @Column({ nullable: true })
    payment_date?: Date;

    @Column({ nullable: true })
    payment_reference?: string;

    @Column({ nullable: true })
    payment_method?: string; // salary_deduction, bank_transfer, cash, mpesa

    @Column({ nullable: true })
    payroll_reference?: string; // If deducted from payroll

    @Column({ nullable: true })
    payroll_month?: string; // e.g., "2024-01"

    // Notes
    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // Calculated
    get outstanding_amount(): number {
        return Number(this.total_amount) - Number(this.paid_amount) - Number(this.waived_amount);
    }

    get is_overdue(): boolean {
        if (this.status === RepaymentStatus.PAID || this.status === RepaymentStatus.WAIVED) return false;
        return new Date() > new Date(this.due_date);
    }

    get days_overdue(): number {
        if (!this.is_overdue) return 0;
        const today = new Date();
        const due = new Date(this.due_date);
        return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    }
}
