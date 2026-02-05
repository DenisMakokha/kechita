import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Candidate } from './candidate.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum ReferenceCheckStatus {
    PENDING = 'pending',
    CONTACTED = 'contacted',
    COMPLETED = 'completed',
    UNREACHABLE = 'unreachable',
    DECLINED = 'declined',
}

@Entity('reference_checks')
export class ReferenceCheck {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Candidate, { eager: true })
    @JoinColumn({ name: 'candidate_id' })
    candidate: Candidate;

    // Reference contact
    @Column()
    reference_name: string;

    @Column({ nullable: true })
    reference_title?: string;

    @Column({ nullable: true })
    reference_company?: string;

    @Column()
    reference_email: string;

    @Column({ nullable: true })
    reference_phone?: string;

    @Column()
    relationship: string;

    @Column({ type: 'int', nullable: true })
    years_known?: number;

    // Status
    @Column({ type: 'enum', enum: ReferenceCheckStatus, default: ReferenceCheckStatus.PENDING })
    status: ReferenceCheckStatus;

    @Column({ default: 0 })
    contact_attempts: number;

    @Column({ type: 'timestamp', nullable: true })
    last_contact_attempt?: Date;

    // Responses (1-5 scale or text)
    @Column({ type: 'int', nullable: true })
    rating_work_quality?: number;

    @Column({ type: 'int', nullable: true })
    rating_reliability?: number;

    @Column({ type: 'int', nullable: true })
    rating_teamwork?: number;

    @Column({ type: 'int', nullable: true })
    rating_communication?: number;

    @Column({ type: 'int', nullable: true })
    rating_leadership?: number;

    @Column({ type: 'int', nullable: true })
    overall_rating?: number;

    @Column({ default: true })
    would_rehire: boolean;

    @Column({ type: 'text', nullable: true })
    strengths?: string;

    @Column({ type: 'text', nullable: true })
    areas_for_improvement?: string;

    @Column({ type: 'text', nullable: true })
    additional_comments?: string;

    @Column({ type: 'text', nullable: true })
    reason_for_leaving?: string;

    // Dates worked together
    @Column({ type: 'date', nullable: true })
    worked_from?: Date;

    @Column({ type: 'date', nullable: true })
    worked_to?: Date;

    // Verification
    @Column({ default: false })
    is_verified: boolean;

    @Column({ type: 'text', nullable: true })
    verification_notes?: string;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'contacted_by_id' })
    contactedBy?: Staff;

    @Column({ type: 'timestamp', nullable: true })
    completed_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

