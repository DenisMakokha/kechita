import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { Candidate } from './candidate.entity';

@Entity('candidate_notes')
export class CandidateNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    content: string;

    @ManyToOne(() => Staff)
    @JoinColumn({ name: 'created_by_staff_id' })
    createdBy: Staff;

    @ManyToOne(() => Candidate, (candidate) => candidate.notes)
    @JoinColumn({ name: 'candidate_id' })
    candidate: Candidate;

    @CreateDateColumn()
    created_at: Date;
}
