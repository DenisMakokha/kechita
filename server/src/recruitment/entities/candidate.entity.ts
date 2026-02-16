import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { PipelineStage } from './pipeline-stage.entity';
import { CandidateNote } from './candidate-note.entity';
import { EducationLevel } from './screening-criteria.entity';

export enum CandidateSource {
    CAREER_PAGE = 'career_page',
    LINKEDIN = 'linkedin',
    REFERRAL = 'referral',
    JOB_BOARD = 'job_board',
    AGENCY = 'agency',
    DIRECT = 'direct',
    INTERNAL = 'internal',
    OTHER = 'other',
}

export enum CandidateStatus {
    ACTIVE = 'active',
    HIRED = 'hired',
    REJECTED = 'rejected',
    WITHDRAWN = 'withdrawn',
    BLACKLISTED = 'blacklisted',
}

@Entity('candidates')
export class Candidate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    alternate_phone: string;

    // Location
    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    address: string;

    // Professional info
    @Column({ nullable: true })
    current_title: string;

    @Column({ nullable: true })
    current_company: string;

    @Column({ type: 'int', nullable: true })
    years_of_experience: number;

    @Column({ type: 'text', nullable: true })
    summary: string;

    // Skills & education
    @Column('simple-array', { nullable: true })
    skills: string[];

    @Column('simple-array', { nullable: true })
    certifications: string[];

    @Column({ type: 'text', nullable: true })
    education: string;

    @Column({ type: 'enum', enum: EducationLevel, default: EducationLevel.ANY })
    education_level: EducationLevel;

    @Column({ nullable: true })
    highest_qualification: string;

    // Work authorization
    @Column({ nullable: true })
    work_authorization: string;

    // Documents
    @Column({ nullable: true })
    resume_url: string;

    @Column({ nullable: true })
    resume_text: string; // Extracted text from resume for search/matching

    @Column({ nullable: true })
    cover_letter_url: string;

    @Column({ nullable: true })
    linkedin_url: string;

    @Column({ nullable: true })
    portfolio_url: string;

    @Column({ nullable: true })
    photo_url: string;

    // Source & tracking
    @Column({ type: 'enum', enum: CandidateSource, default: CandidateSource.CAREER_PAGE })
    source: CandidateSource;

    @Column({ nullable: true })
    referrer_name: string;

    @Column({ nullable: true })
    referrer_staff_id: string;

    // Status
    @Column({ type: 'enum', enum: CandidateStatus, default: CandidateStatus.ACTIVE })
    status: CandidateStatus;

    @ManyToOne(() => PipelineStage, { nullable: true })
    @JoinColumn({ name: 'current_stage_id' })
    currentStage: PipelineStage;

    // Salary expectations
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    expected_salary: number;

    @Column({ default: 'KES' })
    salary_currency: string;

    @Column({ nullable: true })
    notice_period_days: number;

    @Column({ nullable: true })
    available_from: Date;

    // Scoring (calculated by system or manual)
    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    overall_score: number; // 0-100

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    skill_match_score: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    experience_score: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    culture_fit_score: number;

    // Tags for easy filtering
    @Column('simple-array', { nullable: true })
    tags: string[];

    // Notes
    @Column({ type: 'text', nullable: true })
    internal_notes: string; // Legacy simple note

    @OneToMany(() => CandidateNote, (note) => note.candidate)
    notes: CandidateNote[];

    // GDPR
    @Column({ default: true })
    consent_given: boolean;

    @Column({ type: 'timestamp', nullable: true })
    consent_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    data_retention_until: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // Virtual field
    get full_name(): string {
        return `${this.first_name} ${this.last_name}`;
    }
}
