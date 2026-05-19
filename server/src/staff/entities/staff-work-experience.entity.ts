import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Staff } from './staff.entity';

/**
 * Previous employment history (before joining current organization).
 */
@Entity('staff_work_experience')
@Index(['staff_id', 'start_date'])
export class StaffWorkExperience {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    staff_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column()
    employer_name: string;

    @Column()
    job_title: string;

    @Column({ nullable: true })
    department?: string;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date', nullable: true })
    end_date?: Date;

    @Column({ default: false })
    is_current: boolean; // if they were still there when hired

    @Column({ type: 'text', nullable: true })
    responsibilities?: string;

    @Column({ nullable: true })
    reason_for_leaving?: string;

    @Column({ nullable: true })
    contact_person?: string; // for reference checks

    @Column({ nullable: true })
    contact_phone?: string;

    @Column({ nullable: true })
    contact_email?: string;

    @Column({ default: false })
    is_verified: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
