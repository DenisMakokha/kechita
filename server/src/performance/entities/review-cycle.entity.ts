import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { Review } from './review.entity';

export enum ReviewCycleType {
    ANNUAL = 'annual',
    BIANNUAL = 'biannual',
    QUARTERLY = 'quarterly',
    PROBATION = 'probation',
    AD_HOC = 'ad_hoc',
}

export enum ReviewCycleStatus {
    DRAFT = 'draft',
    SELF_REVIEW = 'self_review',
    MANAGER_REVIEW = 'manager_review',
    PEER_REVIEW = 'peer_review',
    MODERATION = 'moderation',
    FINALIZED = 'finalized',
    CLOSED = 'closed',
}

@Entity('review_cycles')
export class ReviewCycle {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string; // e.g., "2026 Annual Performance Review"

    @Column({ type: 'enum', enum: ReviewCycleType, default: ReviewCycleType.ANNUAL })
    type: ReviewCycleType;

    @Column({ type: 'enum', enum: ReviewCycleStatus, default: ReviewCycleStatus.DRAFT })
    @Index()
    status: ReviewCycleStatus;

    @Column({ type: 'date' })
    period_start: string;

    @Column({ type: 'date' })
    period_end: string;

    @Column({ type: 'date' })
    self_review_due: string;

    @Column({ type: 'date' })
    manager_review_due: string;

    @Column({ type: 'date', nullable: true })
    peer_review_due?: string;

    @Column({ type: 'boolean', default: false })
    include_peer_reviews: boolean;

    @Column({ type: 'boolean', default: false })
    include_360: boolean; // self + manager + peers + direct reports

    @Column({ type: 'jsonb', nullable: true })
    competency_framework?: Array<{
        code: string;
        name: string;
        description?: string;
        weight: number; // 0-1
    }>;

    @Column({ type: 'text', nullable: true })
    instructions?: string;

    @Column({ type: 'uuid', nullable: true })
    created_by_user_id?: string;

    @OneToMany(() => Review, (r) => r.cycle)
    reviews: Review[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
