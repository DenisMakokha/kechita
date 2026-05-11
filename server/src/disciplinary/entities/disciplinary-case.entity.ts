import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

export enum CaseType {
    DISCIPLINARY = 'disciplinary',
    GRIEVANCE = 'grievance',
}

export enum CaseSeverity {
    MINOR = 'minor',
    MODERATE = 'moderate',
    SERIOUS = 'serious',
    GROSS_MISCONDUCT = 'gross_misconduct',
}

export enum CaseStatus {
    OPEN = 'open',
    UNDER_INVESTIGATION = 'under_investigation',
    HEARING_SCHEDULED = 'hearing_scheduled',
    PENDING_DECISION = 'pending_decision',
    RESOLVED = 'resolved',
    APPEALED = 'appealed',
    CLOSED = 'closed',
    DISMISSED = 'dismissed',
}

export enum DisciplinaryOutcome {
    NO_ACTION = 'no_action',
    VERBAL_WARNING = 'verbal_warning',
    WRITTEN_WARNING = 'written_warning',
    FINAL_WRITTEN_WARNING = 'final_written_warning',
    SUSPENSION = 'suspension',
    DEMOTION = 'demotion',
    TERMINATION = 'termination',
    SUMMARY_DISMISSAL = 'summary_dismissal',
}

@Entity('disciplinary_cases')
export class DisciplinaryCase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    case_number: string;

    @Column({ type: 'enum', enum: CaseType, default: CaseType.DISCIPLINARY })
    type: CaseType;

    @ManyToOne(() => Staff, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @ManyToOne(() => Staff, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'raised_by_staff_id' })
    raised_by?: Staff;

    @Column({ type: 'uuid', nullable: true })
    raised_by_staff_id?: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'enum', enum: CaseSeverity, nullable: true })
    severity?: CaseSeverity;

    @Column({ type: 'enum', enum: CaseStatus, default: CaseStatus.OPEN })
    @Index()
    status: CaseStatus;

    @Column({ type: 'date' })
    incident_date: string;

    @Column({ type: 'date', nullable: true })
    hearing_date?: string;

    @Column({ nullable: true })
    hearing_location?: string;

    @Column({ type: 'enum', enum: DisciplinaryOutcome, nullable: true })
    outcome?: DisciplinaryOutcome;

    @Column({ type: 'text', nullable: true })
    outcome_notes?: string;

    @Column({ type: 'date', nullable: true })
    outcome_date?: string;

    @Column({ type: 'int', nullable: true })
    suspension_days?: number;

    @Column({ type: 'date', nullable: true })
    warning_expires_at?: string; // warnings typically expire after 6-12 months

    @Column({ type: 'jsonb', nullable: true })
    evidence?: Array<{ type: string; name: string; url?: string; uploaded_at: string }>;

    @Column({ type: 'jsonb', nullable: true })
    panel_members?: Array<{ staff_id: string; name: string; role: string }>;

    @Column({ type: 'boolean', default: false })
    appealed: boolean;

    @Column({ type: 'text', nullable: true })
    appeal_reason?: string;

    @Column({ type: 'text', nullable: true })
    appeal_outcome?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
