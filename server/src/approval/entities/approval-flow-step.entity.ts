import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApprovalFlow } from './approval-flow.entity';

export enum ApproverType {
    ROLE = 'role',           // Specific role code
    MANAGER = 'manager',     // Direct manager of requester
    SKIP_MANAGER = 'skip_manager', // Manager's manager
    BRANCH_MANAGER = 'branch_manager', // BM of requester's branch
    REGIONAL_MANAGER = 'regional_manager', // RM of requester's region
    DEPARTMENT_HEAD = 'department_head', // Head of requester's department
    SPECIFIC_USER = 'specific_user', // Specific user ID
}

@Entity('approval_flow_steps')
export class ApprovalFlowStep {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ApprovalFlow, (flow) => flow.steps, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'flow_id' })
    flow: ApprovalFlow;

    @Column()
    step_order: number;

    @Column({ nullable: true, default: 'Approval Step' })
    name?: string; // "Manager Approval", "HR Review", etc.

    @Column({ type: 'enum', enum: ApproverType, default: ApproverType.ROLE })
    approver_type: ApproverType;

    // For ROLE type
    @Column({ nullable: true })
    approver_role_code?: string; // REGIONAL_MANAGER, HR_MANAGER, CEO, etc.

    // For SPECIFIC_USER type
    @Column({ nullable: true })
    specific_approver_id?: string;

    @Column({ default: false })
    is_final: boolean;

    // Can this step be skipped if approver not available?
    @Column({ default: false })
    can_skip: boolean;

    // Auto-approve after X hours if no action (0 = disabled)
    @Column({ type: 'int', default: 0 })
    auto_approve_hours: number;

    // Escalation: escalate to this role if not approved within timeout
    @Column({ nullable: true })
    escalation_role_code?: string;

    @Column({ type: 'int', default: 0 })
    escalation_hours: number;

    @Column({ type: 'text', nullable: true })
    instructions?: string;

    @CreateDateColumn()
    created_at: Date;
}
