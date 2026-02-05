import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('claim_types')
export class ClaimType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string; // PER_DIEM, FUEL, MEDICAL, RELOCATION, AIR_TICKET, TRANSPORT, MEALS, ACCOMMODATION, MISC

    @Column()
    name: string;

    @Column({ nullable: true })
    description?: string;

    // Limits and policies
    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    max_amount_per_claim?: number;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    max_amount_per_month?: number;

    @Column('decimal', { precision: 12, scale: 2, nullable: true })
    max_amount_per_year?: number;

    // Requirements
    @Column({ default: false })
    requires_receipt: boolean;

    @Column({ default: false })
    requires_approval: boolean;

    @Column({ default: true })
    is_taxable: boolean;

    // Position/role restrictions
    @Column('simple-array', { nullable: true })
    eligible_position_codes?: string[];

    @Column('simple-array', { nullable: true })
    eligible_role_codes?: string[];

    // Display settings
    @Column({ nullable: true })
    icon?: string;

    @Column({ nullable: true })
    color?: string;

    @Column({ default: 0 })
    display_order: number;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
