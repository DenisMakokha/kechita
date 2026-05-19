import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Staff } from './staff.entity';

export enum SkillProficiency {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
    EXPERT = 'expert',
}

export enum SkillCategory {
    TECHNICAL = 'technical',
    SOFT_SKILL = 'soft_skill',
    LANGUAGE = 'language',
    CERTIFICATION = 'certification',
    TOOL = 'tool',
    DOMAIN = 'domain',
    OTHER = 'other',
}

/**
 * Skills and certifications for a staff member.
 */
@Entity('staff_skills')
@Index(['staff_id', 'category'])
export class StaffSkill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    staff_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column()
    name: string; // e.g., "Python", "Project Management", "CPA (K)"

    @Column({ type: 'enum', enum: SkillCategory, default: SkillCategory.TECHNICAL })
    category: SkillCategory;

    @Column({ type: 'enum', enum: SkillProficiency, default: SkillProficiency.INTERMEDIATE })
    proficiency: SkillProficiency;

    @Column({ type: 'int', nullable: true })
    years_experience?: number;

    @Column({ nullable: true })
    certification_body?: string; // e.g., "ICPAK", "PMI"

    @Column({ type: 'date', nullable: true })
    date_acquired?: Date;

    @Column({ type: 'date', nullable: true })
    expiry_date?: Date; // for certifications that expire

    @Column({ nullable: true })
    certificate_number?: string;

    @Column({ nullable: true })
    document_url?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
