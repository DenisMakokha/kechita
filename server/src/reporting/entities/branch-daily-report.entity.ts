import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Branch } from '../../org/entities/branch.entity';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('branch_daily_reports')
export class BranchDailyReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'date' })
    report_date: Date;

    @ManyToOne(() => Branch)
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'submitted_by_staff_id' })
    submittedBy: Staff;

    @Column({ default: 'draft' })
    status: string; // draft, submitted, approved, rejected

    @Column({ default: 0 })
    loans_new_count: number;

    @Column('decimal', { precision: 14, scale: 2, default: 0 })
    loans_disbursed_amount: number;

    @Column('decimal', { precision: 14, scale: 2, default: 0 })
    recoveries_amount: number;

    @Column('decimal', { precision: 14, scale: 2, default: 0 })
    arrears_collected: number;

    @Column('decimal', { precision: 14, scale: 2, default: 0 })
    prepayments_due: number;

    @Column('decimal', { precision: 14, scale: 2, default: 0 })
    par_amount: number;

    @Column('decimal', { precision: 5, scale: 2, default: 0 })
    par_ratio: number;

    @Column({ type: 'text', nullable: true })
    manager_comment: string;

    @Column({ type: 'text', nullable: true })
    rm_comment: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
