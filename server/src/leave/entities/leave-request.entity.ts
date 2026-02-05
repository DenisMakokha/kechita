import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { LeaveType } from './leave-type.entity';

export enum LeaveRequestStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
    RECALLED = 'recalled', // Cancelled after approval
}

@Entity('leave_requests')
export class LeaveRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff)
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @ManyToOne(() => LeaveType)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType: LeaveType;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date' })
    end_date: Date;

    @Column('decimal', { precision: 6, scale: 2 })
    total_days: number;

    @Column({ type: 'enum', enum: LeaveRequestStatus, default: LeaveRequestStatus.PENDING })
    status: LeaveRequestStatus;

    @Column({ default: false })
    is_emergency: boolean;

    @Column({ default: false })
    is_half_day: boolean;

    @Column({ nullable: true })
    half_day_period?: string; // 'morning' or 'afternoon'

    @Column({ type: 'text', nullable: true })
    reason?: string;

    // Attachment for medical/other proof
    @Column({ nullable: true })
    attachment_url?: string;

    // Reliever/handover
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'reliever_id' })
    reliever?: Staff;

    @Column({ type: 'text', nullable: true })
    handover_notes?: string;

    // Cancellation/rejection details
    @Column({ type: 'text', nullable: true })
    rejection_reason?: string;

    @Column({ type: 'text', nullable: true })
    cancellation_reason?: string;

    @Column({ type: 'timestamp', nullable: true })
    cancelled_at?: Date;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'cancelled_by_id' })
    cancelledBy?: Staff;

    // Approval tracking
    @Column({ type: 'timestamp', nullable: true })
    approved_at?: Date;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'final_approver_id' })
    finalApprover?: Staff;

    // Contact while on leave
    @Column({ nullable: true })
    contact_phone?: string;

    @Column({ nullable: true })
    contact_address?: string;

    @CreateDateColumn()
    requested_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
