import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinaryCase, CaseStatus, DisciplinaryOutcome } from './entities/disciplinary-case.entity';

@Injectable()
export class DisciplinaryService {
    constructor(
        @InjectRepository(DisciplinaryCase) private repo: Repository<DisciplinaryCase>,
    ) {}

    private generateCaseNumber(): string {
        const year = new Date().getFullYear();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `DC-${year}-${rand}`;
    }

    async create(data: Partial<DisciplinaryCase>): Promise<DisciplinaryCase> {
        const c = this.repo.create({ ...data, case_number: this.generateCaseNumber(), status: CaseStatus.OPEN });
        return this.repo.save(c);
    }

    async list(filters?: { staff_id?: string; status?: CaseStatus; type?: string }): Promise<DisciplinaryCase[]> {
        const where: any = {};
        if (filters?.staff_id) where.staff_id = filters.staff_id;
        if (filters?.status) where.status = filters.status;
        if (filters?.type) where.type = filters.type;
        return this.repo.find({ where, relations: ['staff', 'raised_by'], order: { created_at: 'DESC' } });
    }

    async findOne(id: string): Promise<DisciplinaryCase> {
        const c = await this.repo.findOne({ where: { id }, relations: ['staff', 'raised_by'] });
        if (!c) throw new NotFoundException('Case not found');
        return c;
    }

    async update(id: string, data: Partial<DisciplinaryCase>): Promise<DisciplinaryCase> {
        const c = await this.findOne(id);
        Object.assign(c, data);
        return this.repo.save(c);
    }

    async scheduleHearing(id: string, date: string, location?: string, panel?: any[]): Promise<DisciplinaryCase> {
        const c = await this.findOne(id);
        c.hearing_date = date;
        c.hearing_location = location;
        if (panel) c.panel_members = panel;
        c.status = CaseStatus.HEARING_SCHEDULED;
        return this.repo.save(c);
    }

    async recordOutcome(id: string, outcome: DisciplinaryOutcome, notes: string, suspensionDays?: number): Promise<DisciplinaryCase> {
        const c = await this.findOne(id);
        c.outcome = outcome;
        c.outcome_notes = notes;
        c.outcome_date = new Date().toISOString().slice(0, 10);
        c.suspension_days = suspensionDays;
        c.status = CaseStatus.RESOLVED;
        // Auto-set warning expiry: 6 months for written, 12 months for final written
        if (outcome === DisciplinaryOutcome.WRITTEN_WARNING) {
            const exp = new Date();
            exp.setMonth(exp.getMonth() + 6);
            c.warning_expires_at = exp.toISOString().slice(0, 10);
        } else if (outcome === DisciplinaryOutcome.FINAL_WRITTEN_WARNING) {
            const exp = new Date();
            exp.setFullYear(exp.getFullYear() + 1);
            c.warning_expires_at = exp.toISOString().slice(0, 10);
        }
        return this.repo.save(c);
    }

    async appeal(id: string, reason: string): Promise<DisciplinaryCase> {
        const c = await this.findOne(id);
        if (c.status !== CaseStatus.RESOLVED) throw new BadRequestException('Can only appeal a resolved case');
        c.appealed = true;
        c.appeal_reason = reason;
        c.status = CaseStatus.APPEALED;
        return this.repo.save(c);
    }

    async close(id: string): Promise<DisciplinaryCase> {
        const c = await this.findOne(id);
        c.status = CaseStatus.CLOSED;
        return this.repo.save(c);
    }

    async getActiveWarnings(staffId: string): Promise<DisciplinaryCase[]> {
        const today = new Date().toISOString().slice(0, 10);
        return this.repo.createQueryBuilder('c')
            .where('c.staff_id = :staffId', { staffId })
            .andWhere('c.outcome IN (:...outcomes)', { outcomes: [DisciplinaryOutcome.VERBAL_WARNING, DisciplinaryOutcome.WRITTEN_WARNING, DisciplinaryOutcome.FINAL_WRITTEN_WARNING] })
            .andWhere('(c.warning_expires_at IS NULL OR c.warning_expires_at >= :today)', { today })
            .orderBy('c.outcome_date', 'DESC')
            .getMany();
    }

    async getStats() {
        const open = await this.repo.count({ where: { status: CaseStatus.OPEN } });
        const investigating = await this.repo.count({ where: { status: CaseStatus.UNDER_INVESTIGATION } });
        const hearings = await this.repo.count({ where: { status: CaseStatus.HEARING_SCHEDULED } });
        const resolved = await this.repo.count({ where: { status: CaseStatus.RESOLVED } });
        return { open, under_investigation: investigating, hearings_scheduled: hearings, resolved };
    }
}
