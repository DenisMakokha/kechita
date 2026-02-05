import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PettyCashFloat } from './petty-cash-float.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum ReplenishmentStatus {
    REQUESTED = 'requested',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    DISBURSED = 'disbursed',
    CANCELLED = 'cancelled',
}

@Entity('petty_cash_replenishments')
export class PettyCashReplenishment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    request_number: string;

    @ManyToOne(() => PettyCashFloat, { eager: true })
    @JoinColumn({ name: 'float_id' })
    float: PettyCashFloat;

    @Column('decimal', { precision: 12, scale: 2 })
    amount_requested: number;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    amount_approved?: number;

    @Column('decimal', { precision: 12, scale: 2 })
    balance_at_request: number;

    @Column({ type: 'enum', enum: ReplenishmentStatus, default: ReplenishmentStatus.REQUESTED })
    status: ReplenishmentStatus;

    @Column({ type: 'text', nullable: true })
    justification?: string;

    // Supporting documents (expense vouchers, receipts)
    @Column('simple-array', { nullable: true })
    supporting_document_ids?: string[];

    @ManyToOne(() => Staff, { eager: true })
    @JoinColumn({ name: 'requested_by_id' })
    requestedBy: Staff;

    @Column({ type: 'timestamp' })
    requested_at: Date;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'approved_by_id' })
    approvedBy?: Staff;

    @Column({ type: 'timestamp', nullable: true })
    approved_at?: Date;

    @Column({ type: 'text', nullable: true })
    approval_comment?: string;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'disbursed_by_id' })
    disbursedBy?: Staff;

    @Column({ type: 'timestamp', nullable: true })
    disbursed_at?: Date;

    @Column({ nullable: true })
    cheque_number?: string;

    @Column({ nullable: true })
    payment_reference?: string;

    @CreateDateColumn()
    created_at: Date;
}
