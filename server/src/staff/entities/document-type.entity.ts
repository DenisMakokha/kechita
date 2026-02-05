import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

/**
 * DocumentType represents the types of documents that can be required for staff
 * Examples: ID Copy, CV, Contract, Academic Certificates, etc.
 */
@Entity('document_types')
export class DocumentType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ default: false })
    is_required: boolean;

    @Column({ default: false })
    has_expiry: boolean;

    @Column({ type: 'int', nullable: true })
    default_expiry_months: number;

    @Column({ type: 'int', default: 30 })
    reminder_days_before: number;

    // Category for grouping (e.g., 'personal', 'employment', 'academic', 'financial')
    @Column({ default: 'personal' })
    category: string;

    // Allowed file types (e.g., 'pdf,jpg,jpeg,png')
    @Column({ default: 'pdf,jpg,jpeg,png' })
    allowed_extensions: string;

    // Max file size in MB
    @Column({ type: 'int', default: 5 })
    max_size_mb: number;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'int', default: 0 })
    sort_order: number;

    @CreateDateColumn()
    created_at: Date;
}
