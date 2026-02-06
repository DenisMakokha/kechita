import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, And, IsNull, Not } from 'typeorm';
import { StaffDocument, StaffDocumentStatus } from '../entities/staff-document.entity';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { Staff } from '../entities/staff.entity';

@Injectable()
export class DocumentExpiryScheduler {
    private readonly logger = new Logger(DocumentExpiryScheduler.name);

    constructor(
        @InjectRepository(StaffDocument)
        private staffDocumentRepo: Repository<StaffDocument>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        private notificationService: NotificationService,
    ) {}

    // Run every day at 8:00 AM
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async handleDocumentExpiryCheck() {
        this.logger.log('Starting document expiry check...');

        try {
            await this.checkExpiredDocuments();
            await this.checkExpiringIn7Days();
            await this.checkExpiringIn30Days();
            await this.updateExpiredStatuses();

            this.logger.log('Document expiry check completed');
        } catch (error) {
            this.logger.error('Error during document expiry check:', error);
        }
    }

    private async checkExpiredDocuments() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiredDocs = await this.staffDocumentRepo.find({
            where: {
                expiry_date: LessThanOrEqual(today),
                reminder_sent_expired: false,
                status: Not(StaffDocumentStatus.EXPIRED),
            },
            relations: ['staff', 'staff.user', 'documentType'],
        });

        this.logger.log(`Found ${expiredDocs.length} expired documents needing notification`);

        for (const doc of expiredDocs) {
            if (!doc.staff?.user?.id) continue;

            const docName = doc.documentType?.name || doc.doc_type || 'Document';

            // Notify the staff member
            await this.notificationService.create({
                userId: doc.staff.user.id,
                type: NotificationType.DOCUMENT_EXPIRING,
                title: 'Document Expired',
                body: `Your ${docName} has expired. Please upload a new document as soon as possible.`,
                priority: 'high' as any,
                referenceType: 'staff_document',
                referenceId: doc.id,
            });

            // Notify HR managers
            await this.notificationService.notifyByRole('HR_MANAGER', {
                type: NotificationType.DOCUMENT_EXPIRING,
                title: 'Staff Document Expired',
                body: `${doc.staff.first_name} ${doc.staff.last_name}'s ${docName} has expired.`,
                priority: 'high' as any,
                referenceType: 'staff_document',
                referenceId: doc.id,
            });

            // Mark reminder as sent
            doc.reminder_sent_expired = true;
            doc.status = StaffDocumentStatus.EXPIRED;
            await this.staffDocumentRepo.save(doc);
        }
    }

    private async checkExpiringIn7Days() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const expiringDocs = await this.staffDocumentRepo.find({
            where: {
                expiry_date: And(
                    MoreThan(today),
                    LessThanOrEqual(sevenDaysFromNow)
                ),
                reminder_sent_7_days: false,
                status: Not(StaffDocumentStatus.EXPIRED),
            },
            relations: ['staff', 'staff.user', 'documentType'],
        });

        this.logger.log(`Found ${expiringDocs.length} documents expiring in 7 days`);

        for (const doc of expiringDocs) {
            if (!doc.staff?.user?.id) continue;

            const docName = doc.documentType?.name || doc.doc_type || 'Document';
            const expiryDate = new Date(doc.expiry_date!).toLocaleDateString();

            // Notify the staff member
            await this.notificationService.create({
                userId: doc.staff.user.id,
                type: NotificationType.DOCUMENT_EXPIRING,
                title: 'Document Expiring Soon',
                body: `Your ${docName} will expire on ${expiryDate}. Please renew it before it expires.`,
                priority: 'high' as any,
                referenceType: 'staff_document',
                referenceId: doc.id,
            });

            // Mark reminder as sent and update status
            doc.reminder_sent_7_days = true;
            doc.status = StaffDocumentStatus.EXPIRING_SOON;
            await this.staffDocumentRepo.save(doc);
        }
    }

    private async checkExpiringIn30Days() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringDocs = await this.staffDocumentRepo.find({
            where: {
                expiry_date: And(
                    MoreThan(sevenDaysFromNow),
                    LessThanOrEqual(thirtyDaysFromNow)
                ),
                reminder_sent_30_days: false,
                status: Not(StaffDocumentStatus.EXPIRED),
            },
            relations: ['staff', 'staff.user', 'documentType'],
        });

        this.logger.log(`Found ${expiringDocs.length} documents expiring in 30 days`);

        for (const doc of expiringDocs) {
            if (!doc.staff?.user?.id) continue;

            const docName = doc.documentType?.name || doc.doc_type || 'Document';
            const expiryDate = new Date(doc.expiry_date!).toLocaleDateString();

            // Notify the staff member
            await this.notificationService.create({
                userId: doc.staff.user.id,
                type: NotificationType.DOCUMENT_EXPIRING,
                title: 'Document Expiring in 30 Days',
                body: `Your ${docName} will expire on ${expiryDate}. Please start the renewal process.`,
                priority: 'medium' as any,
                referenceType: 'staff_document',
                referenceId: doc.id,
            });

            // Mark reminder as sent
            doc.reminder_sent_30_days = true;
            await this.staffDocumentRepo.save(doc);
        }
    }

    private async updateExpiredStatuses() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Update any documents that have expired but haven't been marked
        await this.staffDocumentRepo
            .createQueryBuilder()
            .update(StaffDocument)
            .set({ status: StaffDocumentStatus.EXPIRED })
            .where('expiry_date < :today', { today })
            .andWhere('status != :expired', { expired: StaffDocumentStatus.EXPIRED })
            .execute();
    }

    // Manual trigger for testing
    async triggerExpiryCheck() {
        await this.handleDocumentExpiryCheck();
        return { message: 'Document expiry check completed' };
    }

    // Get expiry summary for dashboard
    async getExpirySummary(): Promise<{
        expired: number;
        expiringIn7Days: number;
        expiringIn30Days: number;
        total: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const [expired, expiringIn7Days, expiringIn30Days, total] = await Promise.all([
            this.staffDocumentRepo.count({
                where: { status: StaffDocumentStatus.EXPIRED },
            }),
            this.staffDocumentRepo.count({
                where: {
                    expiry_date: And(
                        MoreThan(today),
                        LessThanOrEqual(sevenDaysFromNow)
                    ),
                    status: Not(StaffDocumentStatus.EXPIRED),
                },
            }),
            this.staffDocumentRepo.count({
                where: {
                    expiry_date: And(
                        MoreThan(sevenDaysFromNow),
                        LessThanOrEqual(thirtyDaysFromNow)
                    ),
                    status: Not(StaffDocumentStatus.EXPIRED),
                },
            }),
            this.staffDocumentRepo.count({
                where: { expiry_date: Not(IsNull()) },
            }),
        ]);

        return { expired, expiringIn7Days, expiringIn30Days, total };
    }
}
