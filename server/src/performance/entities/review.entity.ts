import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { ReviewCycle } from './review-cycle.entity';

export enum ReviewerType {
    SELF = 'self',
    MANAGER = 'manager',
    PEER = 'peer',
    DIRECT_REPORT = 'direct_report',
    SKIP_LEVEL = 'skip_level',
}

export enum ReviewStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    SUBMITTED = 'submitted',
    ACKNOWLEDGED = 'acknowledged',
    DISPUTED = 'disputed',
}

@Entity('reviews')
@Unique(['cycle_id', 'reviewee_id', 'reviewer_id', 'reviewer_type'])
export class Review {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ReviewCycle, (c) => c.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cycle_id' })
    cycle: ReviewCycle;

    @Column({ type: 'uuid' })
    @Index()
    cycle_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reviewee_id' })
    reviewee: Staff;

    @Column({ type: 'uuid' })
    @Index()
    reviewee_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reviewer_id' })
    reviewer: Staff;

    @Column({ type: 'uuid' })
    @Index()
    reviewer_id: string;

    @Column({ type: 'enum', enum: ReviewerType })
    reviewer_type: ReviewerType;

    @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
    @Index()
    status: ReviewStatus;

    /** Competency ratings: { competency_code: { rating: 1-5, comment: string } } */
    @Column({ type: 'jsonb', nullable: true })
    competency_ratings?: Record<string, { rating: number; comment?: string }>;

    @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
    overall_rating?: number; // 1.00-5.00

    @Column({ type: 'text', nullable: true })
    strengths?: string;

    @Column({ type: 'text', nullable: true })
    areas_for_improvement?: string;

    @Column({ type: 'text', nullable: true })
    achievements?: string; // narrative of accomplishments during period

    @Column({ type: 'text', nullable: true })
    development_plan?: string;

    @Column({ type: 'text', nullable: true })
    reviewer_comments?: string;

    @Column({ type: 'text', nullable: true })
    reviewee_comments?: string; // acknowledgment + response

    @Column({ type: 'timestamp', nullable: true })
    submitted_at?: Date;

    @Column({ type: 'timestamp', nullable: true })
    acknowledged_at?: Date;

    @Column({ type: 'boolean', default: false })
    is_disputed: boolean;

    @Column({ type: 'text', nullable: true })
    dispute_reason?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
