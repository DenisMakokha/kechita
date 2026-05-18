import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { JobPost } from './job-post.entity';
// Enums live in a leaf module to avoid the circular import with job-post.entity.
// We re-export them so existing call sites keep working.
import { CriteriaType, EducationLevel, CriteriaImportance } from './recruitment-enums';
export { CriteriaType, EducationLevel, CriteriaImportance };

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
