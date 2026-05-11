import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Payslip } from './payslip.entity';

export enum PayslipLineKind {
    EARNING = 'earning',
    DEDUCTION = 'deduction',
    EMPLOYER_CONTRIBUTION = 'employer_contribution',
    INFO = 'info', // displayed but not summed (e.g., insurance relief)
}

export enum PayslipLineCategory {
    BASIC = 'basic',
    ALLOWANCE = 'allowance',
    OVERTIME = 'overtime',
    BONUS = 'bonus',
    REIMBURSEMENT = 'reimbursement',
    PAYE = 'paye',
    NSSF = 'nssf',
    SHIF = 'shif',
    HOUSING_LEVY = 'housing_levy',
    NITA = 'nita',
    LOAN = 'loan',
    ADVANCE = 'advance',
    SACCO = 'sacco',
    PENSION = 'pension',
    INSURANCE = 'insurance',
    OTHER = 'other',
}

@Entity('payslip_lines')
export class PayslipLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Payslip, (p) => p.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'payslip_id' })
    payslip: Payslip;

    @Column({ type: 'uuid' })
    @Index()
    payslip_id: string;

    @Column({ type: 'enum', enum: PayslipLineKind })
    kind: PayslipLineKind;

    @Column({ type: 'enum', enum: PayslipLineCategory })
    category: PayslipLineCategory;

    @Column()
    label: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'boolean', default: false })
    taxable: boolean;

    @Column({ type: 'int', default: 0 })
    sort_order: number;

    @Column({ type: 'text', nullable: true })
    note?: string;

    @Column({ type: 'uuid', nullable: true })
    source_id?: string; // optional FK back to source (loan_id, claim_id, etc.)

    @Column({ nullable: true })
    source_type?: string;

    @CreateDateColumn()
    created_at: Date;
}
