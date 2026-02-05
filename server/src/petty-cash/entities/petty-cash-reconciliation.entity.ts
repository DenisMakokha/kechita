import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PettyCashFloat } from './petty-cash-float.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum ReconciliationStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    APPROVED = 'approved',
    VARIANCE_NOTED = 'variance_noted',
}

@Entity('petty_cash_reconciliations')
export class PettyCashReconciliation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    reconciliation_number: string;

    @ManyToOne(() => PettyCashFloat, { eager: true })
    @JoinColumn({ name: 'float_id' })
    float: PettyCashFloat;

    @Column({ type: 'date' })
    reconciliation_date: Date;

    // System calculated balance
    @Column('decimal', { precision: 12, scale: 2 })
    system_balance: number;

    // Physical cash count
    @Column('decimal', { precision: 12, scale: 2 })
    physical_count: number;

    // Denomination breakdown
    @Column('jsonb', { nullable: true })
    denomination_breakdown: {
        notes_1000?: number;
        notes_500?: number;
        notes_200?: number;
        notes_100?: number;
        notes_50?: number;
        coins_40?: number;
        coins_20?: number;
        coins_10?: number;
        coins_5?: number;
        coins_1?: number;
    };

    // Variance
    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    variance: number;

    @Column({ type: 'text', nullable: true })
    variance_explanation?: string;

    @Column({ type: 'enum', enum: ReconciliationStatus, default: ReconciliationStatus.DRAFT })
    status: ReconciliationStatus;

    @ManyToOne(() => Staff, { eager: true })
    @JoinColumn({ name: 'counted_by_id' })
    countedBy: Staff;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'verified_by_id' })
    verifiedBy?: Staff;

    @Column({ type: 'timestamp', nullable: true })
    verified_at?: Date;

    @Column({ type: 'text', nullable: true })
    verifier_comment?: string;

    @CreateDateColumn()
    created_at: Date;

    // Calculated
    get is_balanced(): boolean {
        return Math.abs(Number(this.variance)) < 0.01;
    }
}
