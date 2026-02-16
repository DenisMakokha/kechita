import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { JobPost } from './job-post.entity';

export enum CriteriaType {
    EXPERIENCE_YEARS = 'experience_years',
    EDUCATION_LEVEL = 'education_level',
    SKILL_REQUIRED = 'skill_required',
    CERTIFICATION = 'certification',
    KEYWORD = 'keyword',
    LOCATION = 'location',
    SALARY_EXPECTATION = 'salary_expectation',
    AVAILABILITY = 'availability',
    WORK_AUTHORIZATION = 'work_authorization',
}

export enum EducationLevel {
    HIGH_SCHOOL = 'high_school',
    DIPLOMA = 'diploma',
    BACHELORS = 'bachelors',
    MASTERS = 'masters',
    PHD = 'phd',
    ANY = 'any',
}

export enum CriteriaImportance {
    KNOCKOUT = 'knockout',       // Must meet - auto-reject if not met
    REQUIRED = 'required',       // Strongly required - heavy score penalty if not met
    PREFERRED = 'preferred',     // Nice to have - bonus points if met
}

@Entity('screening_criteria')
export class ScreeningCriteria {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'job_post_id' })
    jobPost: JobPost;

    @Column({ type: 'enum', enum: CriteriaType })
    type: CriteriaType;

    @Column({ type: 'enum', enum: CriteriaImportance, default: CriteriaImportance.REQUIRED })
    importance: CriteriaImportance;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    // Value depends on type:
    // - experience_years: "3" (minimum years)
    // - education_level: "bachelors"
    // - skill_required/certification/keyword: skill name
    // - salary_expectation: "50000-80000" (range)
    @Column()
    value: string;

    // Points awarded/deducted for this criteria
    @Column({ type: 'int', default: 10 })
    weight: number;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'int', default: 0 })
    display_order: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
