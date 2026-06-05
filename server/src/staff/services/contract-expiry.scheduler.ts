import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { StaffContract, ContractStatus } from '../entities/staff-contract.entity';
import { NotificationService } from '../../notifications/notification.service';
import {
    NotificationType, NotificationPriority,
} from '../../notifications/entities/notification.entity';
import { EmailService } from '../../email/email.service';

/**
 * Phase 2D — Contract expiry reminders.
 *
 * Runs daily at 07:00 and looks for active contracts approaching their
 * `end_date` at 60 / 30 / 7 / 0 day milestones. For each match:
 *   - emits an in-app notification to the staff's manager (and HR if no
 *     manager is set), and
 *   - sends a courtesy email to the employee (when contact info exists).
 *
 * Also flips contracts whose end_date is in the past to `EXPIRED` so they
 * disappear from "active" rollups even if no human action was taken.
 */
@Injectable()
export class ContractExpiryScheduler {
    private readonly logger = new Logger(ContractExpiryScheduler.name);

    constructor(
        @InjectRepository(StaffContract)
        private readonly contractRepo: Repository<StaffContract>,
        private readonly notifications: NotificationService,
        private readonly emailService: EmailService,
    ) {}

    @Cron('0 7 * * *')
    async dailyContractExpiryCheck(): Promise<void> {
        try {
            await this.notifyUpcomingExpiries();
            await this.flipPastDueToExpired();
        } catch (err: any) {
            this.logger.error(`Contract expiry cron failed: ${err?.message}`);
        }
    }

    private async notifyUpcomingExpiries(): Promise<void> {
        const milestones = [60, 30, 14, 7, 1, 0];
        const today = new Date();

        for (const days of milestones) {
            const target = new Date();
            target.setDate(today.getDate() + days);
            const start = new Date(target); start.setHours(0, 0, 0, 0);
            const end = new Date(target); end.setHours(23, 59, 59, 999);

            const due = await this.contractRepo.find({
                where: {
                    status: ContractStatus.ACTIVE,
                    end_date: Between(start, end),
                },
                relations: ['staff', 'staff.manager', 'staff.manager.user', 'staff.user'],
            });

            if (due.length === 0) continue;
            this.logger.log(`Found ${due.length} contract(s) expiring in ${days} day(s)`);

            for (const c of due) {
                const staff: any = c.staff;
                if (!staff) continue;
                const label = days === 0 ? 'today' : `in ${days} days`;
                const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(' ');

                // ---- 1. In-app notification to manager ----
                const managerUserId = staff.manager?.user?.id;
                if (managerUserId) {
                    try {
                        await this.notifications.create({
                            userId: managerUserId,
                            type: NotificationType.REMINDER,
                            title: `Contract expiring ${label}: ${fullName}`,
                            body: `${fullName}'s employment contract (${c.contract_number || c.id}) ends on ${new Date(c.end_date!).toLocaleDateString('en-GB')}. Consider renewal or non-renewal action.`,
                            priority: days <= 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                            referenceType: 'staff_contract',
                            referenceId: c.id,
                        });
                    } catch (err: any) {
                        this.logger.warn(`Failed to notify manager for contract ${c.id}: ${err?.message}`);
                    }
                }

                // ---- 2. In-app notification to employee ----
                if (staff.user?.id) {
                    try {
                        await this.notifications.create({
                            userId: staff.user.id,
                            type: NotificationType.REMINDER,
                            title: `Contract Expiry Due ${label}`,
                            body: `Your employment contract (${c.contract_number || c.id}) is scheduled to end ${label} on ${new Date(c.end_date!).toLocaleDateString('en-GB')}.`,
                            priority: days <= 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                            referenceType: 'staff_contract',
                            referenceId: c.id,
                        });
                    } catch (err: any) {
                        this.logger.warn(`Failed to notify employee in-app for contract ${c.id}: ${err?.message}`);
                    }
                }

                // ---- 3. In-app notification to HR ----
                try {
                    await this.notifications.notifyByRole('HR_MANAGER', {
                        type: NotificationType.REMINDER,
                        title: `Contract expiring ${label}: ${fullName}`,
                        body: `${fullName} (${staff.employee_number || 'N/A'}) employment contract (${c.contract_number || c.id}) ends on ${new Date(c.end_date!).toLocaleDateString('en-GB')}.`,
                        priority: days <= 7 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
                        referenceType: 'staff_contract',
                        referenceId: c.id,
                    });
                } catch (err: any) {
                    this.logger.warn(`Failed to notify HR for contract ${c.id}: ${err?.message}`);
                }

                // ---- 4. Courtesy email to the employee (at all milestones > 0) ----
                if (days > 0) {
                    const to = staff.user?.email || staff.personal_email;
                    if (to) {
                        try {
                            await this.emailService.sendEmail({
                                to,
                                subject: `Reminder: your employment contract ends ${label}`,
                                html: `
                                    <p>Dear ${staff.first_name || 'Colleague'},</p>
                                    <p>This is a reminder that your current employment contract (<strong>${c.contract_number || 'reference pending'}</strong>) is scheduled to end on <strong>${new Date(c.end_date!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
                                    <p>Your line manager and HR have been notified. If you have any questions about renewal or next steps, please feel free to reach out to HR.</p>
                                    <p>Best regards,<br>Human Resources Department<br>Kechita Capital Limited</p>
                                `,
                            });
                        } catch (err: any) {
                            this.logger.warn(`Failed to email staff ${staff.id} for contract ${c.id}: ${err?.message}`);
                        }
                    }
                }
            }
        }
    }

    /**
     * Flip any ACTIVE contract whose end_date is strictly in the past to
     * EXPIRED. We deliberately do not touch RENEWED/SUPERSEDED/TERMINATED.
     */
    private async flipPastDueToExpired(): Promise<void> {
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        const stale = await this.contractRepo.find({
            where: {
                status: ContractStatus.ACTIVE,
                end_date: LessThanOrEqual(new Date(cutoff.getTime() - 24 * 60 * 60 * 1000)),
            },
        });
        for (const c of stale) {
            c.status = ContractStatus.EXPIRED;
            await this.contractRepo.save(c);
            this.logger.log(`Contract ${c.id} (${c.contract_number}) marked EXPIRED`);
        }
    }
}
