import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Position } from './position.entity';

/**
 * Lifecycle states for a Job Description. A position has many JDs across
 * its history, but only one is ACTIVE at a time (enforced by service-level
 * uniqueness on `position_id + is_active`).
 */
export enum JdStatus {
    DRAFT = 'draft',
    APPROVED = 'approved',
    RETIRED = 'retired',
}

/**
 * Structured, versioned Job Description attached to a Position.
 *
 * Why structured (vs. the free-text `position.description`)? — so the
 * recruitment `JobPost` can pre-fill from the active JD, contracts can
 * append the JD as an appendix, and HR can update responsibilities without
 * touching the org-chart Position itself.
 *
 * Why versioned? — so HR can show the history of role expectations over
 * time (essential for performance disputes and audit).
 */
@Entity('job_descriptions')
@Index(['position_id', 'is_active'])
@Index(['position_id', 'version'], { unique: true })
export class JobDescription {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    position_id: string;

    @ManyToOne(() => Position, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'position_id' })
    position: Position;

    /** Auto-incremented per position on create. */
    @Column({ type: 'int' })
    version: number;

    /** Only one row per position should have is_active = true. */
    @Column({ default: false })
    is_active: boolean;

    @Column({ type: 'enum', enum: JdStatus, default: JdStatus.DRAFT })
    status: JdStatus;

    /** When this version takes effect. Display-only; activation is via the flag. */
    @Column({ type: 'date', nullable: true })
    effective_from?: Date;

    /** Job purpose / scope (1-3 sentence summary). */
    @Column({ type: 'text', nullable: true })
    purpose?: string;

    /** Free-form (optional) — extra context not covered by the structured arrays. */
    @Column({ type: 'text', nullable: true })
    notes?: string;

    /** Structured array of responsibility statements (rendered as bullet list). */
    @Column({ type: 'jsonb', nullable: true })
    responsibilities?: string[];

    /** Required qualifications (degrees, certifications, years of experience…). */
    @Column({ type: 'jsonb', nullable: true })
    qualifications?: string[];

    /** Technical / soft skills. */
    @Column({ type: 'jsonb', nullable: true })
    skills?: string[];

    /** Key Performance Indicators / measurable outcomes. */
    @Column({ type: 'jsonb', nullable: true })
    kpis?: string[];

    /** Free-text override; otherwise the position.reports_to is used at render time. */
    @Column({ nullable: true })
    reports_to?: string;

    /** Working conditions, travel, on-call expectations, etc. */
    @Column({ type: 'text', nullable: true })
    working_conditions?: string;

    /** Optional link back to the JD that this version replaces. */
    @Column({ type: 'uuid', nullable: true })
    supersedes_id?: string;

    /** Optional link to the active `job_description` DocumentTemplate that should render this JD. */
    @Column({ type: 'uuid', nullable: true })
    template_id?: string;

    @Column({ nullable: true })
    created_by?: string;

    @Column({ nullable: true })
    approved_by?: string;

    @Column({ type: 'timestamptz', nullable: true })
    approved_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
