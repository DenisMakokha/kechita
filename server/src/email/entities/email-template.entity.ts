import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum TemplateCategory {
    GENERAL = 'general',
    AUTHENTICATION = 'authentication',
    LEAVE = 'leave',
    CLAIMS = 'claims',
    LOANS = 'loans',
    APPROVALS = 'approvals',
    RECRUITMENT = 'recruitment',
    SYSTEM = 'system',
}

export enum TemplateStatus {
    ACTIVE = 'active',
    DRAFT = 'draft',
    ARCHIVED = 'archived',
}

@Entity('email_templates')
@Index(['code'])
@Index(['category'])
@Index(['status'])
export class EmailTemplateEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column({ type: 'enum', enum: TemplateCategory, default: TemplateCategory.GENERAL })
    category: TemplateCategory;

    @Column()
    subject: string;

    @Column({ type: 'text' })
    html_content: string;

    @Column({ type: 'text', nullable: true })
    text_content?: string;

    @Column({ type: 'simple-json', nullable: true })
    variables?: string[];

    @Column({ type: 'enum', enum: TemplateStatus, default: TemplateStatus.ACTIVE })
    status: TemplateStatus;

    @Column({ default: false })
    is_system: boolean;

    @Column({ nullable: true })
    description?: string;

    @Column({ type: 'int', default: 0 })
    usage_count: number;

    @Column({ nullable: true })
    last_used_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
