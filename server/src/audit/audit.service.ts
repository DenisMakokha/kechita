import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
    userId?: string;
    staffId?: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    entityName?: string;
    description?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    requestUrl?: string;
    requestMethod?: string;
    isSuccessful?: boolean;
    errorMessage?: string;
}

export interface AuditLogFilter {
    userId?: string;
    staffId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    isSuccessful?: boolean;
    limit?: number;
    offset?: number;
}

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepo: Repository<AuditLog>,
    ) { }

    async log(data: CreateAuditLogDto): Promise<AuditLog> {
        const auditLog = this.auditLogRepo.create({
            user_id: data.userId,
            staff_id: data.staffId,
            action: data.action,
            entity_type: data.entityType,
            entity_id: data.entityId,
            entity_name: data.entityName,
            description: data.description,
            old_values: data.oldValues,
            new_values: data.newValues,
            metadata: data.metadata,
            ip_address: data.ipAddress,
            user_agent: data.userAgent,
            request_url: data.requestUrl,
            request_method: data.requestMethod,
            is_successful: data.isSuccessful ?? true,
            error_message: data.errorMessage,
        });

        return this.auditLogRepo.save(auditLog);
    }

    async logAction(
        userId: string | undefined,
        action: AuditAction,
        entityType: string,
        entityId: string | undefined,
        description: string,
        metadata?: Record<string, any>,
    ): Promise<AuditLog> {
        return this.log({
            userId,
            action,
            entityType,
            entityId,
            description,
            metadata,
        });
    }

    async findAll(filter: AuditLogFilter = {}): Promise<{ data: AuditLog[]; total: number }> {
        const queryBuilder = this.auditLogRepo.createQueryBuilder('audit')
            .leftJoinAndSelect('audit.user', 'user')
            .orderBy('audit.created_at', 'DESC');

        if (filter.userId) {
            queryBuilder.andWhere('audit.user_id = :userId', { userId: filter.userId });
        }

        if (filter.staffId) {
            queryBuilder.andWhere('audit.staff_id = :staffId', { staffId: filter.staffId });
        }

        if (filter.action) {
            queryBuilder.andWhere('audit.action = :action', { action: filter.action });
        }

        if (filter.entityType) {
            queryBuilder.andWhere('audit.entity_type = :entityType', { entityType: filter.entityType });
        }

        if (filter.entityId) {
            queryBuilder.andWhere('audit.entity_id = :entityId', { entityId: filter.entityId });
        }

        if (filter.startDate) {
            queryBuilder.andWhere('audit.created_at >= :startDate', { startDate: filter.startDate });
        }

        if (filter.endDate) {
            queryBuilder.andWhere('audit.created_at <= :endDate', { endDate: filter.endDate });
        }

        if (filter.isSuccessful !== undefined) {
            queryBuilder.andWhere('audit.is_successful = :isSuccessful', { isSuccessful: filter.isSuccessful });
        }

        const total = await queryBuilder.getCount();

        if (filter.limit) {
            queryBuilder.take(filter.limit);
        }

        if (filter.offset) {
            queryBuilder.skip(filter.offset);
        }

        const data = await queryBuilder.getMany();

        return { data, total };
    }

    async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
        return this.auditLogRepo.find({
            where: { entity_type: entityType, entity_id: entityId },
            relations: ['user'],
            order: { created_at: 'DESC' },
        });
    }

    async findByUser(userId: string, limit = 50): Promise<AuditLog[]> {
        return this.auditLogRepo.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
            take: limit,
        });
    }

    async getRecentActivity(limit = 20): Promise<AuditLog[]> {
        return this.auditLogRepo.find({
            relations: ['user'],
            order: { created_at: 'DESC' },
            take: limit,
        });
    }

    async getActivityStats(startDate: Date, endDate: Date): Promise<{
        totalActions: number;
        actionCounts: Record<string, number>;
        entityTypeCounts: Record<string, number>;
        failedActions: number;
    }> {
        const logs = await this.auditLogRepo.find({
            where: {
                created_at: Between(startDate, endDate),
            },
        });

        const actionCounts: Record<string, number> = {};
        const entityTypeCounts: Record<string, number> = {};
        let failedActions = 0;

        logs.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
            entityTypeCounts[log.entity_type] = (entityTypeCounts[log.entity_type] || 0) + 1;
            if (!log.is_successful) {
                failedActions++;
            }
        });

        return {
            totalActions: logs.length,
            actionCounts,
            entityTypeCounts,
            failedActions,
        };
    }

    async getLoginHistory(userId: string, limit = 10): Promise<AuditLog[]> {
        return this.auditLogRepo.find({
            where: {
                user_id: userId,
                action: AuditAction.LOGIN,
            },
            order: { created_at: 'DESC' },
            take: limit,
        });
    }

    async cleanOldLogs(retentionDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await this.auditLogRepo.delete({
            created_at: LessThanOrEqual(cutoffDate),
        });

        return result.affected || 0;
    }

    // ==================== EXPORT ====================

    async exportLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
        const { data } = await this.findAll({ ...filter, limit: 10000 });
        return data;
    }

    async getLogById(id: string): Promise<AuditLog> {
        const log = await this.auditLogRepo.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!log) {
            throw new Error('Audit log not found');
        }
        return log;
    }
}
