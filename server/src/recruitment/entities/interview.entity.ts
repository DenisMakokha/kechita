import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable, Index } from 'typeorm';
import { Application } from './application.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum InterviewType {
    PHONE_SCREEN = 'phone_screen',
    VIDEO = 'video',
    IN_PERSON = 'in_person',
    PANEL = 'panel',
    TECHNICAL = 'technical',
    HR = 'hr',
    FINAL = 'final',
}

export enum InterviewStatus {
    SCHEDULED = 'scheduled',
    CONFIRMED = 'confirmed',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    RESCHEDULED = 'rescheduled',
    NO_SHOW = 'no_show',
}

export enum InterviewOutcome {
    PENDING = 'pending',
    STRONG_YES = 'strong_yes',
    YES = 'yes',
    MAYBE = 'maybe',
    NO = 'no',
    STRONG_NO = 'strong_no',
}

@Entity('interviews')
export class Interview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => Application)
    @JoinColumn({ name: 'application_id' })
    application: Application;

    @Column({ type: 'enum', enum: InterviewType, default: InterviewType.VIDEO })
    type: InterviewType;

    @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.SCHEDULED })
    status: InterviewStatus;

    @Column()
    title: string;

    // Scheduling
    @Index()
    @Column({ type: 'timestamp' })
    scheduled_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    ended_at: Date;

    @Column({ default: 60 })
    duration_minutes: number;

    @Column({ nullable: true })
    timezone: string;

    // Location
    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    room: string;

    @Column({ nullable: true })
    video_link: string;

    @Column({ nullable: true })
    meeting_id: string;

    @Column({ nullable: true })
    meeting_password: string;

    // Interviewers
    @ManyToMany(() => Staff)
    @JoinTable({
        name: 'interview_interviewers',
        joinColumn: { name: 'interview_id' },
        inverseJoinColumn: { name: 'staff_id' },
    })
    interviewers: Staff[];

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'lead_interviewer_id' })
    leadInterviewer: Staff;

    // Feedback & scoring
    @Column({ type: 'enum', enum: InterviewOutcome, default: InterviewOutcome.PENDING })
    outcome: InterviewOutcome;

    @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
    overall_rating: number; // 1.0 - 5.0

    @Column({ type: 'text', nullable: true })
    feedback: string;

    @Column({ type: 'text', nullable: true })
    strengths: string;

    @Column({ type: 'text', nullable: true })
    weaknesses: string;

    @Column({ type: 'jsonb', nullable: true })
    competency_scores: Record<string, number>; // { "communication": 4, "technical": 5 }

    // Interview questions/agenda
    @Column({ type: 'text', nullable: true })
    agenda: string;

    @Column({ type: 'jsonb', nullable: true })
    questions: { question: string; expected_answer?: string; actual_answer?: string; score?: number }[];

    // Candidate feedback
    @Column({ default: false })
    candidate_confirmed: boolean;

    @Column({ type: 'text', nullable: true })
    candidate_notes: string;

    // Reminders
    @Column({ default: true })
    send_reminder: boolean;

    @Column({ type: 'timestamp', nullable: true })
    reminder_sent_at: Date;

    // Calendar integration
    @Column({ nullable: true })
    calendar_event_id: string;

    // Creator
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'created_by_staff_id' })
    createdBy: Staff;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
