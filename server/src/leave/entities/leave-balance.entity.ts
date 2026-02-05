import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { LeaveType } from './leave-type.entity';

@Entity('leave_balances')
@Unique(['staff', 'leaveType', 'year'])
export class LeaveBalance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff)
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @ManyToOne(() => LeaveType)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType: LeaveType;

    @Column()
    year: number;

    // Current available balance
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    balance_days: number;

    // Total entitlement for the year
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    entitled_days: number;

    // Days carried forward from previous year
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    carried_forward: number;

    // Days accrued this year
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    accrued_days: number;

    // Days pending approval
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    pending_days: number;

    // Days already taken/approved
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    used_days: number;

    // Days that have expired (carry forward)
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    expired_days: number;

    // Adjustment (manual HR adjustments)
    @Column('decimal', { precision: 6, scale: 2, default: 0 })
    adjustment_days: number;

    @Column({ nullable: true })
    adjustment_reason?: string;

    @Column({ nullable: true })
    adjusted_by?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // Helper: Calculate total available
    get available_balance(): number {
        return Number(this.entitled_days) +
            Number(this.carried_forward) +
            Number(this.accrued_days) +
            Number(this.adjustment_days) -
            Number(this.used_days) -
            Number(this.pending_days) -
            Number(this.expired_days);
    }
}
