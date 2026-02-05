import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ApprovalFlow } from './approval-flow.entity';
import { ApprovalAction } from './approval-action.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum ApprovalInstanceStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
}

@Entity('approval_instances')
export class ApprovalInstance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ApprovalFlow)
    @JoinColumn({ name: 'flow_id' })
    flow: ApprovalFlow;

    @Column()
    target_type: string; // leave, claim, staff_loan

    @Column('uuid')
    target_id: string; // e.g. leave_requests.id

    // The requester/initiator
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'requester_id' })
    requester?: Staff;

    @Column({ type: 'enum', enum: ApprovalInstanceStatus, default: ApprovalInstanceStatus.PENDING })
    status: ApprovalInstanceStatus;

    @Column({ default: 1 })
    current_step_order: number;

    // Current pending approver (cached for quick lookup)
    @Column({ nullable: true })
    current_approver_role?: string;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'current_approver_id' })
    currentApprover?: Staff;

    // Urgency/priority
    @Column({ default: false })
    is_urgent: boolean;

    @Column({ type: 'timestamp', nullable: true })
    deadline?: Date;

    // Final resolution
    @Column({ type: 'text', nullable: true })
    final_comment?: string;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'resolved_by_id' })
    resolvedBy?: Staff;

    @Column({ type: 'timestamp', nullable: true })
    resolved_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => ApprovalAction, (action) => action.instance, { cascade: true })
    actions: ApprovalAction[];
}
