import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Offer } from './offer.entity';
import { Candidate } from './candidate.entity';

export enum SignatureStatus {
    PENDING = 'pending',
    SIGNED = 'signed',
    DECLINED = 'declined',
    EXPIRED = 'expired',
}

@Entity('offer_signatures')
export class OfferSignature {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    signature_token: string; // Unique token for signing link

    @ManyToOne(() => Offer, { eager: true })
    @JoinColumn({ name: 'offer_id' })
    offer: Offer;

    @ManyToOne(() => Candidate, { eager: true })
    @JoinColumn({ name: 'candidate_id' })
    candidate: Candidate;

    @Column({ type: 'enum', enum: SignatureStatus, default: SignatureStatus.PENDING })
    status: SignatureStatus;

    // Signature capture
    @Column({ type: 'text', nullable: true })
    signature_data?: string; // Base64 encoded signature image

    @Column({ nullable: true })
    signature_type?: string; // 'drawn', 'typed', 'uploaded'

    @Column({ nullable: true })
    typed_name?: string; // If typed signature

    // Signing details
    @Column({ type: 'timestamp', nullable: true })
    signed_at?: Date;

    @Column({ nullable: true })
    signer_ip_address?: string;

    @Column({ nullable: true })
    signer_user_agent?: string;

    // Validity
    @Column({ type: 'timestamp' })
    expires_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    first_viewed_at?: Date;

    // If declined
    @Column({ type: 'text', nullable: true })
    decline_reason?: string;

    @Column({ type: 'timestamp', nullable: true })
    declined_at?: Date;

    // Audit
    @Column({ type: 'jsonb', nullable: true })
    audit_log?: Array<{
        action: string;
        timestamp: Date;
        ip_address?: string;
        details?: string;
    }>;

    @CreateDateColumn()
    created_at: Date;
}

