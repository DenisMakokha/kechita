import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';
import { Shift } from './shift.entity';

@Entity('roster_assignments')
@Unique(['staff_id', 'date'])
export class RosterAssignment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @ManyToOne(() => Shift, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'shift_id' })
    shift: Shift;

    @Column({ type: 'uuid' })
    shift_id: string;

    @Column({ type: 'date' })
    @Index()
    date: string;

    @Column({ type: 'boolean', default: false })
    is_day_off: boolean; // overrides shift if scheduled rest day

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
