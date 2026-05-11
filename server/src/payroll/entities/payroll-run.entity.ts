import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PayrollPeriod } from './payroll-period.entity';
import { Payslip } from './payslip.entity';

export enum PayrollRunStatus {
    DRAFT = 'draft',
    CALCULATED = 'calculated',
    APPROVED = 'approved',
    PAID = 'paid',
    CANCELLED = 'cancelled',
}

export enum PayrollRunType {
    REGULAR = 'regular',
    BONUS = 'bonus',
    ARREARS = 'arrears',
    OFF_CYCLE = 'off_cycle',
}

@Entity('payroll_runs')
export class PayrollRun {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string; // e.g., "March 2026 Monthly Payroll"

    @ManyToOne(() => PayrollPeriod, (period) => period.runs, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'period_id' })
    period: PayrollPeriod;

    @Column({ type: 'uuid' })
    @Index()
    period_id: string;

    @Column({ type: 'enum', enum: PayrollRunType, default: PayrollRunType.REGULAR })
    run_type: PayrollRunType;

    @Column({ type: 'enum', enum: PayrollRunStatus, default: PayrollRunStatus.DRAFT })
    @Index()
    status: PayrollRunStatus;

    @Column({ type: 'uuid', nullable: true })
    branch_id?: string; // optional scope: run only one branch

    @Column({ type: 'int', default: 0 })
    employee_count: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_gross: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_paye: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_nssf: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_shif: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_housing_levy: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_nita: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_loan_deductions: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_other_deductions: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    total_net: number;

    @Column({ type: 'uuid', nullable: true })
    calculated_by_user_id?: string;

    @Column({ type: 'timestamp', nullable: true })
    calculated_at?: Date;

    @Column({ type: 'uuid', nullable: true })
    approved_by_user_id?: string;

    @Column({ type: 'timestamp', nullable: true })
    approved_at?: Date;

    @Column({ type: 'uuid', nullable: true })
    paid_by_user_id?: string;

    @Column({ type: 'timestamp', nullable: true })
    paid_at?: Date;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @OneToMany(() => Payslip, (p) => p.run, { cascade: true })
    payslips: Payslip[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
