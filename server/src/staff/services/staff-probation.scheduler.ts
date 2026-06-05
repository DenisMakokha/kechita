import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { Staff, ProbationStatus } from '../entities/staff.entity';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationType, NotificationPriority } from '../../notifications/entities/notification.entity';
import { EmailService } from '../../email/email.service';

@Injectable()
export class StaffProbationScheduler {
    private readonly logger = new Logger(StaffProbationScheduler.name);

    constructor(
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
        private notifications: NotificationService,
        private emailService: EmailService,
    ) {}

    /** Daily at 06:00 — notify employee, managers, and HR about upcoming probation reviews. */
    @Cron('0 6 * * *')
    async dailyProbationCheck() {
        const today = new Date();
        const milestones = [60, 30, 14, 7, 1, 0];
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
                const fullName = [s.first_name, s.last_name].filter(Boolean).join(' ');

                // 1. Notify line manager (in-app)
                const managerUserId = s.manager?.user?.id;
                if (managerUserId) {
                    try {
                        await this.notifications.create({
                            userId: managerUserId,
                            type: NotificationType.PROBATION_REVIEW_DUE,
                            title: `Probation review ${label}: ${fullName}`,
                            body: `${fullName}'s probation ends on ${s.probation_end_date?.toString().slice(0, 10)}. Action is required to Confirm, Extend, or Terminate.`,
                            priority: days <= 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                            referenceType: 'staff',
                            referenceId: s.id,
                            actions: [{ label: 'Open profile', action: 'navigate', url: `/staff/${s.id}`, style: 'primary' }],
                        });
                    } catch (e: any) {
                        this.logger.warn(`Failed to send probation manager notification: ${e.message}`);
                    }
                }

                // 2. Notify employee (in-app)
                if (s.user?.id) {
                    try {
                        await this.notifications.create({
                            userId: s.user.id,
                            type: NotificationType.REMINDER,
                            title: `Probation Review Due ${label}`,
                            body: `Your probationary period ends ${label} on ${s.probation_end_date?.toString().slice(0, 10)}. Your manager will coordinate your review.`,
                            priority: days <= 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                            referenceType: 'staff',
                            referenceId: s.id,
                        });
                    } catch (e: any) {
                        this.logger.warn(`Failed to send probation employee notification: ${e.message}`);
                    }
                }

                // 3. Notify HR (in-app)
                try {
                    await this.notifications.notifyByRole('HR_MANAGER', {
                        type: NotificationType.PROBATION_REVIEW_DUE,
                        title: `Probation review ${label}: ${fullName}`,
                        body: `${fullName} (${s.employee_number || 'N/A'}) probation ends ${label} on ${s.probation_end_date?.toString().slice(0, 10)}.`,
                        priority: days <= 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                        referenceType: 'staff',
                        referenceId: s.id,
                        actions: [{ label: 'Open profile', action: 'navigate', url: `/staff/${s.id}`, style: 'primary' }],
                    });
                } catch (e: any) {
                    this.logger.warn(`Failed to send probation HR notification: ${e.message}`);
                }

                // 4. Courtesy email to employee
                if (days > 0) {
                    const to = s.user?.email || s.personal_email;
                    if (to) {
                        try {
                            await this.emailService.sendEmail({
                                to,
                                subject: `Reminder: your probation period ends ${label}`,
                                html: `
                                    <p>Dear ${s.first_name || 'Colleague'},</p>
                                    <p>This is a reminder that your probationary period is scheduled to end <strong>${label}</strong> on <strong>${s.probation_end_date?.toString().slice(0, 10)}</strong>.</p>
                                    <p>Your line manager and HR are preparing to conduct your probation review. If you have any questions or require feedback, please reach out to your manager or HR.</p>
                                    <p>Best regards,<br>Human Resources Department<br>Kechita Capital Limited</p>
                                `,
                            });
                        } catch (err: any) {
                            this.logger.warn(`Failed to email staff ${s.id} for probation review: ${err?.message}`);
                        }
                    }
                }
            }
            this.logger.log(`Probation milestone ${days}d: ${due.length} staff notified`);
        }
    }
}
