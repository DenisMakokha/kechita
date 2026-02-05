import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { ClaimItem } from './claim-item.entity';

export enum ClaimStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    UNDER_REVIEW = 'under_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
    PAID = 'paid',
    PARTIALLY_PAID = 'partially_paid',
}

@Entity('claims')
export class Claim {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Unique claim reference
    @Column({ unique: true })
    claim_number: string;

    @ManyToOne(() => Staff, { eager: true })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'date' })
    claim_date: Date;

    // Period the claim covers
    @Column({ type: 'date', nullable: true })
    period_start?: Date;

    @Column({ type: 'date', nullable: true })
    period_end?: Date;

    // Financial details
    @Column('decimal', { precision: 12, scale: 2 })
    total_amount: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    approved_amount: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    paid_amount: number;

    @Column({ default: 'KES' })
    currency: string;

    // Status tracking
    @Column({
        type: 'enum',
        enum: ClaimStatus,
        default: ClaimStatus.DRAFT,
    })
    status: ClaimStatus;

    // Purpose/description
    @Column({ type: 'text', nullable: true })
    purpose?: string;

    @Column({ type: 'text', nullable: true })
    remarks?: string;

    // Approval workflow
    @Column({ type: 'uuid', nullable: true })
    approval_instance_id?: string;

    // Submission tracking
    @Column({ nullable: true })
    submitted_at?: Date;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'submitted_by_id' })
    submittedBy?: Staff;

    // Approval details
    @Column({ nullable: true })
    approved_at?: Date;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'approved_by_id' })
    approvedBy?: Staff;

    @Column({ type: 'text', nullable: true })
    approval_comment?: string;

    // Rejection details
    @Column({ nullable: true })
    rejected_at?: Date;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'rejected_by_id' })
    rejectedBy?: Staff;

    @Column({ type: 'text', nullable: true })
    rejection_reason?: string;

    // Payment details
    @Column({ nullable: true })
    paid_at?: Date;

    @Column({ nullable: true })
    payment_reference?: string;

    @Column({ nullable: true })
    payment_method?: string; // bank_transfer, cash, mpesa, cheque

    // Flags
    @Column({ default: false })
    is_urgent: boolean;

    @Column({ default: false })
    has_attachments: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => ClaimItem, (item) => item.claim, { cascade: true })
    items: ClaimItem[];

    // Calculated properties
    get pending_amount(): number {
        return Number(this.approved_amount) - Number(this.paid_amount);
    }

    get items_count(): number {
        return this.items?.length || 0;
    }
}
