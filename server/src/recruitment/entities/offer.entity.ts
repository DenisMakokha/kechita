import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Application } from './application.entity';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('offers')
export class Offer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => Application)
    @JoinColumn({ name: 'application_id' })
    application: Application;

    @Column({ default: 'draft' })
    status: string; // draft, pending_approval, approved, sent, accepted, rejected

    @Column({ type: 'uuid', nullable: true })
    template_id: string;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    offered_salary: number;

    @Column({ nullable: true })
    currency: string;

    @Column({ type: 'date', nullable: true })
    start_date: Date;

    @Column({ nullable: true })
    file_url: string;

    @Column({ type: 'date', nullable: true })
    expiration_date: Date;

    @Column({ type: 'int', nullable: true, default: 3 })
    probation_months: number;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'created_by_staff_id' })
    createdBy: Staff;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'approved_by_staff_id' })
    approvedBy: Staff;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
