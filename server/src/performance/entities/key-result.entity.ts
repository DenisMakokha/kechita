import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Goal } from './goal.entity';

export enum KeyResultType {
    NUMERIC = 'numeric',     // e.g., increase loan disbursement by 1M KES
    PERCENT = 'percent',
    BOOLEAN = 'boolean',     // done / not done
    MILESTONE = 'milestone',
}

@Entity('key_results')
export class KeyResult {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Goal, (g) => g.key_results, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'goal_id' })
    goal: Goal;

    @Column({ type: 'uuid' })
    @Index()
    goal_id: string;

    @Column()
    title: string;

    @Column({ type: 'enum', enum: KeyResultType, default: KeyResultType.NUMERIC })
    type: KeyResultType;

    @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
    target_value?: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
    current_value: number;

    @Column({ nullable: true })
    unit?: string; // KES, %, count, etc.

    @Column({ type: 'int', default: 0 })
    progress_percent: number;

    @Column({ type: 'boolean', default: false })
    is_completed: boolean;

    @Column({ type: 'date', nullable: true })
    completed_at?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
