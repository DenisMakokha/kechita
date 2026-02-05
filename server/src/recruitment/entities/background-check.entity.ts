import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Candidate } from './candidate.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum BackgroundCheckType {
    CRIMINAL = 'criminal',
    CREDIT = 'credit',
    EMPLOYMENT = 'employment',
    EDUCATION = 'education',
    REFERENCE = 'reference',
    IDENTITY = 'identity',
    ADDRESS = 'address',
    PROFESSIONAL_LICENSE = 'professional_license',
}

export enum BackgroundCheckStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum BackgroundCheckResult {
    CLEAR = 'clear',
    FLAGGED = 'flagged',
    INCONCLUSIVE = 'inconclusive',
    NOT_APPLICABLE = 'not_applicable',
}

@Entity('background_checks')
export class BackgroundCheck {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    check_number: string;

    @ManyToOne(() => Candidate, { eager: true })
    @JoinColumn({ name: 'candidate_id' })
    candidate: Candidate;

    @Column({ type: 'enum', enum: BackgroundCheckType })
    type: BackgroundCheckType;

    @Column({ type: 'enum', enum: BackgroundCheckStatus, default: BackgroundCheckStatus.PENDING })
    status: BackgroundCheckStatus;

    @Column({ type: 'enum', enum: BackgroundCheckResult, nullable: true })
    result?: BackgroundCheckResult;

    // Provider details
    @Column({ nullable: true })
    provider_name?: string;

    @Column({ nullable: true })
    provider_reference?: string;

    // Dates
    @Column({ type: 'date', nullable: true })
    initiated_date?: Date;

    @Column({ type: 'date', nullable: true })
    expected_completion_date?: Date;

    @Column({ type: 'date', nullable: true })
    completed_date?: Date;

    // Results
    @Column({ type: 'text', nullable: true })
    findings?: string;

    @Column({ type: 'jsonb', nullable: true })
    detailed_results?: Record<string, any>;

    @Column('simple-array', { nullable: true })
    document_ids?: string[];

    // Flags
    @Column({ default: false })
    has_issues: boolean;

    @Column({ type: 'text', nullable: true })
    issue_description?: string;

    // Cost tracking
    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    cost?: number;

    @Column({ default: 'KES' })
    currency: string;

    // Staff tracking
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'initiated_by_id' })
    initiatedBy?: Staff;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'reviewed_by_id' })
    reviewedBy?: Staff;

    @Column({ type: 'timestamp', nullable: true })
    reviewed_at?: Date;

    @Column({ type: 'text', nullable: true })
    reviewer_notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

