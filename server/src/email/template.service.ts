import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EmailTemplateEntity, TemplateCategory, TemplateStatus } from './entities/email-template.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

export interface CreateTemplateDto {
    code: string;
    name: string;
    category: TemplateCategory;
    subject: string;
    html_content: string;
    text_content?: string;
    variables?: string[];
    description?: string;
}

export interface UpdateTemplateDto {
    name?: string;
    subject?: string;
    html_content?: string;
    text_content?: string;
    variables?: string[];
    status?: TemplateStatus;
    description?: string;
}

export interface TemplateFilter {
    category?: TemplateCategory;
    status?: TemplateStatus;
    search?: string;
}

@Injectable()
export class TemplateService {
    constructor(
        @InjectRepository(EmailTemplateEntity)
        private templateRepo: Repository<EmailTemplateEntity>,
        private auditService: AuditService,
    ) {}

    async findAll(filter?: TemplateFilter): Promise<EmailTemplateEntity[]> {
        const query = this.templateRepo.createQueryBuilder('template')
            .orderBy('template.category', 'ASC')
            .addOrderBy('template.name', 'ASC');

        if (filter?.category) {
            query.andWhere('template.category = :category', { category: filter.category });
        }

        if (filter?.status) {
            query.andWhere('template.status = :status', { status: filter.status });
        }

        if (filter?.search) {
            query.andWhere(
                '(template.name ILIKE :search OR template.code ILIKE :search OR template.subject ILIKE :search)',
                { search: `%${filter.search}%` }
            );
        }

        return query.getMany();
    }

    async findOne(id: string): Promise<EmailTemplateEntity> {
        const template = await this.templateRepo.findOne({ where: { id } });
        if (!template) throw new NotFoundException('Template not found');
        return template;
    }

    async findByCode(code: string): Promise<EmailTemplateEntity | null> {
        return this.templateRepo.findOne({
            where: { code, status: TemplateStatus.ACTIVE },
        });
    }

    async create(dto: CreateTemplateDto, userId?: string): Promise<EmailTemplateEntity> {
        // Check for duplicate code
        const existing = await this.templateRepo.findOne({ where: { code: dto.code } });
        if (existing) {
            throw new BadRequestException(`Template with code '${dto.code}' already exists`);
        }

        const template = this.templateRepo.create({
            ...dto,
            status: TemplateStatus.ACTIVE,
            is_system: false,
        });

        const saved = await this.templateRepo.save(template);

        await this.auditService.log({
            userId,
            action: AuditAction.CREATE,
            entityType: 'EmailTemplate',
            entityId: saved.id,
            description: `Email template created: ${saved.name} (${saved.code})`,
            isSuccessful: true,
        }).catch(() => {});

        return saved;
    }

    async update(id: string, dto: UpdateTemplateDto, userId?: string): Promise<EmailTemplateEntity> {
        const template = await this.findOne(id);

        if (template.is_system && dto.html_content) {
            // Allow editing system templates but log it
            await this.auditService.log({
                userId,
                action: AuditAction.UPDATE,
                entityType: 'EmailTemplate',
                entityId: id,
                description: `System email template modified: ${template.name}`,
                oldValues: { html_content: template.html_content },
                newValues: { html_content: dto.html_content },
                isSuccessful: true,
            }).catch(() => {});
        }

        Object.assign(template, dto);
        const saved = await this.templateRepo.save(template);

        if (!template.is_system) {
            await this.auditService.log({
                userId,
                action: AuditAction.UPDATE,
                entityType: 'EmailTemplate',
                entityId: id,
                description: `Email template updated: ${saved.name}`,
                isSuccessful: true,
            }).catch(() => {});
        }

        return saved;
    }

    async delete(id: string, userId?: string): Promise<void> {
        const template = await this.findOne(id);

        if (template.is_system) {
            throw new BadRequestException('Cannot delete system templates');
        }

        await this.templateRepo.remove(template);

        await this.auditService.log({
            userId,
            action: AuditAction.DELETE,
            entityType: 'EmailTemplate',
            entityId: id,
            description: `Email template deleted: ${template.name}`,
            isSuccessful: true,
        }).catch(() => {});
    }

    /**
     * Render template with variables
     */
    renderTemplate(template: EmailTemplateEntity, variables: Record<string, string>): {
        subject: string;
        html: string;
        text?: string;
    } {
        let subject = template.subject;
        let html = template.html_content;
        let text = template.text_content;

        // Replace variables in format {{variableName}}
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            subject = subject.replace(regex, value);
            html = html.replace(regex, value);
            if (text) text = text.replace(regex, value);
        }

        // Track usage
        this.trackUsage(template.id).catch(() => {});

