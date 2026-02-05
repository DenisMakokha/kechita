import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pipeline_stages')
export class PipelineStage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string; // APPLIED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column()
    position: number;

    @Column({ nullable: true })
    color: string; // Hex color for UI

    @Column({ nullable: true })
    icon: string; // Icon name for UI

    @Column({ default: false })
    is_terminal: boolean;

    @Column({ default: false })
    is_success: boolean;

    // Automation settings
    @Column({ default: false })
    auto_move_enabled: boolean;

    @Column({ type: 'int', nullable: true })
    auto_move_after_days: number;

    @Column({ nullable: true })
    auto_move_to_stage_code: string;

    // Email triggers
    @Column({ default: false })
    send_candidate_email: boolean;

    @Column({ nullable: true })
    candidate_email_template: string;

    @Column({ default: false })
    send_internal_notification: boolean;

    // Actions required
    @Column({ default: false })
    requires_interview: boolean;

    @Column({ default: false })
    requires_feedback: boolean;

    @Column({ default: false })
    requires_approval: boolean;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
