import {
    Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobDescription, JdStatus } from './entities/job-description.entity';
import { Position } from './entities/position.entity';
import { DocumentTemplatesService } from '../document-templates/document-templates.service';
import { DocumentTemplateKind, DocumentTemplateScope } from '../document-templates/entities/document-template.entity';

interface UpsertJdPayload {
    purpose?: string;
    notes?: string;
    responsibilities?: string[];
    qualifications?: string[];
    skills?: string[];
    kpis?: string[];
    reports_to?: string;
    working_conditions?: string;
    effective_from?: Date | string;
}

@Injectable()
export class JobDescriptionService {
    private readonly logger = new Logger(JobDescriptionService.name);

    constructor(
        @InjectRepository(JobDescription)
        private readonly jdRepo: Repository<JobDescription>,
        @InjectRepository(Position)
        private readonly positionRepo: Repository<Position>,
        private readonly templates: DocumentTemplatesService,
    ) {}

    /** All JDs for a position, newest version first. */
    listForPosition(positionId: string): Promise<JobDescription[]> {
        return this.jdRepo.find({
            where: { position_id: positionId },
            order: { version: 'DESC' },
        });
    }

    /** Currently-active JD for a position, or null. */
    findActiveForPosition(positionId: string): Promise<JobDescription | null> {
        return this.jdRepo.findOne({
            where: { position_id: positionId, is_active: true },
        });
    }

    async findOne(id: string): Promise<JobDescription> {
        const jd = await this.jdRepo.findOne({ where: { id }, relations: ['position'] });
        if (!jd) throw new NotFoundException('Job description not found');
        return jd;
    }

    /**
     * Create a new draft JD. Always starts inactive at version max+1 for
     * the target position. Activation is a separate explicit step so the
     * author can review before publishing.
     */
    async create(positionId: string, data: UpsertJdPayload, userId?: string): Promise<JobDescription> {
        const pos = await this.positionRepo.findOne({ where: { id: positionId } });
        if (!pos) throw new NotFoundException('Position not found');

        const last = await this.jdRepo.find({
            where: { position_id: positionId },
            order: { version: 'DESC' },
            take: 1,
        });
        const nextVersion = (last[0]?.version ?? 0) + 1;

        const jd = this.jdRepo.create({
            position_id: positionId,
            version: nextVersion,
            is_active: false,
            status: JdStatus.DRAFT,
            effective_from: data.effective_from ? new Date(data.effective_from) as any : undefined,
            purpose: data.purpose,
            notes: data.notes,
            responsibilities: data.responsibilities,
            qualifications: data.qualifications,
            skills: data.skills,
            kpis: data.kpis,
            reports_to: data.reports_to,
            working_conditions: data.working_conditions,
            supersedes_id: last[0]?.id,
            created_by: userId,
        });
        return this.jdRepo.save(jd);
    }

    /** Edit while still in DRAFT. Once approved/active, create a new version instead. */
    async update(id: string, data: UpsertJdPayload): Promise<JobDescription> {
        const jd = await this.findOne(id);
        if (jd.status !== JdStatus.DRAFT) {
            throw new BadRequestException(`Cannot edit a ${jd.status} JD — create a new version instead`);
        }
        Object.assign(jd, {
            ...data,
            effective_from: data.effective_from ? new Date(data.effective_from) as any : jd.effective_from,
        });
        return this.jdRepo.save(jd);
    }

    /**
     * Approve and activate a draft JD. Deactivates the previously-active
     * sibling (if any) and marks it RETIRED.
     */
    async activate(id: string, userId?: string): Promise<JobDescription> {
        const jd = await this.findOne(id);

        // Retire current active (if different)
        const current = await this.jdRepo.findOne({
            where: { position_id: jd.position_id, is_active: true },
        });
        if (current && current.id !== jd.id) {
            current.is_active = false;
            current.status = JdStatus.RETIRED;
            await this.jdRepo.save(current);
        }

        jd.is_active = true;
        jd.status = JdStatus.APPROVED;
        jd.approved_by = userId;
        jd.approved_at = new Date();
        if (!jd.effective_from) jd.effective_from = new Date() as any;
        return this.jdRepo.save(jd);
    }

    /** Soft-remove a draft. Approved/retired JDs cannot be deleted (audit trail). */
    async remove(id: string): Promise<void> {
        const jd = await this.findOne(id);
        if (jd.status !== JdStatus.DRAFT) {
            throw new BadRequestException('Only draft JDs can be deleted');
        }
        await this.jdRepo.remove(jd);
    }

    /**
     * Render the JD to PDF using the active `job_description` template.
     * Per-position template overrides win over the global default.
     */
    async renderPdf(id: string): Promise<{ buffer: Buffer; fileName: string }> {
        const jd = await this.findOne(id);

        // Pick a per-position template if HR authored one, otherwise the
        // global default seeded in Phase 1.
        let template = await this.templates.findActive(
            DocumentTemplateKind.JOB_DESCRIPTION,
            DocumentTemplateScope.PER_POSITION,
            jd.position_id,
        );
        if (!template) {
            template = await this.templates.findActive(
                DocumentTemplateKind.JOB_DESCRIPTION,
                DocumentTemplateScope.GLOBAL,
            );
        }
        if (!template) {
            throw new BadRequestException(
                'No active Job Description template found. Seed or activate one under Document Templates.',
            );
        }

        const ctx = this.buildJdContext(jd);
        const buffer = await this.templates.renderPdfWithContext(template.id, ctx);
        if (jd.template_id !== template.id) {
            jd.template_id = template.id;
            await this.jdRepo.save(jd);
        }
        const safe = (jd.position?.name || 'position').replace(/[^a-z0-9_-]/gi, '_');
        return { buffer, fileName: `JD_${safe}_v${jd.version}.pdf` };
    }

    private buildJdContext(jd: JobDescription): Record<string, any> {
        return {
            company: {
                name: 'Kechita Capital Limited',
                address: 'Nairobi, Kenya',
                phone: '+254 700 000 000',
                email: 'hr@kechita.co.ke',
            },
            jd: {
                position: jd.position?.name || '',
                purpose: jd.purpose || '',
                responsibilities: jd.responsibilities || [],
                qualifications: jd.qualifications || [],
                skills: jd.skills || [],
                kpis: jd.kpis || [],
                reports_to: jd.reports_to || '',
                working_conditions: jd.working_conditions || '',
                effective_from: jd.effective_from,
            },
        };
    }
}
