import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Branch } from '../../org/entities/branch.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum FloatTier {
    SMALL = 'small',      // Small branch: 50,000
    MEDIUM = 'medium',    // Medium branch: 100,000
    LARGE = 'large',      // Large branch: 200,000
    HQ = 'hq',            // Headquarters: 500,000
}

export const FLOAT_TIER_LIMITS: Record<FloatTier, number> = {
    [FloatTier.SMALL]: 50000,
    [FloatTier.MEDIUM]: 100000,
    [FloatTier.LARGE]: 200000,
    [FloatTier.HQ]: 500000,
};

@Entity('petty_cash_floats')
export class PettyCashFloat {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Branch, { eager: true })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @Column({ type: 'enum', enum: FloatTier, default: FloatTier.MEDIUM })
    tier: FloatTier;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    current_balance: number;

    @Column('decimal', { precision: 12, scale: 2 })
    maximum_limit: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    minimum_threshold: number; // Trigger replenishment when below this

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'custodian_id' })
    custodian: Staff; // Person responsible for this float

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'date', nullable: true })
    last_reconciliation_date: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // Calculated
    get available_balance(): number {
        return Number(this.current_balance);
    }

    get needs_replenishment(): boolean {
        return Number(this.current_balance) <= Number(this.minimum_threshold);
    }
}
