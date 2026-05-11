import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { TrainingSession } from './training-session.entity';

export enum TrainingType {
    INDUCTION = 'induction',
    COMPLIANCE = 'compliance',
    TECHNICAL = 'technical',
    SOFT_SKILLS = 'soft_skills',
    LEADERSHIP = 'leadership',
    PRODUCT = 'product',
    SAFETY = 'safety',
    OTHER = 'other',
}

export enum DeliveryMode {
    IN_PERSON = 'in_person',
    VIRTUAL = 'virtual',
    HYBRID = 'hybrid',
    SELF_PACED = 'self_paced',
}

@Entity('training_programs')
export class TrainingProgram {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    code: string;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'enum', enum: TrainingType, default: TrainingType.OTHER })
    type: TrainingType;

    @Column({ type: 'enum', enum: DeliveryMode, default: DeliveryMode.IN_PERSON })
    delivery_mode: DeliveryMode;

    @Column({ type: 'int', default: 0 })
    duration_hours: number;

    @Column({ type: 'jsonb', nullable: true })
    target_roles?: string[]; // role codes

    @Column({ type: 'jsonb', nullable: true })
    learning_objectives?: string[];

    @Column({ type: 'boolean', default: false })
    issues_certificate: boolean;

    @Column({ type: 'int', nullable: true })
    certificate_validity_months?: number; // null = no expiry

    @Column({ nullable: true })
    provider?: string; // internal or external vendor

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    cost_per_participant?: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'boolean', default: false })
    is_mandatory: boolean;

    @OneToMany(() => TrainingSession, (s) => s.program)
    sessions: TrainingSession[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
