import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Staff } from './staff.entity';
import { Document } from './document.entity';

export enum ContractType {
    PERMANENT = 'permanent',
    FIXED_TERM = 'fixed_term',
    PROBATION = 'probation',
    CASUAL = 'casual',
    INTERNSHIP = 'internship',
    CONSULTANCY = 'consultancy',
}

export enum ContractStatus {
    DRAFT = 'draft',
    PENDING_SIGNATURE = 'pending_signature',
    ACTIVE = 'active',
    EXPIRED = 'expired',
    TERMINATED = 'terminated',
    RENEWED = 'renewed',
    SUPERSEDED = 'superseded',
}

@Entity('staff_contracts')
export class StaffContract {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff)
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'enum', enum: ContractType, default: ContractType.PERMANENT })
    contract_type: ContractType;

    @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
    status: ContractStatus;

    @Column({ nullable: true })
    contract_number?: string;

    @Column({ nullable: true })
    title?: string;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date', nullable: true })
    end_date?: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    salary: number;

    @Column({ default: 'KES' })
    salary_currency: string;

    @Column({ nullable: true })
    job_title?: string;

    @Column({ type: 'text', nullable: true })
    terms?: string;

    @Column({ type: 'text', nullable: true })
    special_conditions?: string;

    // Notice period in days
    @Column({ type: 'int', default: 30 })
    notice_period_days: number;

    // Linked document (PDF of signed contract)
    @ManyToOne(() => Document, { nullable: true })
    @JoinColumn({ name: 'document_id' })
    document?: Document;

    @Column({ type: 'date', nullable: true })
    signed_date?: Date;

    @Column({ nullable: true })
    signed_by_staff?: string;

    @Column({ nullable: true })
    signed_by_employer?: string;

    // Renewal tracking
    @Column({ type: 'int', default: 0 })
    renewal_count: number;

    @Column({ type: 'date', nullable: true })
    renewal_reminder_date?: Date;

    @Column({ default: false })
    renewal_reminder_sent: boolean;

    // Termination
    @Column({ type: 'date', nullable: true })
    termination_date?: Date;

    @Column({ nullable: true })
    termination_reason?: string;

    @Column({ nullable: true })
    created_by?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    get is_expired(): boolean {
        if (!this.end_date) return false;
        return new Date(this.end_date) < new Date();
    }

    get days_remaining(): number | null {
        if (!this.end_date) return null;
        const diff = new Date(this.end_date).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
}
