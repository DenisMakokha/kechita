import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('public_holidays')
export class PublicHoliday {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'date' })
    date: Date;

    @Column()
    year: number;

    @Column({ default: false })
    is_recurring: boolean; // If true, applies every year on same date

    @Column({ nullable: true })
    description?: string;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
