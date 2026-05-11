import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Staff, ProbationStatus } from '../entities/staff.entity';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationType, NotificationPriority } from '../../notifications/entities/notification.entity';

@Injectable()
export class StaffProbationScheduler {
    private readonly logger = new Logger(StaffProbationScheduler.name);

    constructor(
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
        private notifications: NotificationService,
    ) {}

    /** Daily at 06:00 — notify managers/HR about upcoming probation reviews and overdue probations. */
    @Cron('0 6 * * *')
    async dailyProbationCheck() {
        const today = new Date();
        const milestones = [30, 14, 7, 0];
        for (const days of milestones) {
            const target = new Date();
            target.setDate(today.getDate() + days);
            const start = new Date(target); start.setHours(0, 0, 0, 0);
            const end = new Date(target); end.setHours(23, 59, 59, 999);
            const due = await this.staffRepo.find({
                where: {
                    probation_status: In([ProbationStatus.IN_PROGRESS, ProbationStatus.EXTENDED]),
                    probation_end_date: Between(start, end),
                },
                relations: ['manager', 'manager.user', 'user'],
            });
            for (const s of due) {
                const label = days === 0 ? 'today' : `in ${days} days`;
                const recipients = [s.manager?.user?.id].filter(Boolean) as string[];
                for (const userId of recipients) {
                    try {
                        await this.notifications.create({
                            userId,
                            type: NotificationType.PROBATION_REVIEW_DUE,
                            title: `Probation review ${label}`,
                            body: `${s.first_name} ${s.last_name} (${s.employee_number}) probation ends on ${s.probation_end_date?.toString().slice(0, 10)}`,
                            priority: days <= 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                            referenceType: 'staff',
                            referenceId: s.id,
                            actions: [{ label: 'Open profile', action: 'navigate', url: `/staff/${s.id}`, style: 'primary' }],
                        });
                    } catch (e: any) {
                        this.logger.warn(`Failed to send probation notification: ${e.message}`);
                    }
                }
            }
            this.logger.log(`Probation milestone ${days}d: ${due.length} staff notified`);
        }
    }
}
