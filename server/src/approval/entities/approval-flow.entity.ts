import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApprovalFlowStep } from './approval-flow-step.entity';

@Entity('approval_flows')
export class ApprovalFlow {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string; // LEAVE_DEFAULT, CLAIM_DEFAULT, LOAN_DEFAULT, etc.

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column()
    target_type: string; // leave, claim, staff_loan

    @Column({ default: true })
    is_active: boolean;

    // Which branches/regions this flow applies to (null = all)
    @Column({ nullable: true })
    branch_id?: string;

    @Column({ nullable: true })
    region_id?: string;

    // Position/department specific flows
    @Column({ nullable: true })
    position_id?: string;

    @Column({ nullable: true })
    department_id?: string;

    // Priority for matching (higher = more specific)
    @Column({ type: 'int', default: 0 })
    priority: number;

    @OneToMany(() => ApprovalFlowStep, (step) => step.flow, { cascade: true })
    steps: ApprovalFlowStep[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
