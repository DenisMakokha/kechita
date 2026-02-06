import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Region } from './region.entity';

@Entity('branches')
export class Branch {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Region, (region) => region.branches)
    @JoinColumn({ name: 'region_id' })
    region: Region;

    @Column()
    name: string;

    @Column({ unique: true })
    code: string;

    @Column({ type: 'text', nullable: true })
    address?: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    target_disbursement?: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    target_collection?: number;

    @Column({ type: 'int', nullable: true })
    target_clients?: number;

    @Column({ nullable: true })
    manager_id?: string;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
