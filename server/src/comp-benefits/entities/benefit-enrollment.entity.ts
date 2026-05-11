import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { BenefitPlan } from './benefit-plan.entity';

export enum EnrollmentStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}

@Entity('benefit_enrollments')
@Unique(['staff_id', 'plan_id', 'effective_from'])
export class BenefitEnrollment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @ManyToOne(() => BenefitPlan, (p) => p.enrollments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'plan_id' })
    plan: BenefitPlan;

    @Column({ type: 'uuid' })
    plan_id: string;

    @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
    status: EnrollmentStatus;

    @Column({ type: 'date' })
    effective_from: string;

    @Column({ type: 'date', nullable: true })
    effective_to?: string;

    @Column({ type: 'jsonb', nullable: true })
    dependents?: Array<{ name: string; relationship: string; date_of_birth: string; id_number?: string }>;

    @Column({ nullable: true })
    member_number?: string; // assigned by provider

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
