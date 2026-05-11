import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { ReviewCycle } from './review-cycle.entity';
import { KeyResult } from './key-result.entity';

export enum GoalStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    AT_RISK = 'at_risk',
    COMPLETED = 'completed',
    MISSED = 'missed',
    CANCELLED = 'cancelled',
}

export enum GoalCategory {
    INDIVIDUAL = 'individual',
    TEAM = 'team',
    DEVELOPMENT = 'development',
    STRETCH = 'stretch',
}

@Entity('goals')
export class Goal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @ManyToOne(() => ReviewCycle, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'cycle_id' })
    cycle?: ReviewCycle;

    @Column({ type: 'uuid', nullable: true })
    cycle_id?: string;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'enum', enum: GoalCategory, default: GoalCategory.INDIVIDUAL })
    category: GoalCategory;

    @Column({ type: 'decimal', precision: 4, scale: 3, default: 0 })
    weight: number; // 0.000 - 1.000

    @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.DRAFT })
    @Index()
    status: GoalStatus;

    @Column({ type: 'int', default: 0 })
    progress_percent: number; // 0-100

    @Column({ type: 'date' })
    start_date: string;

    @Column({ type: 'date' })
    due_date: string;

    @Column({ type: 'date', nullable: true })
    completed_at?: string;

    @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
    final_rating?: number; // 1.00-5.00 at end of cycle

    @Column({ type: 'text', nullable: true })
    manager_comments?: string;

    @Column({ type: 'text', nullable: true })
    self_assessment?: string;

    @OneToMany(() => KeyResult, (kr) => kr.goal, { cascade: true })
    key_results: KeyResult[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
