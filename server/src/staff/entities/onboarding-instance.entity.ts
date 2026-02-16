import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Staff } from './staff.entity';
import { OnboardingTemplate } from './onboarding-template.entity';
import { OnboardingTaskStatus } from './onboarding-task-status.entity';

export enum OnboardingInstanceStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

/**
 * OnboardingInstance is created when a new staff member starts onboarding
 * It tracks their progress through the template tasks
 */
@Entity('onboarding_instances')
export class OnboardingInstance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => Staff)
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @ManyToOne(() => OnboardingTemplate)
    @JoinColumn({ name: 'template_id' })
    template: OnboardingTemplate;

    @Index()
    @Column({ type: 'enum', enum: OnboardingInstanceStatus, default: OnboardingInstanceStatus.NOT_STARTED })
    status: OnboardingInstanceStatus;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date', nullable: true })
    expected_completion_date: Date;

    @Column({ type: 'date', nullable: true })
    completed_date: Date;

    // Progress percentage (computed from task statuses)
    @Column({ type: 'int', default: 0 })
    progress_percentage: number;

    // Number of tasks completed
    @Column({ type: 'int', default: 0 })
    tasks_completed: number;

    // Total number of tasks
    @Column({ type: 'int', default: 0 })
    tasks_total: number;

    // Notes from HR or manager
    @Column({ type: 'text', nullable: true })
    notes: string;

    @OneToMany(() => OnboardingTaskStatus, (taskStatus) => taskStatus.instance, { cascade: true })
    taskStatuses: OnboardingTaskStatus[];

    // Assigned manager/mentor for onboarding
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'assigned_mentor_id' })
    assignedMentor: Staff;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ nullable: true })
    created_by: string;
}
