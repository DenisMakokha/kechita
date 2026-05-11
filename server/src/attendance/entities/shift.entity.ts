import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('shifts')
export class Shift {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    code: string; // e.g., 'MORNING', 'AFTERNOON', 'NIGHT'

    @Column()
    name: string;

    @Column({ type: 'time' })
    start_time: string; // '08:00:00'

    @Column({ type: 'time' })
    end_time: string;

    @Column({ type: 'int', default: 60 })
    break_minutes: number;

    @Column({ type: 'int', default: 5 })
    grace_minutes: number; // late grace period

    @Column({ type: 'boolean', default: false })
    is_night_shift: boolean;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
