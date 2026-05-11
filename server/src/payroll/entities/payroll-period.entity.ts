import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { PayrollRun } from './payroll-run.entity';

export enum PayrollPeriodStatus {
    OPEN = 'open',
    LOCKED = 'locked',
    CLOSED = 'closed',
}

@Entity('payroll_periods')
@Index(['year', 'month'], { unique: true })
export class PayrollPeriod {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int' })
    year: number;

    @Column({ type: 'int' })
    month: number; // 1-12

    @Column({ type: 'date' })
    start_date: string;

    @Column({ type: 'date' })
    end_date: string;

    @Column({ type: 'date' })
    pay_date: string;

    @Column({ type: 'enum', enum: PayrollPeriodStatus, default: PayrollPeriodStatus.OPEN })
    @Index()
    status: PayrollPeriodStatus;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'uuid', nullable: true })
    closed_by_user_id?: string;

    @Column({ type: 'timestamp', nullable: true })
    closed_at?: Date;

    @OneToMany(() => PayrollRun, (run) => run.period)
    runs: PayrollRun[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
