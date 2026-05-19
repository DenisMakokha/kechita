import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Staff } from './staff.entity';

export enum EducationLevel {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    CERTIFICATE = 'certificate',
    DIPLOMA = 'diploma',
    BACHELORS = 'bachelors',
    MASTERS = 'masters',
    PHD = 'phd',
    OTHER = 'other',
}

/**
 * Academic qualifications for a staff member.
 */
@Entity('staff_education')
@Index(['staff_id', 'level'])
export class StaffEducation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    staff_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'enum', enum: EducationLevel })
    level: EducationLevel;

    @Column()
    institution: string;

    @Column()
    qualification: string; // e.g., "Bachelor of Commerce"

    @Column({ nullable: true })
    field_of_study?: string; // e.g., "Accounting"

    @Column({ type: 'date', nullable: true })
    start_date?: Date;

    @Column({ type: 'date', nullable: true })
    end_date?: Date;

    @Column({ nullable: true })
    grade?: string; // e.g., "First Class Honours", "3.5 GPA"

    @Column({ nullable: true })
    certificate_number?: string;

    @Column({ nullable: true })
    document_url?: string; // link to scanned certificate

    @Column({ default: false })
    is_verified: boolean;

    @Column({ nullable: true })
    verified_by?: string;

    @Column({ type: 'timestamptz', nullable: true })
    verified_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
