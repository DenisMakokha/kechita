import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Staff } from './staff.entity';
import { Position } from '../../org/entities/position.entity';
import { Region } from '../../org/entities/region.entity';
import { Branch } from '../../org/entities/branch.entity';

@Entity('employment_history')
export class EmploymentHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff)
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @ManyToOne(() => Position, { nullable: true })
    @JoinColumn({ name: 'position_id' })
    position: Position;

    @ManyToOne(() => Region, { nullable: true })
    @JoinColumn({ name: 'region_id' })
    region: Region;

    @ManyToOne(() => Branch, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @Column({ default: 'full-time' })
    employment_type: string; // full-time, part-time, contract, intern

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date', nullable: true })
    end_date: Date;

    @Column({ nullable: true })
    change_reason: string;

    @CreateDateColumn()
    created_at: Date;
}
