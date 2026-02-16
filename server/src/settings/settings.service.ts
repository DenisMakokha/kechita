import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../auth/entities/system-setting.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(SystemSetting)
        private settingRepo: Repository<SystemSetting>,
        private auditService: AuditService,
    ) { }

    async get(key: string): Promise<any> {
        const setting = await this.settingRepo.findOne({ where: { key } });
        return setting?.value ?? null;
    }

    async set(key: string, value: any, category?: string, description?: string): Promise<SystemSetting> {
        let setting = await this.settingRepo.findOne({ where: { key } });
        if (setting) {
            setting.value = value;
            if (category) setting.category = category;
            if (description) setting.description = description;
        } else {
            setting = this.settingRepo.create({ key, value, category, description });
        }
        const saved = await this.settingRepo.save(setting);
        this.auditService.logAction(undefined, AuditAction.UPDATE, 'SystemSetting', key, `Setting "${key}" updated`, { key, value, category }).catch(() => {});
        return saved;
    }

    async getByCategory(category: string): Promise<Record<string, any>> {
        const settings = await this.settingRepo.find({ where: { category } });
        const result: Record<string, any> = {};
        for (const s of settings) {
            result[s.key] = s.value;
        }
        return result;
    }

    async getAll(): Promise<SystemSetting[]> {
        return this.settingRepo.find({ order: { category: 'ASC', key: 'ASC' } });
    }

    async bulkSet(entries: { key: string; value: any; category?: string; description?: string }[]): Promise<SystemSetting[]> {
        const results: SystemSetting[] = [];
        for (const entry of entries) {
            results.push(await this.set(entry.key, entry.value, entry.category, entry.description));
        }
        return results;
    }

    async remove(key: string): Promise<{ message: string }> {
        const setting = await this.settingRepo.findOne({ where: { key } });
        if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
        await this.settingRepo.remove(setting);
        this.auditService.logAction(undefined, AuditAction.DELETE, 'SystemSetting', key, `Setting "${key}" deleted`).catch(() => {});
        return { message: `Setting "${key}" deleted` };
    }
}
