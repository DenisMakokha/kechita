import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToOne, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Region } from '../../org/entities/region.entity';
import { Branch } from '../../org/entities/branch.entity';
import { Department } from '../../org/entities/department.entity';
import { Position } from '../../org/entities/position.entity';
import { StaffDocument } from './staff-document.entity';
import { StaffEducation } from './staff-education.entity';
import { StaffWorkExperience } from './staff-work-experience.entity';
import { StaffSkill } from './staff-skill.entity';
import { StaffLanguage } from './staff-language.entity';
import { StaffAsset } from './staff-asset.entity';
import { StaffBankAccount } from './staff-bank-account.entity';

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

export enum MaritalStatus {
    SINGLE = 'single',
    MARRIED = 'married',
    DIVORCED = 'divorced',
    WIDOWED = 'widowed',
    SEPARATED = 'separated',
}

export enum Religion {
    CHRISTIAN = 'christian',
    MUSLIM = 'muslim',
    HINDU = 'hindu',
    BUDDHIST = 'buddhist',
    OTHER = 'other',
    PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum BloodGroup {
    A_POSITIVE = 'A+',
    A_NEGATIVE = 'A-',
    B_POSITIVE = 'B+',
    B_NEGATIVE = 'B-',
    AB_POSITIVE = 'AB+',
    AB_NEGATIVE = 'AB-',
    O_POSITIVE = 'O+',
    O_NEGATIVE = 'O-',
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

    @Column({ type: 'enum', enum: MaritalStatus, nullable: true })
    marital_status?: MaritalStatus;

    @Column({ type: 'enum', enum: Religion, nullable: true })
    religion?: Religion;

    @Column({ type: 'enum', enum: BloodGroup, nullable: true })
    blood_group?: BloodGroup;

    @Column({ nullable: true })
    nationality?: string;

    @Column({ nullable: true })
    place_of_birth?: string;

    @Column({ nullable: true })
    national_id?: string;

    @Column({ nullable: true })
    tax_pin?: string;

    @Column({ nullable: true })
    nssf_number?: string;

    @Column({ nullable: true })
    nhif_number?: string;

    @Column({ nullable: true })
    passport_number?: string;

    @Column({ type: 'date', nullable: true })
    passport_expiry?: Date;

    @Column({ default: false })
    has_disability: boolean;

    @Column({ type: 'text', nullable: true })
    disability_details?: string; // nature of disability, accommodations needed

    @Column({ type: 'int', nullable: true })
    completeness_score?: number; // 0-100 calculated field

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

    @Index()
    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch?: Branch;

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department?: Department;

    @ManyToOne(() => Position)
    @JoinColumn({ name: 'position_id' })
    position: Position;

    @Index()
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

    @Index()
    @Column({ type: 'date', nullable: true })
    probation_end_date?: Date;

    @Column({ type: 'int', default: 3 })
    probation_months: number;

    @Index()
    @Column({ type: 'enum', enum: ProbationStatus, default: ProbationStatus.NOT_APPLICABLE })
    probation_status: ProbationStatus;

    @Column({ nullable: true })
    probation_notes?: string;

    @Column({ type: 'date', nullable: true })
    probation_extended_until?: Date;

    // Manager/Reporting
    @Index()
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

    @OneToMany(() => StaffEducation, (edu) => edu.staff)
    education?: StaffEducation[];

    @OneToMany(() => StaffWorkExperience, (exp) => exp.staff)
    workExperience?: StaffWorkExperience[];

    @OneToMany(() => StaffSkill, (skill) => skill.staff)
    skills?: StaffSkill[];

    @OneToMany(() => StaffLanguage, (lang) => lang.staff)
    languages?: StaffLanguage[];

    @OneToMany(() => StaffAsset, (asset) => asset.staff)
    assets?: StaffAsset[];

    @OneToMany(() => StaffBankAccount, (acc) => acc.staff)
    bankAccounts?: StaffBankAccount[];

    // Profile Photo
    @Column({ nullable: true })
    photo_url?: string;

    // Audit
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at?: Date;

    @Column({ nullable: true })
    created_by?: string;

    @Column({ nullable: true })
    updated_by?: string;

    // Recruitment link (for hires from candidate pipeline)
    @Column({ type: 'uuid', nullable: true })
    @Index()
    application_id?: string;

    // Computed/Virtual fields (handled in service)
    get full_name(): string {
        return `${this.first_name} ${this.middle_name || ''} ${this.last_name}`.replace(/\s+/g, ' ').trim();
    }

    get is_probationary(): boolean {
        return this.probation_status === ProbationStatus.IN_PROGRESS ||
            this.probation_status === ProbationStatus.EXTENDED;
    }
}
