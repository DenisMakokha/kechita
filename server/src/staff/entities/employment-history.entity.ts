import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Staff } from './staff.entity';
import { Position } from '../../org/entities/position.entity';
import { Region } from '../../org/entities/region.entity';
import { Branch } from '../../org/entities/branch.entity';
import { Department } from '../../org/entities/department.entity';

@Entity('employment_history')
export class EmploymentHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
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

    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department: Department;

    @Column({ default: 'full-time' })
    employment_type: string; // full-time, part-time, contract, intern

    @Column({ default: 'initial' })
    change_type: string; // initial, promotion, transfer, demotion, lateral, salary_change

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    salary: number;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date', nullable: true })
    end_date: Date;

    @Column({ nullable: true })
    change_reason: string;

    @CreateDateColumn()
    created_at: Date;
}
