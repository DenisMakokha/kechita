import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Staff } from './staff.entity';

export enum DependentRelationship {
    SPOUSE = 'spouse',
    CHILD = 'child',
    PARENT = 'parent',
    OTHER = 'other',
}

@Entity('staff_dependents')
export class Dependent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Index()
    @Column({ type: 'uuid' })
    staff_id: string;

    @Column()
    full_name: string;

    @Column({ type: 'enum', enum: DependentRelationship })
    relationship: DependentRelationship;

    @Column({ type: 'date', nullable: true })
    date_of_birth?: Date;

    @Column({ nullable: true })
    gender?: string;

    @Column({ nullable: true })
    national_id?: string;

    @Column({ type: 'boolean', default: true })
    medical_eligible: boolean;

    @Column({ type: 'boolean', default: false })
    is_disabled: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
