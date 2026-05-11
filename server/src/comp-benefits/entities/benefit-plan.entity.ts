import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { BenefitEnrollment } from './benefit-enrollment.entity';

export enum BenefitType {
    MEDICAL = 'medical',
    DENTAL = 'dental',
    OPTICAL = 'optical',
    LIFE = 'life',
    DISABILITY = 'disability',
    PENSION = 'pension',
    GROUP_PERSONAL_ACCIDENT = 'gpa',
    GRATUITY = 'gratuity',
    EDUCATION = 'education',
    OTHER = 'other',
}

@Entity('benefit_plans')
export class BenefitPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    code: string;

    @Column()
    name: string;

    @Column({ type: 'enum', enum: BenefitType })
    type: BenefitType;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ nullable: true })
    provider?: string; // e.g., 'AAR', 'Jubilee', 'Britam'

    @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
    annual_premium_employer?: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
    annual_premium_employee?: number;

    @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
    coverage_amount?: number;

    @Column({ type: 'boolean', default: true })
    includes_dependents: boolean;

    @Column({ type: 'int', nullable: true })
    max_dependents?: number;

    @Column({ type: 'jsonb', nullable: true })
    eligibility_criteria?: { min_tenure_months?: number; bands?: string[]; roles?: string[] };

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @OneToMany(() => BenefitEnrollment, (e) => e.plan)
    enrollments: BenefitEnrollment[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
