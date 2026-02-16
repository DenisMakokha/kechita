import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApprovalInstance } from './approval-instance.entity';
import { ApprovalFlowStep } from './approval-flow-step.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum ApprovalActionType {
    APPROVED = 'approved',
    REJECTED = 'rejected',
    RETURNED = 'returned', // Sent back for more info
    DELEGATED = 'delegated', // Delegated to another approver
    AUTO_APPROVED = 'auto_approved', // System auto-approval
    ESCALATED = 'escalated', // Escalated due to timeout
}

@Entity('approval_actions')
export class ApprovalAction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ApprovalInstance, (instance) => instance.actions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'instance_id' })
    instance: ApprovalInstance;

    @ManyToOne(() => ApprovalFlowStep, { nullable: true })
    @JoinColumn({ name: 'step_id' })
    step?: ApprovalFlowStep;

    @Column({ type: 'int' })
    step_order: number;

    @Index()
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'approver_staff_id' })
    approver?: Staff;

    @Column({ type: 'enum', enum: ApprovalActionType })
    action: ApprovalActionType;

    @Column({ type: 'text', nullable: true })
    comment?: string;

    // For delegation
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'delegated_to_id' })
    delegatedTo?: Staff;

    @Column({ nullable: true })
    delegation_reason?: string;

    // IP/device info for audit
    @Column({ nullable: true })
    ip_address?: string;

    @Column({ nullable: true })
    user_agent?: string;

    @CreateDateColumn()
    acted_at: Date;
}
