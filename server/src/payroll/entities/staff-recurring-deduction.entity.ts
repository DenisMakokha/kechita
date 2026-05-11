import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

export enum DeductionType {
    SACCO = 'sacco',
    PENSION = 'pension',
    INSURANCE = 'insurance',
    UNION = 'union',
    WELFARE = 'welfare',
    GARNISHMENT = 'garnishment',
    OTHER = 'other',
}

@Entity('staff_recurring_deductions')
export class StaffRecurringDeduction {
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

    @Column({ type: 'enum', enum: DeductionType, default: DeductionType.OTHER })
    type: DeductionType;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'boolean', default: false })
    tax_relievable: boolean; // pension contributions are tax-relievable up to a cap

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
