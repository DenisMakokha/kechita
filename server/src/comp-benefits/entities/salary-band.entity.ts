import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('salary_bands')
export class SalaryBand {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    code: string; // e.g., 'BAND_5', 'GRADE_C'

    @Column()
    name: string;

    @Column({ type: 'int', default: 0 })
    grade_level: number; // ordering, 1 = lowest

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    min_salary: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    midpoint_salary: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    max_salary: number;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
