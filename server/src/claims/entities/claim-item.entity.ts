import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Claim } from './claim.entity';
import { ClaimType } from './claim-type.entity';

export enum ClaimItemStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    PARTIALLY_APPROVED = 'partially_approved',
}

@Entity('claim_items')
export class ClaimItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Claim, (claim) => claim.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'claim_id' })
    claim: Claim;

    @ManyToOne(() => ClaimType, { eager: true })
    @JoinColumn({ name: 'claim_type_id' })
    claimType: ClaimType;

    // Item details
    @Column()
    description: string;

    @Column({ type: 'date', nullable: true })
    expense_date?: Date;

    // Amounts
    @Column('decimal', { precision: 12, scale: 2 })
    amount: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    approved_amount: number;

    // Quantity (for per-unit claims like per diem)
    @Column('decimal', { precision: 10, scale: 2, default: 1 })
    quantity: number;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    unit_price?: number;

    @Column({ nullable: true })
    unit?: string; // days, km, liters, etc.

    // Status
    @Column({
        type: 'enum',
        enum: ClaimItemStatus,
        default: ClaimItemStatus.PENDING,
    })
    status: ClaimItemStatus;

    // Receipt/Document
    @Column({ type: 'uuid', nullable: true })
    document_id?: string;

    @Column({ nullable: true })
    receipt_number?: string;

    @Column({ nullable: true })
    vendor_name?: string;

    // Review details
    @Column({ type: 'text', nullable: true })
    review_comment?: string;

    @Column({ nullable: true })
    reviewed_at?: Date;

    @CreateDateColumn()
    created_at: Date;
}
