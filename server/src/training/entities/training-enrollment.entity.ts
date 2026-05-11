import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { TrainingSession } from './training-session.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum EnrollmentStatus {
    ENROLLED = 'enrolled',
    ATTENDED = 'attended',
    COMPLETED = 'completed',
    FAILED = 'failed',
    NO_SHOW = 'no_show',
    CANCELLED = 'cancelled',
}

@Entity('training_enrollments')
@Unique(['session_id', 'staff_id'])
export class TrainingEnrollment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => TrainingSession, (s) => s.enrollments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: TrainingSession;

    @Column({ type: 'uuid' })
    @Index()
    session_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ENROLLED })
    status: EnrollmentStatus;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    score?: number; // 0-100

    @Column({ type: 'int', nullable: true })
    rating?: number; // staff rating of training, 1-5

    @Column({ type: 'date', nullable: true })
    completed_at?: string;

    @Column({ type: 'date', nullable: true })
    certificate_issued_at?: string;

    @Column({ type: 'date', nullable: true })
    certificate_expires_at?: string;

    @Column({ nullable: true })
    certificate_url?: string;

    @Column({ type: 'text', nullable: true })
    feedback?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
