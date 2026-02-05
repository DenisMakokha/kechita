import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OnboardingInstance } from './onboarding-instance.entity';
import { OnboardingTask } from './onboarding-task.entity';
import { Staff } from './staff.entity';
import { Document } from './document.entity';

export enum TaskCompletionStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    SKIPPED = 'skipped',
    NOT_APPLICABLE = 'not_applicable',
}

/**
 * OnboardingTaskStatus tracks the completion status of each task for an instance
 */
@Entity('onboarding_task_statuses')
export class OnboardingTaskStatus {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => OnboardingInstance, (instance) => instance.taskStatuses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'instance_id' })
    instance: OnboardingInstance;

    @ManyToOne(() => OnboardingTask)
    @JoinColumn({ name: 'task_id' })
    task: OnboardingTask;

    @Column({ type: 'enum', enum: TaskCompletionStatus, default: TaskCompletionStatus.PENDING })
    status: TaskCompletionStatus;

    @Column({ type: 'date', nullable: true })
    due_date?: Date;

    @Column({ type: 'timestamp', nullable: true })
    completed_at?: Date;

    // Who completed this task
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'completed_by_id' })
    completedBy?: Staff;

    // Notes from the person completing
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // If task requires document, link to uploaded document
    @ManyToOne(() => Document, { nullable: true })
    @JoinColumn({ name: 'document_id' })
    document?: Document;

    // Skip reason if skipped
    @Column({ nullable: true })
    skip_reason?: string;

    // Who approved the skip
    @Column({ nullable: true })
    skip_approved_by?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
