import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Staff } from './staff.entity';

export enum ProbationRecommendation {
    CONFIRM = 'confirm',
    EXTEND = 'extend',
    TERMINATE = 'terminate',
    PENDING = 'pending',
}

@Entity('staff_probation_reviews')
export class ProbationReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Index()
    @Column({ type: 'uuid' })
    staff_id: string;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'reviewer_id' })
    reviewer?: Staff;

    @Column({ type: 'uuid', nullable: true })
    reviewer_id?: string;

    @Column({ type: 'date' })
    review_date: string;

    @Column({ type: 'int', nullable: true })
    overall_rating?: number; // 1-5

    @Column({ type: 'text', nullable: true })
    strengths?: string;

    @Column({ type: 'text', nullable: true })
    development_areas?: string;

    @Column({ type: 'text', nullable: true })
    manager_comments?: string;

    @Column({ type: 'text', nullable: true })
    employee_comments?: string;

    @Column({ type: 'enum', enum: ProbationRecommendation, default: ProbationRecommendation.PENDING })
    recommendation: ProbationRecommendation;

    @Column({ type: 'date', nullable: true })
    extended_until?: string;

    @Column({ type: 'boolean', default: false })
    acknowledged_by_employee: boolean;

    @Column({ type: 'timestamp', nullable: true })
    acknowledged_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
