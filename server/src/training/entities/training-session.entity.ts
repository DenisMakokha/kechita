import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { TrainingProgram } from './training-program.entity';
import { TrainingEnrollment } from './training-enrollment.entity';

export enum SessionStatus {
    SCHEDULED = 'scheduled',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('training_sessions')
export class TrainingSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => TrainingProgram, (p) => p.sessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'program_id' })
    program: TrainingProgram;

    @Column({ type: 'uuid' })
    @Index()
    program_id: string;

    @Column()
    name: string;

    @Column({ type: 'date' })
    start_date: string;

    @Column({ type: 'date' })
    end_date: string;

    @Column({ nullable: true })
    location?: string;

    @Column({ nullable: true })
    facilitator?: string;

    @Column({ type: 'int', nullable: true })
    max_participants?: number;

    @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
    @Index()
    status: SessionStatus;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @OneToMany(() => TrainingEnrollment, (e) => e.session)
    enrollments: TrainingEnrollment[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
