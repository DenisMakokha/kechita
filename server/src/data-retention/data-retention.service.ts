import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { StaffLoanRepayment, RepaymentStatus } from '../loans/entities/staff-loan-repayment.entity';
import { PettyCashTransaction, TransactionStatus } from '../petty-cash/entities/petty-cash-transaction.entity';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

export interface RetentionPolicy {
    entityType: string;
    retentionDays: number;
    archiveTable?: string;
    archiveEnabled: boolean;
}

export interface ArchiveResult {
    entityType: string;
    archivedCount: number;
    errors?: string[];
}

@Injectable()
export class DataRetentionService {
    private readonly logger = new Logger(DataRetentionService.name);

    // Default retention policies
    private readonly defaultPolicies: RetentionPolicy[] = [
        { entityType: 'AuditLog', retentionDays: 365, archiveEnabled: true },          // 1 year
        { entityType: 'PettyCashTransaction', retentionDays: 2555, archiveEnabled: true }, // 7 years (financial)
        { entityType: 'StaffLoanRepayment', retentionDays: 2555, archiveEnabled: true },  // 7 years (financial)
    ];

    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepo: Repository<AuditLog>,
        @InjectRepository(PettyCashTransaction)
        private pettyCashTxnRepo: Repository<PettyCashTransaction>,
        @InjectRepository(StaffLoanRepayment)
        private loanRepaymentRepo: Repository<StaffLoanRepayment>,
        private settingsService: SettingsService,
        private auditService: AuditService,
        private dataSource: DataSource,
    ) {}

    /**
     * Get current retention policies (from settings or defaults)
     */
    async getPolicies(): Promise<RetentionPolicy[]> {
        const customPolicies = await this.settingsService.get('data_retention_policies');
        if (customPolicies) {
            return customPolicies as RetentionPolicy[];
        }
        return this.defaultPolicies;
    }

    /**
     * Update retention policies
     */
    async updatePolicies(policies: RetentionPolicy[]): Promise<void> {
        await this.settingsService.set(
            'data_retention_policies',
            policies,
            'data_retention',
            'Data retention policies for automatic archiving'
        );
    }

    /**
     * Run archiving process manually or on schedule
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async runArchiving(): Promise<ArchiveResult[]> {
        this.logger.log('Starting scheduled data retention archiving...');
        const results: ArchiveResult[] = [];
        const policies = await this.getPolicies();

        for (const policy of policies) {
            if (!policy.archiveEnabled) {
                this.logger.log(`Skipping ${policy.entityType} - archiving disabled`);
                continue;
            }

            try {
                const result = await this.archiveEntity(policy);
                results.push(result);
                this.logger.log(`Archived ${result.archivedCount} ${policy.entityType} records`);
            } catch (error) {
                this.logger.error(`Error archiving ${policy.entityType}: ${error.message}`);
                results.push({
                    entityType: policy.entityType,
                    archivedCount: 0,
                    errors: [error.message],
                });
            }
        }

        // Log archiving run
        const totalArchived = results.reduce((sum, r) => sum + r.archivedCount, 0);
        await this.auditService.log({
            action: AuditAction.EXPORT,
            entityType: 'DataRetention',
            description: `Scheduled archiving completed. Total archived: ${totalArchived}`,
            metadata: { results },
            isSuccessful: true,
        }).catch(() => {});

        this.logger.log(`Archiving completed. Total records archived: ${totalArchived}`);
        return results;
    }

    /**
     * Archive records for a specific entity type
     */
    private async archiveEntity(policy: RetentionPolicy): Promise<ArchiveResult> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        let archivedCount = 0;

        switch (policy.entityType) {
            case 'AuditLog':
                archivedCount = await this.archiveAuditLogs(cutoffDate);
                break;
            case 'PettyCashTransaction':
                archivedCount = await this.archivePettyCashTransactions(cutoffDate);
                break;
            case 'StaffLoanRepayment':
                archivedCount = await this.archiveLoanRepayments(cutoffDate);
                break;
            default:
                this.logger.warn(`Unknown entity type for archiving: ${policy.entityType}`);
        }

        return { entityType: policy.entityType, archivedCount };
    }

    /**
     * Archive old audit logs (soft delete by marking as archived)
     */
    private async archiveAuditLogs(cutoffDate: Date): Promise<number> {
        // For audit logs, we use the existing cleanOldLogs method
        // but also create an archive record
        const oldLogs = await this.auditLogRepo.find({
            where: { created_at: LessThan(cutoffDate) },
        });

        if (oldLogs.length === 0) return 0;

        // Create archive table if not exists and insert archived records
        await this.createArchiveTable('audit_logs_archive');
        await this.insertToArchive('audit_logs_archive', oldLogs);

        // Delete from main table
        const result = await this.auditLogRepo.delete({
            created_at: LessThan(cutoffDate),
        });

        return result.affected || 0;
    }

    /**
     * Archive old petty cash transactions
     */
    private async archivePettyCashTransactions(cutoffDate: Date): Promise<number> {
        const oldRecords = await this.pettyCashTxnRepo.find({
            where: {
                transaction_date: LessThan(cutoffDate),
                status: TransactionStatus.APPROVED, // Only archive approved transactions
            },
        });

        if (oldRecords.length === 0) return 0;

        await this.createArchiveTable('petty_cash_transactions_archive');
        await this.insertToArchive('petty_cash_transactions_archive', oldRecords);

        // Soft delete - mark as archived instead of hard delete
        let archived = 0;
        for (const record of oldRecords) {
            await this.pettyCashTxnRepo.update(record.id, {
                status: 'archived' as any,
            });
            archived++;
        }

        return archived;
    }

    /**
     * Archive old loan repayments (completed ones only)
     */
    private async archiveLoanRepayments(cutoffDate: Date): Promise<number> {
        const oldRecords = await this.loanRepaymentRepo.find({
            where: {
                due_date: LessThan(cutoffDate),
                status: RepaymentStatus.PAID, // Only archive paid repayments
            },
        });

        if (oldRecords.length === 0) return 0;

        await this.createArchiveTable('staff_loan_repayments_archive');
        await this.insertToArchive('staff_loan_repayments_archive', oldRecords);

        // Soft delete
        let archived = 0;
        for (const record of oldRecords) {
            await this.loanRepaymentRepo.update(record.id, {
                status: 'archived' as any,
            });
            archived++;
        }

        return archived;
    }

    /**
     * Create archive table if it doesn't exist
     */
    private async createArchiveTable(tableName: string): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS ${tableName} (
                    id UUID PRIMARY KEY,
                    data JSONB NOT NULL,
                    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    original_created_at TIMESTAMP
                )
            `);
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Insert records into archive table
     */
    private async insertToArchive(tableName: string, records: any[]): Promise<void> {
        if (records.length === 0) return;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            for (const record of records) {
                await queryRunner.query(
                    `INSERT INTO ${tableName} (id, data, original_created_at) VALUES ($1, $2, $3)
                     ON CONFLICT (id) DO NOTHING`,
                    [record.id, JSON.stringify(record), record.created_at || record.transaction_date || record.due_date]
                );
            }
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Get archiving statistics by querying each archive table.
     * Tables may not yet exist if archiving has never run — handled gracefully.
     */
    async getStats(): Promise<{
        totalArchived: number;
        byEntityType: Record<string, number>;
        lastArchiveAt: Date | null;
        nextRun: Date;
    }> {
        const archiveTables: Record<string, string> = {
            AuditLog: 'audit_logs_archive',
            PettyCashTransaction: 'petty_cash_transactions_archive',
            StaffLoanRepayment: 'staff_loan_repayments_archive',
        };

        const byEntityType: Record<string, number> = {};
        let totalArchived = 0;
        let lastArchiveAt: Date | null = null;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            for (const [entityType, tableName] of Object.entries(archiveTables)) {
                try {
                    const [{ count, last }] = await queryRunner.query(
                        `SELECT COUNT(*)::int AS count, MAX(archived_at) AS last FROM ${tableName}`,
                    );
                    const n = Number(count) || 0;
                    byEntityType[entityType] = n;
                    totalArchived += n;
                    if (last) {
                        const lastDate = new Date(last);
                        if (!lastArchiveAt || lastDate > lastArchiveAt) lastArchiveAt = lastDate;
                    }
                } catch (e: any) {
                    // Table doesn't exist yet — entity hasn't been archived
                    byEntityType[entityType] = 0;
                    this.logger.debug(`Archive table ${tableName} not present yet`);
                }
            }
        } finally {
            await queryRunner.release();
        }

        return {
            totalArchived,
            byEntityType,
            lastArchiveAt,
            nextRun: this.getNextRunTime(),
        };
    }

    private getNextRunTime(): Date {
        const next = new Date();
        next.setDate(next.getDate() + 1);
        next.setHours(2, 0, 0, 0);
        return next;
    }
}