        return { subject, html, text };
    }

    private async trackUsage(templateId: string): Promise<void> {
        await this.templateRepo.update(templateId, {
            usage_count: () => 'usage_count + 1',
            last_used_at: new Date(),
        });
    }

    /**
     * Get template categories
     */
    getCategories(): { value: TemplateCategory; label: string }[] {
        return [
            { value: TemplateCategory.GENERAL, label: 'General' },
            { value: TemplateCategory.AUTHENTICATION, label: 'Authentication' },
            { value: TemplateCategory.LEAVE, label: 'Leave Management' },
            { value: TemplateCategory.CLAIMS, label: 'Claims' },
            { value: TemplateCategory.LOANS, label: 'Loans' },
            { value: TemplateCategory.APPROVALS, label: 'Approvals' },
            { value: TemplateCategory.RECRUITMENT, label: 'Recruitment' },
            { value: TemplateCategory.SYSTEM, label: 'System' },
        ];
    }

    /**
     * Seed default templates
     */
    async seedDefaultTemplates(): Promise<void> {
        const defaults = this.getDefaultTemplates();

        for (const template of defaults) {
            const existing = await this.templateRepo.findOne({
                where: { code: template.code },
            });

            if (!existing) {
                await this.templateRepo.save({
                    ...template,
                    is_system: true,
                    status: TemplateStatus.ACTIVE,
                });
            }
        }
    }

    private getDefaultTemplates(): Partial<EmailTemplateEntity>[] {
        return [
            {
                code: 'welcome_email',
                name: 'Welcome Email',
                category: TemplateCategory.GENERAL,
                subject: 'Welcome to Kechita Capital!',
                html_content: `<h1>Welcome {{firstName}}!</h1><p>We're excited to have you on board.</p><p>Your role: {{role}}</p><a href="{{loginUrl}}">Access Portal</a>`,
                text_content: 'Welcome {{firstName}}! Access the portal at {{loginUrl}}',
                variables: ['firstName', 'role', 'loginUrl'],
            },
            {
                code: 'password_reset',
                name: 'Password Reset',
                category: TemplateCategory.AUTHENTICATION,
                subject: 'Password Reset Request',
                html_content: `<h1>Password Reset</h1><p>Hello {{firstName}},</p><p>Click <a href="{{resetUrl}}">here</a> to reset your password.</p><p>Expires in 24 hours.</p>`,
                text_content: 'Reset password: {{resetUrl}} (expires in 24h)',
                variables: ['firstName', 'resetUrl'],
            },
            {
                code: 'leave_approved',
                name: 'Leave Request Approved',
                category: TemplateCategory.LEAVE,
                subject: 'Leave Request Approved - {{leaveType}}',
                html_content: `<h1>Leave Approved ✓</h1><p>Hi {{firstName}},</p><p>Your {{leaveType}} from {{startDate}} to {{endDate}} has been approved.</p>`,
                variables: ['firstName', 'leaveType', 'startDate', 'endDate'],
            },
            {
                code: 'leave_rejected',
                name: 'Leave Request Rejected',
                category: TemplateCategory.LEAVE,
                subject: 'Leave Request Not Approved',
                html_content: `<h1>Leave Request Update</h1><p>Hi {{firstName}},</p><p>Your {{leaveType}} request was not approved.</p><p>Reason: {{reason}}</p>`,
                variables: ['firstName', 'leaveType', 'reason'],
            },
            {
                code: 'claim_approved',
                name: 'Expense Claim Approved',
                category: TemplateCategory.CLAIMS,
                subject: 'Claim Approved - {{amount}}',
                html_content: `<h1>Claim Approved ✓</h1><p>Hi {{firstName}},</p><p>Your claim for {{amount}} has been approved.</p>`,
                variables: ['firstName', 'amount'],
            },
            {
                code: 'loan_payment_due',
                name: 'Loan Payment Reminder',
                category: TemplateCategory.LOANS,
                subject: 'Payment Due: {{amount}} on {{dueDate}}',
                html_content: `<h1>Payment Reminder</h1><p>Hi {{firstName}},</p><p>Your loan payment of {{amount}} is due on {{dueDate}}.</p>`,
                variables: ['firstName', 'amount', 'dueDate'],
            },
            {
                code: 'approval_required',
                name: 'Approval Required',
                category: TemplateCategory.APPROVALS,
                subject: 'Action Required: {{requestType}} from {{requesterName}}',
                html_content: `<h1>Approval Required</h1><p>Hi {{firstName}},</p><p>{{requesterName}} submitted a {{requestType}} that requires your approval.</p><a href="{{approvalUrl}}">Review Request</a>`,
                variables: ['firstName', 'requestType', 'requesterName', 'approvalUrl'],
            },
        ];
    }
}
