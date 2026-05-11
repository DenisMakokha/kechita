import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { PayrollRun } from './payroll-run.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { PayslipLine } from './payslip-line.entity';

export enum PayslipStatus {
    DRAFT = 'draft',
    FINALIZED = 'finalized',
    PAID = 'paid',
    VOIDED = 'voided',
}

@Entity('payslips')
@Unique(['run_id', 'staff_id'])
export class Payslip {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    payslip_number: string;

    @ManyToOne(() => PayrollRun, (run) => run.payslips, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'run_id' })
    run: PayrollRun;

    @Column({ type: 'uuid' })
    @Index()
    run_id: string;

    @ManyToOne(() => Staff, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @Column({ type: 'enum', enum: PayslipStatus, default: PayslipStatus.DRAFT })
    status: PayslipStatus;

    // Snapshot of employee details at run time
    @Column()
    employee_number_snapshot: string;

    @Column()
    full_name_snapshot: string;

    @Column({ nullable: true })
    position_snapshot?: string;

    @Column({ nullable: true })
    branch_snapshot?: string;

    @Column({ nullable: true })
    tax_pin_snapshot?: string;

    @Column({ nullable: true })
    nssf_number_snapshot?: string;

    @Column({ nullable: true })
    shif_number_snapshot?: string;

    // Calculation results (KES)
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    basic_salary: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total_allowances: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    gross_pay: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    taxable_pay: number;

    // Statutory deductions
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    paye: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    nssf_employee: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    nssf_employer: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    shif: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    housing_levy_employee: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    housing_levy_employer: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    nita_employer: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    personal_relief: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    insurance_relief: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    pension_relief: number;

    // Other deductions
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    loan_deductions: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    advance_deductions: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    other_deductions: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total_deductions: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    net_pay: number;

    // Days worked / LWOP
    @Column({ type: 'decimal', precision: 6, scale: 2, default: 30 })
    days_worked: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
    lwop_days: number;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ nullable: true })
    pdf_path?: string; // generated payslip PDF location

    @OneToMany(() => PayslipLine, (line) => line.payslip, { cascade: true, eager: false })
    lines: PayslipLine[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
