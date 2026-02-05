import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OnboardingTemplate } from './onboarding-template.entity';

export enum TaskCategory {
    DOCUMENTATION = 'documentation',
    TRAINING = 'training',
    IT_SETUP = 'it_setup',
    ORIENTATION = 'orientation',
    COMPLIANCE = 'compliance',
    BENEFITS = 'benefits',
    OTHER = 'other',
}

/**
 * OnboardingTask represents a single task within an onboarding template
 */
@Entity('onboarding_tasks')
export class OnboardingTask {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => OnboardingTemplate, (template) => template.tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'template_id' })
    template: OnboardingTemplate;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'enum', enum: TaskCategory, default: TaskCategory.OTHER })
    category: TaskCategory;

    @Column({ type: 'int', default: 0 })
    sort_order: number;

    @Column({ default: true })
    is_required: boolean;

    // Who is responsible: 'employee', 'hr', 'manager', 'it'
    @Column({ default: 'employee' })
    responsible_party: string;

    // Due days from start (0 = day 1, 7 = first week, etc.)
    @Column({ type: 'int', default: 7 })
    due_days_from_start: number;

    // Link to a specific document type if this task requires a document upload
    @Column({ nullable: true })
    required_document_type_id: string;

    // Instructions or help text
    @Column({ type: 'text', nullable: true })
    instructions: string;

    // External link for resources
    @Column({ nullable: true })
    resource_url: string;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;
}
