import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Staff } from './staff.entity';

export enum AssetStatus {
    ASSIGNED = 'assigned',
    RETURNED = 'returned',
    DAMAGED = 'damaged',
    LOST = 'lost',
}

export enum AssetCategory {
    ELECTRONICS = 'electronics',
    FURNITURE = 'furniture',
    VEHICLE = 'vehicle',
    TOOL = 'tool',
    UNIFORM = 'uniform',
    ACCESS_CARD = 'access_card',
    OTHER = 'other',
}

/**
 * Company assets assigned to a staff member.
 */
@Entity('staff_assets')
@Index(['staff_id', 'status'])
export class StaffAsset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    staff_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column()
    asset_name: string;

    @Column({ type: 'enum', enum: AssetCategory })
    category: AssetCategory;

    @Column({ nullable: true })
    asset_code?: string; // company asset tag/barcode

    @Column({ nullable: true })
    serial_number?: string;

    @Column({ nullable: true })
    model?: string;

    @Column({ nullable: true })
    manufacturer?: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    value?: number;

    @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ASSIGNED })
    status: AssetStatus;

    @Column({ type: 'date' })
    assigned_date: Date;

    @Column({ type: 'date', nullable: true })
    expected_return_date?: Date;

    @Column({ type: 'date', nullable: true })
    returned_date?: Date;

    @Column({ type: 'text', nullable: true })
    condition_notes?: string;

    @Column({ nullable: true })
    assigned_by?: string;

    @Column({ nullable: true })
    returned_to?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
