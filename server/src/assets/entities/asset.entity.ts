import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { AssetAssignment } from './asset-assignment.entity';

export enum AssetCategory {
    LAPTOP = 'laptop',
    DESKTOP = 'desktop',
    MONITOR = 'monitor',
    PHONE = 'phone',
    SIM_CARD = 'sim_card',
    TABLET = 'tablet',
    MOTORBIKE = 'motorbike',
    VEHICLE = 'vehicle',
    FURNITURE = 'furniture',
    SAFETY_GEAR = 'safety_gear',
    UNIFORM = 'uniform',
    KEYS = 'keys',
    ACCESS_CARD = 'access_card',
    OTHER = 'other',
}

export enum AssetStatus {
    AVAILABLE = 'available',
    ASSIGNED = 'assigned',
    IN_REPAIR = 'in_repair',
    LOST = 'lost',
    DAMAGED = 'damaged',
    RETIRED = 'retired',
}

@Entity('assets')
export class Asset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    asset_tag: string; // e.g., 'KCH-LT-0042'

    @Column({ type: 'enum', enum: AssetCategory })
    category: AssetCategory;

    @Column()
    name: string;

    @Column({ nullable: true })
    brand?: string;

    @Column({ nullable: true })
    model?: string;

    @Column({ nullable: true })
    serial_number?: string;

    @Column({ type: 'date', nullable: true })
    purchase_date?: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    purchase_cost?: number;

    @Column({ nullable: true })
    supplier?: string;

    @Column({ type: 'date', nullable: true })
    warranty_until?: string;

    @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.AVAILABLE })
    @Index()
    status: AssetStatus;

    @Column({ type: 'uuid', nullable: true })
    branch_id?: string;

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @OneToMany(() => AssetAssignment, (a) => a.asset)
    assignments: AssetAssignment[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
