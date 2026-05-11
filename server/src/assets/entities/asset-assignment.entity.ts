import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Asset } from './asset.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum AssignmentStatus {
    ASSIGNED = 'assigned',
    RETURNED = 'returned',
    LOST = 'lost',
    DAMAGED_BY_STAFF = 'damaged_by_staff',
}

@Entity('asset_assignments')
export class AssetAssignment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Asset, (a) => a.assignments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'asset_id' })
    asset: Asset;

    @Column({ type: 'uuid' })
    @Index()
    asset_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'uuid' })
    @Index()
    staff_id: string;

    @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.ASSIGNED })
    status: AssignmentStatus;

    @Column({ type: 'date' })
    assigned_at: string;

    @Column({ type: 'date', nullable: true })
    returned_at?: string;

    @Column({ type: 'jsonb', nullable: true })
    condition_at_assignment?: { description: string; photos?: string[] };

    @Column({ type: 'jsonb', nullable: true })
    condition_at_return?: { description: string; photos?: string[] };

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    deduction_amount?: number; // charged to staff if lost/damaged

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'uuid', nullable: true })
    issued_by_user_id?: string;

    @Column({ type: 'uuid', nullable: true })
    received_by_user_id?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
