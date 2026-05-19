import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { StaffContract } from './staff-contract.entity';

/**
 * Variation / amendment to an active contract. Doesn't replace the contract
 * itself (that's what `renew` does) — instead it captures an agreed change
 * such as salary increment, role change, working hours, etc.
 *
 * Each addendum is independently signed and stored as its own PDF. They
 * accumulate against a single contract, so the full record is the active
 * contract + all signed addendums in chronological order.
 */
export enum AddendumStatus {
    DRAFT = 'draft',
    PENDING_SIGNATURE = 'pending_signature',
    SIGNED = 'signed',
    VOID = 'void',
}

@Entity('staff_contract_addendums')
@Index(['contract_id', 'effective_date'])
export class StaffContractAddendum {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Plain uuid column (no relation to keep cross-module wiring simple). */
    @Column({ type: 'uuid' })
    contract_id: string;

    @ManyToOne(() => StaffContract, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contract_id' })
    contract: StaffContract;

    /** Sequential within a contract: 1, 2, 3, … (set on insert). */
    @Column({ type: 'int' })
    sequence: number;

    @Column()
    title: string;

    /** Free-text or HTML body explaining the variation. */
    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'date' })
    effective_date: Date;

    @Column({ type: 'enum', enum: AddendumStatus, default: AddendumStatus.DRAFT })
    status: AddendumStatus;

    // ===== Signature mirror of staff_contracts (Phase 2 e-signature) =====
    @Column({ type: 'text', nullable: true })
    signature_image?: string;

    @Column({ nullable: true })
    signed_by_staff?: string;

    @Column({ type: 'timestamptz', nullable: true })
    signed_date?: Date;

    @Column({ nullable: true })
    signed_ip?: string;

    @Column({ type: 'text', nullable: true })
    signed_user_agent?: string;

    @Column({ nullable: true, unique: true })
    signature_token?: string;

    @Column({ type: 'timestamptz', nullable: true })
    signature_token_expires_at?: Date;

    @Column({ nullable: true })
    created_by?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
