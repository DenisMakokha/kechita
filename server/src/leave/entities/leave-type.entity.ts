import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('leave_types')
export class LeaveType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string; // ANNUAL, SICK, MATERNITY, etc.

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ default: false })
    is_emergency: boolean;

    @Column({ default: false })
    allow_negative: boolean;

    @Column({ nullable: true })
    max_days_per_year?: number;

    // Accrual settings
    @Column({ default: false })
    is_accrued: boolean; // Whether leave accrues monthly

    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    monthly_accrual_rate?: number; // Days accrued per month if is_accrued is true

    // Carry forward settings
    @Column({ default: false })
    allow_carry_forward: boolean;

    @Column({ nullable: true })
    max_carry_forward_days?: number;

    @Column({ nullable: true })
    carry_forward_expiry_months?: number; // Months after year-end when carry forward expires

    // Gender-specific leaves
    @Column({ nullable: true })
    applicable_gender?: string; // 'male', 'female', or null for both

    // Probation restrictions
    @Column({ default: false })
    requires_confirmation: boolean; // Only confirmed staff can take this leave

    // Document requirements
    @Column({ default: false })
    requires_attachment: boolean;

    @Column({ nullable: true })
    min_days_before_request?: number; // Minimum days notice required

    // Display settings
    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'int', default: 0 })
    sort_order: number;

    @Column({ nullable: true })
    color?: string; // For calendar display

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
