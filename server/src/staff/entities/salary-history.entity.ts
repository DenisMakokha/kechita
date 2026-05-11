import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { Staff } from './staff.entity';

export enum SalaryChangeType {
    INITIAL = 'initial',
    PROMOTION = 'promotion',
    ANNUAL_INCREMENT = 'annual_increment',
    MERIT_INCREASE = 'merit_increase',
    MARKET_ADJUSTMENT = 'market_adjustment',
    DEMOTION = 'demotion',
    CORRECTION = 'correction',
    OTHER = 'other',
}

@Entity('staff_salary_history')
export class SalaryHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Index()
    @Column({ type: 'uuid' })
    staff_id: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    previous_salary?: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    new_salary: number;

    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    change_percent?: number;

    @Column({ type: 'enum', enum: SalaryChangeType, default: SalaryChangeType.OTHER })
    change_type: SalaryChangeType;

    @Column({ type: 'date' })
    @Index()
    effective_date: string;

    @Column({ type: 'text', nullable: true })
    reason?: string;

    @Column({ type: 'uuid', nullable: true })
    approved_by?: string;

    @CreateDateColumn()
    created_at: Date;
}
