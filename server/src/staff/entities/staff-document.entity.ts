import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Staff } from './staff.entity';
import { Document } from './document.entity';
import { DocumentType } from './document-type.entity';

export enum StaffDocumentStatus {
    PENDING = 'pending',       // Awaiting upload
    UPLOADED = 'uploaded',     // Uploaded, pending verification
    VERIFIED = 'verified',     // Verified by HR
    REJECTED = 'rejected',     // Rejected, needs re-upload
    EXPIRED = 'expired',       // Document has expired
    EXPIRING_SOON = 'expiring_soon', // Will expire within reminder period
}

@Entity('staff_documents')
export class StaffDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @ManyToOne(() => Staff, (staff) => staff.documents)
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @ManyToOne(() => DocumentType, { nullable: true })
    @JoinColumn({ name: 'document_type_id' })
    documentType: DocumentType;

    @ManyToOne(() => Document, { nullable: true })
    @JoinColumn({ name: 'document_id' })
    document: Document;

    // Legacy field for backward compatibility
    @Column({ nullable: true })
    doc_type?: string;

    @Column({ type: 'enum', enum: StaffDocumentStatus, default: StaffDocumentStatus.PENDING })
    status: StaffDocumentStatus;

    @Index()
    @Column({ type: 'date', nullable: true })
    expiry_date?: Date;

    @Column({ type: 'date', nullable: true })
    issue_date?: Date;

    // Document reference number (e.g., ID number, certificate number)
    @Column({ nullable: true })
    reference_number?: string;

    // Notes from HR during verification
    @Column({ nullable: true })
    verification_notes?: string;

    @Column({ nullable: true })
    verified_by?: string;

    @Column({ type: 'timestamp', nullable: true })
    verified_at?: Date;

    @Column({ nullable: true })
    rejection_reason?: string;

    // Reminder settings
    @Column({ type: 'int', default: 30 })
    reminder_days_before: number;

    @Column({ default: false })
    reminder_sent_30_days: boolean;

    @Column({ default: false })
    reminder_sent_7_days: boolean;

    @Column({ default: false })
    reminder_sent_expired: boolean;

    // Audit
    @CreateDateColumn()
    uploaded_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ nullable: true })
    uploaded_by?: string;

    // Computed field helper
    get days_until_expiry(): number | null {
        if (!this.expiry_date) return null;
        const now = new Date();
        const expiry = new Date(this.expiry_date);
        const diff = expiry.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    get is_expired(): boolean {
        if (!this.expiry_date) return false;
        return new Date(this.expiry_date) < new Date();
    }
}
