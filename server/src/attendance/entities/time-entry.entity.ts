import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { Shift } from './shift.entity';

export enum TimeEntryStatus {
    OPEN = 'open',           // clocked in, not yet clocked out
    COMPLETE = 'complete',   // clocked in and out
    AUTO_CLOSED = 'auto_closed', // system closed at end of day
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum ClockInMethod {
    MOBILE_GPS = 'mobile_gps',
    WEB = 'web',
    BIOMETRIC = 'biometric',
    MANUAL_ADMIN = 'manual_admin',
}

@Entity('time_entries')
@Unique(['staff_id', 'date'])
export class TimeEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @ManyToOne(() => Shift, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'shift_id' })
    shift?: Shift;

    @Column({ type: 'uuid', nullable: true })
    shift_id?: string;

    @Column({ type: 'date' })
    @Index()
    date: string;

    @Column({ type: 'timestamp' })
    clock_in_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    clock_out_at?: Date;

    @Column({ type: 'enum', enum: ClockInMethod, default: ClockInMethod.WEB })
    clock_in_method: ClockInMethod;

    @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
    clock_in_lat?: number;

    @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
    clock_in_lng?: number;

    @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
    clock_out_lat?: number;

    @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
    clock_out_lng?: number;

    @Column({ nullable: true })
    clock_in_ip?: string;

    @Column({ nullable: true })
    clock_out_ip?: string;

    @Column({ type: 'uuid', nullable: true })
    branch_id?: string; // branch the staff clocked in at

    @Column({ type: 'enum', enum: TimeEntryStatus, default: TimeEntryStatus.OPEN })
    @Index()
    status: TimeEntryStatus;

    @Column({ type: 'int', default: 0 })
    worked_minutes: number;

    @Column({ type: 'int', default: 0 })
    overtime_minutes: number;

    @Column({ type: 'int', default: 0 })
    late_minutes: number;

    @Column({ type: 'int', default: 0 })
    undertime_minutes: number;

    @Column({ type: 'boolean', default: false })
    is_holiday: boolean; // public holiday auto-detect

    @Column({ type: 'boolean', default: false })
    is_weekend: boolean;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'text', nullable: true })
    rejection_reason?: string;

    @Column({ type: 'uuid', nullable: true })
    approved_by_user_id?: string;

    @Column({ type: 'timestamp', nullable: true })
    approved_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
