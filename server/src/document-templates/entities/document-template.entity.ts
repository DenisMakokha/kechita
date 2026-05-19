import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Kinds of documents the engine can render. Each kind has its own variable
 * catalog (see TemplateContextService) and lives under a different scope.
 */
export enum DocumentTemplateKind {
    EMPLOYMENT_CONTRACT = 'employment_contract',
    OFFER_LETTER = 'offer_letter',
    JOB_DESCRIPTION = 'job_description',
    SALARY_INCREMENT = 'salary_increment',
    TRANSFER = 'transfer',
    WARNING = 'warning',
    CERTIFICATE_OF_SERVICE = 'certificate_of_service',
    CLEARANCE = 'clearance',
    CUSTOM = 'custom',
}

/**
 * Scope controls which subset of records a template applies to.
 * - GLOBAL: one template across the whole kind (e.g. one warning letter).
 * - PER_CONTRACT_TYPE: scope_value = 'permanent' | 'fixed_term' | ... so a
 *   probation contract picks a different template than a permanent one.
 * - PER_POSITION: scope_value = position.id, used for JD per position.
 */
export enum DocumentTemplateScope {
    GLOBAL = 'global',
    PER_CONTRACT_TYPE = 'per_contract_type',
    PER_POSITION = 'per_position',
}

export interface TemplatePageMargins {
    top: number;    // mm
    right: number;
    bottom: number;
    left: number;
}

@Entity('document_templates')
@Index(['kind', 'scope', 'scope_value', 'is_active'])
export class DocumentTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'enum', enum: DocumentTemplateKind })
    kind: DocumentTemplateKind;

    @Column({ type: 'enum', enum: DocumentTemplateScope, default: DocumentTemplateScope.GLOBAL })
    scope: DocumentTemplateScope;

    /**
     * Free-form discriminator inside the scope. For PER_CONTRACT_TYPE this
     * holds the contract_type string ('permanent', 'fixed_term', ...). For
     * PER_POSITION it holds the position.id. Null/empty for GLOBAL.
     */
    @Column({ nullable: true })
    scope_value?: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    /** Versions are immutable history. Only one is_active per (kind, scope, scope_value). */
    @Column({ type: 'int', default: 1 })
    version: number;

    @Column({ default: false })
    is_active: boolean;

    /** Main body HTML (output of TipTap WYSIWYG editor, contains Handlebars). */
    @Column({ type: 'text' })
    body_html: string;

    /** Optional repeated header on every PDF page (also Handlebars-templated). */
    @Column({ type: 'text', nullable: true })
    header_html?: string;

    /** Optional repeated footer on every PDF page (also Handlebars-templated). */
    @Column({ type: 'text', nullable: true })
    footer_html?: string;

    /**
     * Frozen snapshot of variables expected by the body, plus per-variable
     * sample values used for the editor preview. Shape:
     *   { key: string; label: string; group: string; sample: any }[]
     * Stored as JSONB so HR can update preview samples without code changes.
     */
    @Column({ type: 'jsonb', nullable: true })
    variables_schema?: Array<{ key: string; label: string; group?: string; sample?: any }>;

    @Column({ default: 'A4' })
    page_size: 'A4' | 'Letter';

    @Column({ type: 'jsonb', nullable: true })
    margins?: TemplatePageMargins;

    @Column({ nullable: true })
    created_by?: string;

    @Column({ nullable: true })
    updated_by?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
