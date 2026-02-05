import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Region } from '../../org/entities/region.entity';
import { Branch } from '../../org/entities/branch.entity';
import { Department } from '../../org/entities/department.entity';
import { Position } from '../../org/entities/position.entity';
import { StaffDocument } from './staff-document.entity';

export enum StaffStatus {
    ONBOARDING = 'onboarding',
    PROBATION = 'probation',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    RESIGNED = 'resigned',
    TERMINATED = 'terminated',
    EX_STAFF = 'ex-staff',
}

export enum ProbationStatus {
    NOT_APPLICABLE = 'not_applicable',
    IN_PROGRESS = 'in_progress',
    EXTENDED = 'extended',
    PASSED = 'passed',
    FAILED = 'failed',
}

export enum Gender {
    MALE = 'male',
    FEMALE = 'female',
    OTHER = 'other',
}

@Entity('staff')
export class Staff {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Employee Number (auto-generated or manual)
    @Column({ unique: true, nullable: true })
    employee_number?: string;

    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    // Personal Information
    @Column()
    first_name: string;

    @Column({ nullable: true })
    middle_name?: string;

    @Column()
    last_name: string;

    @Column({ type: 'enum', enum: Gender, nullable: true })
    gender?: Gender;

    @Column({ type: 'date', nullable: true })
    date_of_birth?: Date;

    @Column({ nullable: true })
    national_id?: string;

    @Column({ nullable: true })
    tax_pin?: string;

    @Column({ nullable: true })
    nssf_number?: string;

    @Column({ nullable: true })
    nhif_number?: string;

    // Contact Information
    @Column({ nullable: true })
    personal_email?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    alternate_phone?: string;

    @Column({ nullable: true })
    address?: string;

    @Column({ nullable: true })
    city?: string;

    @Column({ nullable: true })
    postal_code?: string;

    // Emergency Contact
    @Column({ nullable: true })
    emergency_contact_name?: string;

    @Column({ nullable: true })
    emergency_contact_phone?: string;

    @Column({ nullable: true })
    emergency_contact_relationship?: string;

    // Employment Information
    @ManyToOne(() => Region, { nullable: true })
    @JoinColumn({ name: 'region_id' })
    region?: Region;

    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch?: Branch;

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department?: Department;

    @ManyToOne(() => Position)
    @JoinColumn({ name: 'position_id' })
    position: Position;

    @Column({ type: 'enum', enum: StaffStatus, default: StaffStatus.ONBOARDING })
    status: StaffStatus;

    @Column({ type: 'date', nullable: true })
    hire_date?: Date;

    @Column({ type: 'date', nullable: true })
    confirmation_date?: Date;

    @Column({ type: 'date', nullable: true })
    termination_date?: Date;

    @Column({ nullable: true })
    termination_reason?: string;

    // Probation Tracking
    @Column({ type: 'date', nullable: true })
    probation_start_date?: Date;

    @Column({ type: 'date', nullable: true })
    probation_end_date?: Date;

    @Column({ type: 'int', default: 3 })
    probation_months: number;

    @Column({ type: 'enum', enum: ProbationStatus, default: ProbationStatus.NOT_APPLICABLE })
    probation_status: ProbationStatus;

    @Column({ nullable: true })
    probation_notes?: string;

    @Column({ type: 'date', nullable: true })
    probation_extended_until?: Date;

    // Manager/Reporting
    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'manager_id' })
    manager?: Staff;

    @OneToMany(() => Staff, (staff) => staff.manager)
    direct_reports?: Staff[];

    // Bank Details
    @Column({ nullable: true })
    bank_name?: string;

    @Column({ nullable: true })
    bank_branch?: string;

    @Column({ nullable: true })
    bank_account_number?: string;

    @Column({ nullable: true })
    bank_account_name?: string;

    // Salary Information
    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    basic_salary?: number;

    @Column({ default: 'KES' })
    salary_currency: string;

    // Documents
    @OneToMany(() => StaffDocument, (doc) => doc.staff)
    documents?: StaffDocument[];

    // Profile Photo
    @Column({ nullable: true })
    photo_url?: string;

    // Audit
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ nullable: true })
    created_by?: string;

    @Column({ nullable: true })
    updated_by?: string;

    // Computed/Virtual fields (handled in service)
    get full_name(): string {
        return `${this.first_name} ${this.middle_name || ''} ${this.last_name}`.replace(/\s+/g, ' ').trim();
    }

    get is_probationary(): boolean {
        return this.probation_status === ProbationStatus.IN_PROGRESS ||
            this.probation_status === ProbationStatus.EXTENDED;
    }
}
