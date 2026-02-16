import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Department } from '../../org/entities/department.entity';
import { Region } from '../../org/entities/region.entity';
import { Branch } from '../../org/entities/branch.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { Position } from '../../org/entities/position.entity';
import { EducationLevel } from './screening-criteria.entity';

export enum JobStatus {
    DRAFT = 'draft',
    PENDING_APPROVAL = 'pending_approval',
    PUBLISHED = 'published',
    CLOSED = 'closed',
    ON_HOLD = 'on_hold',
    CANCELLED = 'cancelled',
}

export enum EmploymentType {
    FULL_TIME = 'full_time',
    PART_TIME = 'part_time',
    CONTRACT = 'contract',
    INTERNSHIP = 'internship',
    TEMPORARY = 'temporary',
}

export enum ExperienceLevel {
    ENTRY = 'entry',
    JUNIOR = 'junior',
    MID = 'mid',
    SENIOR = 'senior',
    LEAD = 'lead',
    EXECUTIVE = 'executive',
}

@Entity('job_posts')
export class JobPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    job_code: string;

    @Column()
    title: string;

    @ManyToOne(() => Position, { nullable: true })
    @JoinColumn({ name: 'position_id' })
    position: Position;

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @ManyToOne(() => Region, { nullable: true })
    @JoinColumn({ name: 'region_id' })
    region: Region;

    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
    status: JobStatus;

    @Column({ type: 'enum', enum: EmploymentType, default: EmploymentType.FULL_TIME })
    employment_type: EmploymentType;

    @Column({ type: 'enum', enum: ExperienceLevel, default: ExperienceLevel.MID })
    experience_level: ExperienceLevel;

    @Column({ type: 'int', nullable: true })
    min_experience_years: number;

    @Column({ type: 'int', nullable: true })
    max_experience_years: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    responsibilities: string;

    @Column({ type: 'text', nullable: true })
    requirements: string;

    @Column({ type: 'text', nullable: true })
    benefits: string;

    @Column('simple-array', { nullable: true })
    required_skills: string[];

    @Column('simple-array', { nullable: true })
    preferred_skills: string[];

    @Column({ type: 'text', nullable: true })
    education_requirements: string;

    // Salary
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    salary_min: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    salary_max: number;

    @Column({ default: 'KES' })
    salary_currency: string;

    @Column({ default: false })
    show_salary: boolean;

    // Vacancy info
    @Column({ type: 'int', default: 1 })
    vacancies: number;

    @Column({ type: 'int', default: 0 })
    filled_count: number;

    // Timeline
    @Column({ type: 'date', nullable: true })
    published_at: Date;

    @Column({ type: 'date', nullable: true })
    deadline: Date;

    @Column({ type: 'date', nullable: true })
    expected_start_date: Date;

    // Location
    @Column({ nullable: true })
    location: string;

    @Column({ default: false })
    is_remote: boolean;

    @Column({ default: false })
    is_hybrid: boolean;

    // Internal job posting (only visible to current employees)
    @Column({ default: false })
    is_internal_only: boolean;

    // Urgency & priority
    @Column({ default: false })
    is_urgent: boolean;

    @Column({ type: 'int', default: 0 })
    priority: number;

    // Application settings
    @Column({ default: true })
    requires_resume: boolean;

    @Column({ default: false })
    requires_cover_letter: boolean;

    @Column('simple-array', { nullable: true })
    custom_questions: string[];

    // ==================== ATS SCREENING CONFIGURATION ====================
    
    // Enable automatic screening
    @Column({ default: true })
    enable_auto_screening: boolean;

    // Minimum score percentage to pass screening (0-100)
    @Column({ type: 'int', default: 60 })
    min_screening_score: number;

    // Auto-reject applicants below minimum score
    @Column({ default: false })
    auto_reject_below_threshold: boolean;

    // Auto-shortlist applicants above this score
    @Column({ type: 'int', default: 80 })
    auto_shortlist_threshold: number;

    // Minimum education level required
    @Column({ type: 'enum', enum: EducationLevel, default: EducationLevel.ANY })
    min_education_level: EducationLevel;

    // Required certifications (comma-separated)
    @Column('simple-array', { nullable: true })
    required_certifications: string[];

    // Keywords to match in resume/cover letter
    @Column('simple-array', { nullable: true })
    screening_keywords: string[];

    // Weight distribution for scoring (must sum to 100)
    @Column({ type: 'int', default: 30 })
    weight_experience: number;

    @Column({ type: 'int', default: 15 })
    weight_education: number;

    @Column({ type: 'int', default: 30 })
    weight_skills: number;

    @Column({ type: 'int', default: 10 })
    weight_certifications: number;

    @Column({ type: 'int', default: 15 })
    weight_keywords: number;

    // Stats
    @Column({ type: 'int', default: 0 })
    views_count: number;

    @Column({ type: 'int', default: 0 })
    applications_count: number;

    // Creator/Owner
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'created_by_staff_id' })
    createdBy: Staff;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'hiring_manager_id' })
    hiringManager: Staff;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
