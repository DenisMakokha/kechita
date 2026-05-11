import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Staff } from './staff.entity';

@Entity('staff_next_of_kin')
export class NextOfKin {
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

    @Column()
    relationship: string; // 'spouse', 'parent', 'sibling', 'child', 'friend', 'other'

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    alternate_phone?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ nullable: true })
    national_id?: string;

    @Column({ type: 'text', nullable: true })
    address?: string;

    @Column({ type: 'boolean', default: false })
    is_primary: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    benefit_share_percent?: number; // for life insurance / gratuity allocation

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
