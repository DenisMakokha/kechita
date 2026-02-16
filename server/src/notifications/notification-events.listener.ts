import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationPriority } from './entities/notification.entity';
import { ApprovalCompletedEvent } from '../approval/approval.service';
import { ApprovalInstance } from '../approval/entities/approval-instance.entity';
import { Staff } from '../staff/entities/staff.entity';
import { User } from '../auth/entities/user.entity';
import {
    approvalCompletedEmail,
    approvalRequiredEmail,
    approvalReturnedEmail,
    approvalEscalatedEmail,
} from '../email/email-templates';

@Injectable()
export class NotificationEventsListener {
    private readonly logger = new Logger(NotificationEventsListener.name);

    constructor(
        private notificationService: NotificationService,
        @InjectRepository(ApprovalInstance)
        private instanceRepo: Repository<ApprovalInstance>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

    // ==================== APPROVAL EVENTS ====================

    @OnEvent('approval.completed')
    async handleApprovalCompleted(event: ApprovalCompletedEvent) {
        try {
            const instance = await this.instanceRepo.findOne({
                where: { target_type: event.targetType, target_id: event.targetId },
                relations: ['requester'],
            });
            if (!instance?.requester) return;

            const requester = instance.requester;
            const user = await this.userRepo.findOne({
                where: { staff: { id: requester.id } },
                relations: ['staff'],
            });
            if (!user) return;

            const targetLabel = this.getTargetLabel(event.targetType);
            const isApproved = event.status === 'approved';

            const staffName = requester.first_name || 'Team Member';
            await this.notificationService.create({
                userId: user.id,
                type: isApproved ? NotificationType.APPROVAL_COMPLETED : NotificationType.APPROVAL_REJECTED,
                title: isApproved
                    ? `${targetLabel} Approved`
                    : `${targetLabel} Rejected`,
                body: isApproved
                    ? `Your ${targetLabel.toLowerCase()} request has been approved.${event.comment ? ` Comment: ${event.comment}` : ''}`
                    : `Your ${targetLabel.toLowerCase()} request has been rejected.${event.comment ? ` Reason: ${event.comment}` : ''}`,
                priority: isApproved ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
                referenceType: event.targetType,
                referenceId: event.targetId,
                actions: [
                    { label: 'View Details', action: 'navigate', url: `/approvals`, style: 'primary' },
                ],
                emailHtml: approvalCompletedEmail(staffName, targetLabel, isApproved, event.comment),
            } as any);

            this.logger.log(`Notification sent to ${requester.first_name} for ${event.targetType} ${event.status}`);
        } catch (err: any) {
            this.logger.warn(`Failed to send approval notification: ${err.message}`);
        }
    }

    @OnEvent('approval.escalated')
    async handleApprovalEscalated(event: {
        instanceId: string;
        targetType: string;
        targetId: string;
        fromRole: string;
        toRole: string;
        stepOrder: number;
    }) {
        try {
            // Notify users with the escalation role
            const targetLabel = this.getTargetLabel(event.targetType);
            await this.notificationService.notifyByRole(event.toRole, {
                type: NotificationType.APPROVAL_REQUIRED,
                title: `Escalated: ${targetLabel} Approval Required`,
                body: `A ${targetLabel.toLowerCase()} approval has been escalated to your role for step ${event.stepOrder}. Please review.`,
                priority: NotificationPriority.HIGH,
                referenceType: event.targetType,
                referenceId: event.targetId,
                actions: [
                    { label: 'Review Now', action: 'navigate', url: `/approvals`, style: 'primary' },
                ],
                emailHtml: approvalEscalatedEmail('Team', targetLabel, event.stepOrder),
            } as any);

            this.logger.log(`Escalation notification sent to role ${event.toRole}`);
        } catch (err: any) {
            this.logger.warn(`Failed to send escalation notification: ${err.message}`);
        }
    }

    @OnEvent('approval.returned')
    async handleApprovalReturned(event: {
        targetType: string;
        targetId: string;
        comment: string;
    }) {
        try {
            const instance = await this.instanceRepo.findOne({
                where: { target_type: event.targetType, target_id: event.targetId },
                relations: ['requester'],
            });
            if (!instance?.requester) return;

            const user = await this.userRepo.findOne({
                where: { staff: { id: instance.requester.id } },
                relations: ['staff'],
            });
            if (!user) return;

            const targetLabel = this.getTargetLabel(event.targetType);

            const returnStaffName = instance.requester?.first_name || 'Team Member';
            await this.notificationService.create({
                userId: user.id,
                type: NotificationType.APPROVAL_REQUIRED,
                title: `${targetLabel} Returned for Review`,
                body: `Your ${targetLabel.toLowerCase()} has been returned for corrections.${event.comment ? ` Comment: ${event.comment}` : ''}`,
                priority: NotificationPriority.HIGH,
                referenceType: event.targetType,
                referenceId: event.targetId,
                actions: [
                    { label: 'View Details', action: 'navigate', url: `/approvals`, style: 'primary' },
                ],
                emailHtml: approvalReturnedEmail(returnStaffName, targetLabel, event.comment),
            } as any);
        } catch (err: any) {
            this.logger.warn(`Failed to send return notification: ${err.message}`);
        }
    }

    // ==================== APPROVAL STEP PENDING (notify approver) ====================

    @OnEvent('approval.step.pending')
    async handleApprovalStepPending(event: {
        instanceId: string;
        targetType: string;
        targetId: string;
        approverRoleCode?: string;
        approverUserId?: string;
        stepName: string;
    }) {
        try {
            const targetLabel = this.getTargetLabel(event.targetType);

            if (event.approverUserId) {
                await this.notificationService.create({
                    userId: event.approverUserId,
                    type: NotificationType.APPROVAL_REQUIRED,
                    title: `${targetLabel} Approval Required`,
                    body: `You have a pending ${targetLabel.toLowerCase()} to review (${event.stepName}).`,
                    priority: NotificationPriority.HIGH,
                    referenceType: event.targetType,
                    referenceId: event.targetId,
                    actions: [
                        { label: 'Review Now', action: 'navigate', url: `/approvals`, style: 'primary' },
                    ],
                    emailHtml: approvalRequiredEmail('Team', targetLabel, event.stepName),
                } as any);
            } else if (event.approverRoleCode) {
                await this.notificationService.notifyByRole(event.approverRoleCode, {
                    type: NotificationType.APPROVAL_REQUIRED,
                    title: `${targetLabel} Approval Required`,
                    body: `A new ${targetLabel.toLowerCase()} requires your approval (${event.stepName}).`,
                    priority: NotificationPriority.HIGH,
                    referenceType: event.targetType,
                    referenceId: event.targetId,
                    actions: [
                        { label: 'Review Now', action: 'navigate', url: `/approvals`, style: 'primary' },
                    ],
                    emailHtml: approvalRequiredEmail('Team', targetLabel, event.stepName),
                } as any);
            }
        } catch (err: any) {
            this.logger.warn(`Failed to send step pending notification: ${err.message}`);
        }
    }

    // ==================== HELPERS ====================

    private getTargetLabel(targetType: string): string {
        switch (targetType) {
            case 'leave': return 'Leave Request';
            case 'claim': return 'Expense Claim';
            case 'staff_loan': return 'Staff Loan';
            case 'petty_cash_replenishment': return 'Petty Cash Replenishment';
            default: return targetType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
    }
}
