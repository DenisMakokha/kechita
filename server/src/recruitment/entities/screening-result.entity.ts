import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Application } from './application.entity';

export enum ScreeningStatus {
    PENDING = 'pending',
    PASSED = 'passed',
    FAILED = 'failed',
    MANUAL_REVIEW = 'manual_review',
}

export interface ScoreBreakdown {
    experience: { score: number; max: number; details: string };
    education: { score: number; max: number; details: string };
    skills: { score: number; max: number; matched: string[]; missing: string[] };
    certifications: { score: number; max: number; matched: string[]; missing: string[] };
    keywords: { score: number; max: number; matched: string[] };
    questions: { score: number; max: number; correct: number; total: number };
    salary: { score: number; max: number; details: string };
    total: number;
    maxPossible: number;
    percentage: number;
}

export interface KnockoutResult {
    criteriaId?: string;
    questionId?: string;
    type: 'criteria' | 'question';
    name: string;
    reason: string;
    candidateValue: string;
    requiredValue: string;
}

@Entity('screening_results')
export class ScreeningResult {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Application, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'application_id' })
    application: Application;

    @Column({ type: 'enum', enum: ScreeningStatus, default: ScreeningStatus.PENDING })
    status: ScreeningStatus;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    total_score: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    max_score: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    percentage: number;

    // Detailed score breakdown
    @Column({ type: 'jsonb', nullable: true })
    score_breakdown: ScoreBreakdown;

    // If failed, which knockout criteria/question caused it
    @Column({ type: 'jsonb', nullable: true })
    knockout_reasons: KnockoutResult[];

    // Candidate's answers to screening questions
    @Column({ type: 'jsonb', nullable: true })
    question_responses: Record<string, any>;

    // Notes from auto-screening
    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'timestamp', nullable: true })
    screened_at: Date;

    // If manually overridden
    @Column({ default: false })
    is_manual_override: boolean;

    @Column({ type: 'text', nullable: true })
    override_reason: string;

    @CreateDateColumn()
    created_at: Date;
}
