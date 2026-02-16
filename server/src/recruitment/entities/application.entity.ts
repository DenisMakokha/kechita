import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, OneToMany, Index } from 'typeorm';
import { Candidate } from './candidate.entity';
import { JobPost } from './job-post.entity';
import { PipelineStage } from './pipeline-stage.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum ApplicationStatus {
    ACTIVE = 'active',
    SHORTLISTED = 'shortlisted',
    IN_REVIEW = 'in_review',
    INTERVIEW_SCHEDULED = 'interview_scheduled',
    OFFERED = 'offered',
    HIRED = 'hired',
    REJECTED = 'rejected',
    WITHDRAWN = 'withdrawn',
    ON_HOLD = 'on_hold',
}

@Entity('applications')
@Unique(['candidate', 'jobPost'])
export class Application {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    application_number: string;

    @Index()
    @ManyToOne(() => Candidate, { eager: true })
    @JoinColumn({ name: 'candidate_id' })
    candidate: Candidate;

    @Index()
    @ManyToOne(() => JobPost, { eager: true })
    @JoinColumn({ name: 'job_post_id' })
    jobPost: JobPost;

    @Index()
    @ManyToOne(() => PipelineStage, { nullable: true, eager: true })
    @JoinColumn({ name: 'stage_id' })
    stage: PipelineStage;

    @Index()
    @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.ACTIVE })
    status: ApplicationStatus;

    // Application specific documents (override candidate default)
    @Column({ nullable: true })
    resume_url: string;

    @Column({ nullable: true })
    cover_letter_url: string;

    @Column({ type: 'text', nullable: true })
    cover_letter_text: string;

    // Custom question responses (JSON)
    @Column({ type: 'jsonb', nullable: true })
    custom_responses: Record<string, string>;

    // Scoring for this specific application
    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    match_score: number; // Job-specific match score 0-100

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    recruiter_rating: number; // Manual rating by recruiter 1-5

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    interview_score: number; // Average interview scores

    // Assignment
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'assigned_to_id' })
    assignedTo: Staff;

    // Workflow tracking
    @Column({ type: 'timestamp', nullable: true })
    screened_at: Date;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'screened_by_id' })
    screenedBy: Staff;

    @Column({ type: 'timestamp', nullable: true })
    shortlisted_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    offered_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    hired_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    rejected_at: Date;

    @Column({ type: 'text', nullable: true })
    rejection_reason: string;

    // Source tracking
    @Column({ nullable: true })
    source: string;

    @Column({ nullable: true })
    utm_source: string;

    @Column({ nullable: true })
    utm_medium: string;

    @Column({ nullable: true })
    utm_campaign: string;

    // Notes & feedback
    @Column({ type: 'text', nullable: true })
    internal_notes: string;

    // Is starred/bookmarked by recruiter
    @Column({ default: false })
    is_starred: boolean;

    // Interview count
    @Column({ type: 'int', default: 0 })
    interview_count: number;

    @CreateDateColumn()
    applied_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
