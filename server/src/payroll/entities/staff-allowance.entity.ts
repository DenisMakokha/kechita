import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

export enum AllowanceType {
    HOUSE = 'house',
    TRANSPORT = 'transport',
    AIRTIME = 'airtime',
    MEDICAL = 'medical',
    HARDSHIP = 'hardship',
    RESPONSIBILITY = 'responsibility',
    ACTING = 'acting',
    OTHER = 'other',
}

export enum AllowanceFrequency {
    MONTHLY = 'monthly',
    ONE_TIME = 'one_time',
}

@Entity('staff_allowances')
export class StaffAllowance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @Column()
    label: string;

    @Column({ type: 'enum', enum: AllowanceType, default: AllowanceType.OTHER })
    type: AllowanceType;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: AllowanceFrequency, default: AllowanceFrequency.MONTHLY })
    frequency: AllowanceFrequency;

    @Column({ type: 'boolean', default: true })
    taxable: boolean;

    @Column({ type: 'date' })
    effective_from: string;

    @Column({ type: 'date', nullable: true })
    effective_to?: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
