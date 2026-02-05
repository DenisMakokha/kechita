import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Document represents an uploaded file stored in the system
 * This is the actual file record, linked to staff via StaffDocument
 */
@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Storage path (local) or S3 key (cloud)
    @Column()
    storage_key: string;

    // Original filename
    @Column()
    original_name: string;

    // Stored filename (may be different due to UUID naming)
    @Column()
    stored_name: string;

    @Column({ nullable: true })
    mime_type: string;

    @Column('bigint', { nullable: true })
    size_bytes: number;

    // Storage provider: 'local' | 's3' | 'azure' | etc.
    @Column({ default: 'local' })
    storage_provider: string;

    // Full URL if publicly accessible
    @Column({ nullable: true })
    public_url: string;

    // Checksum for integrity verification
    @Column({ nullable: true })
    checksum: string;

    // Metadata as JSON
    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    // Who uploaded
    @Column({ nullable: true })
    uploaded_by: string;

    @CreateDateColumn()
    created_at: Date;
}
