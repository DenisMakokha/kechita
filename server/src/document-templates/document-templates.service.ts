import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    DocumentTemplate, DocumentTemplateKind, DocumentTemplateScope,
} from './entities/document-template.entity';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto, PreviewTemplateDto } from './dto/document-template.dto';
import { TemplateRendererService } from './services/template-renderer.service';
import { PdfService } from './services/pdf.service';
import { buildSampleContext, getVariablesForKind } from './services/template-variables';

@Injectable()
export class DocumentTemplatesService {
    constructor(
        @InjectRepository(DocumentTemplate)
        private readonly repo: Repository<DocumentTemplate>,
        private readonly renderer: TemplateRendererService,
        private readonly pdf: PdfService,
    ) {}

    /** List with optional kind/scope filters. */
    list(filter: { kind?: DocumentTemplateKind; scope?: DocumentTemplateScope; activeOnly?: boolean } = {}) {
        const qb = this.repo.createQueryBuilder('t').orderBy('t.kind', 'ASC').addOrderBy('t.version', 'DESC');
        if (filter.kind) qb.andWhere('t.kind = :kind', { kind: filter.kind });
        if (filter.scope) qb.andWhere('t.scope = :scope', { scope: filter.scope });
        if (filter.activeOnly) qb.andWhere('t.is_active = true');
        return qb.getMany();
    }

    async findOne(id: string) {
        const t = await this.repo.findOne({ where: { id } });
        if (!t) throw new NotFoundException('Template not found');
        return t;
    }

    async create(data: CreateDocumentTemplateDto, userId?: string): Promise<DocumentTemplate> {
        const scope = data.scope || DocumentTemplateScope.GLOBAL;
        // Version = max + 1 across (kind, scope, scope_value)
        const existing = await this.repo.find({
            where: { kind: data.kind, scope, scope_value: data.scope_value ?? undefined as any },
            order: { version: 'DESC' },
            take: 1,
        });
        const nextVersion = (existing[0]?.version ?? 0) + 1;

        const tpl = this.repo.create({
            ...data,
            scope,
            version: nextVersion,
            is_active: false, // explicit activation required
            created_by: userId,
            updated_by: userId,
        });
        return this.repo.save(tpl);
    }

    async update(id: string, data: UpdateDocumentTemplateDto, userId?: string): Promise<DocumentTemplate> {
        const t = await this.findOne(id);
        Object.assign(t, data);
        t.updated_by = userId;
        return this.repo.save(t);
    }

    /**
     * Make this template the active one for its (kind, scope, scope_value).
     * Deactivates any previously active sibling. Idempotent.
     */
    async activate(id: string): Promise<DocumentTemplate> {
        const t = await this.findOne(id);
        await this.repo.createQueryBuilder()
            .update(DocumentTemplate)
            .set({ is_active: false })
            .where('kind = :kind AND scope = :scope', { kind: t.kind, scope: t.scope })
            .andWhere(t.scope_value ? 'scope_value = :sv' : 'scope_value IS NULL', { sv: t.scope_value })
            .andWhere('id <> :id', { id: t.id })
            .execute();
        t.is_active = true;
        return this.repo.save(t);
    }

    async remove(id: string) {
        const t = await this.findOne(id);
        if (t.is_active) {
            throw new BadRequestException('Cannot delete the active template. Activate another version first.');
        }
        await this.repo.remove(t);
    }

    /** Variable catalog for a kind (used by the editor sidebar). */
    getVariables(kind: DocumentTemplateKind) {
        return getVariablesForKind(kind);
    }

    /** Render preview HTML using either a saved template body or an override. */
    async previewHtml(dto: PreviewTemplateDto & { id?: string }): Promise<string> {
        let bodyHtml = dto.body_html;
        let kind = dto.kind;
        if (dto.id && !bodyHtml) {
            const t = await this.findOne(dto.id);
            bodyHtml = t.body_html;
            kind = t.kind;
        }
        if (!bodyHtml) throw new BadRequestException('body_html or template id is required');
        if (!kind) kind = DocumentTemplateKind.CUSTOM;
        const ctx = { ...buildSampleContext(kind), ...(dto.context || {}) };
        return this.renderer.render(bodyHtml, ctx);
    }

    /** Render PDF preview using sample data for a saved template. */
    async previewPdf(id: string): Promise<Buffer> {
        const t = await this.findOne(id);
        const ctx = buildSampleContext(t.kind);
        const bodyHtml = this.renderer.render(t.body_html, ctx);
        const headerHtml = t.header_html ? this.renderer.render(t.header_html, ctx) : undefined;
        const footerHtml = t.footer_html ? this.renderer.render(t.footer_html, ctx) : undefined;
        return this.pdf.renderPdf({
            bodyHtml,
            headerHtml,
            footerHtml,
            pageSize: t.page_size as any,
            margins: t.margins as any,
        });
    }

    /** Render PDF with a caller-supplied context (used by contracts/offer/JD services). */
    async renderPdfWithContext(id: string, context: Record<string, any>): Promise<Buffer> {
        const t = await this.findOne(id);
        const merged = { ...buildSampleContext(t.kind), ...context };
        const bodyHtml = this.renderer.render(t.body_html, merged);
        const headerHtml = t.header_html ? this.renderer.render(t.header_html, merged) : undefined;
        const footerHtml = t.footer_html ? this.renderer.render(t.footer_html, merged) : undefined;
        return this.pdf.renderPdf({
            bodyHtml,
            headerHtml,
            footerHtml,
            pageSize: t.page_size as any,
            margins: t.margins as any,
        });
    }

    /** Find the active template for a kind/scope/scope_value tuple. */
    findActive(kind: DocumentTemplateKind, scope: DocumentTemplateScope = DocumentTemplateScope.GLOBAL, scopeValue?: string) {
        return this.repo.findOne({
            where: { kind, scope, scope_value: scopeValue ?? (undefined as any), is_active: true },
        });
    }
}
