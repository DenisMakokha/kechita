import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, MoreThan, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { User } from '../auth/entities/user.entity';

export interface CreateNotificationDto {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    priority?: NotificationPriority;
    payload?: Record<string, any>;
    referenceType?: string;
    referenceId?: string;
    groupKey?: string;
    actions?: Array<{
        label: string;
        action: string;
        url?: string;
        style?: 'primary' | 'secondary' | 'danger';
    }>;
    expiresAt?: Date;
}

export interface NotificationStats {
    total: number;
    unread: number;
    byType: Record<string, number>;
}

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepo: Repository<Notification>,
        @InjectRepository(NotificationPreference)
        private preferenceRepo: Repository<NotificationPreference>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private eventEmitter: EventEmitter2,
    ) { }

    async create(dto: CreateNotificationDto): Promise<Notification> {
        // Check user preferences
        const preference = await this.preferenceRepo.findOne({
            where: {
                user: { id: dto.userId },
                notification_type: dto.type,
            },
        });

        // If preference exists and in-app is disabled, skip
        if (preference && !preference.in_app_enabled) {
            return null as any;
        }

        const notification = this.notificationRepo.create({
            user: { id: dto.userId } as User,
            type: dto.type,
            title: dto.title,
            body: dto.body,
            priority: dto.priority || NotificationPriority.MEDIUM,
            payload: dto.payload,
            reference_type: dto.referenceType,
            reference_id: dto.referenceId,
            group_key: dto.groupKey,
            actions: dto.actions,
            expires_at: dto.expiresAt,
        });

        const saved = await this.notificationRepo.save(notification);

        // Emit event for real-time delivery
        this.eventEmitter.emit('notification.created', {
            userId: dto.userId,
            notification: saved,
        });

        // TODO: Trigger email/push notifications based on preferences
        if (preference?.email_enabled) {
            this.eventEmitter.emit('notification.email', {
                userId: dto.userId,
                notification: saved,
            });
        }

        return saved;
    }

    async createBulk(notifications: CreateNotificationDto[]): Promise<Notification[]> {
        const results: Notification[] = [];
        for (const dto of notifications) {
            const notification = await this.create(dto);
            if (notification) {
                results.push(notification);
            }
        }
        return results;
    }

    async notifyUsers(userIds: string[], data: Omit<CreateNotificationDto, 'userId'>): Promise<void> {
        for (const userId of userIds) {
            await this.create({ ...data, userId });
        }
    }

    async notifyByRole(roleCode: string, data: Omit<CreateNotificationDto, 'userId'>): Promise<void> {
        const users = await this.userRepo.find({
            where: { roles: { code: roleCode } },
            relations: ['roles'],
        });

        for (const user of users) {
            await this.create({ ...data, userId: user.id });
        }
    }

    async getUserNotifications(
        userId: string,
        options: {
            unreadOnly?: boolean;
            limit?: number;
            offset?: number;
            types?: NotificationType[];
        } = {},
    ): Promise<{ notifications: Notification[]; total: number }> {
        const { unreadOnly = false, limit = 50, offset = 0, types } = options;

        const where: any = { user: { id: userId } };
        if (unreadOnly) {
            where.is_read = false;
        }
        if (types && types.length > 0) {
            where.type = In(types);
        }

        // Exclude expired notifications
        const [notifications, total] = await this.notificationRepo.findAndCount({
            where: [
                { ...where, expires_at: IsNull() },
                { ...where, expires_at: MoreThan(new Date()) },
            ],
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { notifications, total };
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationRepo.count({
            where: {
                user: { id: userId },
                is_read: false,
            },
        });
    }

    async getStats(userId: string): Promise<NotificationStats> {
        const [notifications, total] = await this.notificationRepo.findAndCount({
            where: { user: { id: userId } },
            select: ['id', 'type', 'is_read'],
        });

        const unread = notifications.filter((n) => !n.is_read).length;
        const byType: Record<string, number> = {};

        for (const n of notifications) {
            byType[n.type] = (byType[n.type] || 0) + 1;
        }

        return { total, unread, byType };
    }

    async markAsRead(id: string, userId: string): Promise<Notification> {
        const notification = await this.notificationRepo.findOne({
            where: { id, user: { id: userId } },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        notification.is_read = true;
        notification.read_at = new Date();
        return this.notificationRepo.save(notification);
    }

    async markAllAsRead(userId: string): Promise<number> {
        const result = await this.notificationRepo.update(
            { user: { id: userId }, is_read: false },
            { is_read: true, read_at: new Date() },
        );
        return result.affected || 0;
    }

    async markMultipleAsRead(ids: string[], userId: string): Promise<number> {
        const result = await this.notificationRepo.update(
            { id: In(ids), user: { id: userId } },
            { is_read: true, read_at: new Date() },
        );
        return result.affected || 0;
    }

    async delete(id: string, userId: string): Promise<void> {
        await this.notificationRepo.delete({ id, user: { id: userId } });
    }

    async deleteAll(userId: string): Promise<number> {
        const result = await this.notificationRepo.delete({ user: { id: userId } });
        return result.affected || 0;
    }

    async deleteRead(userId: string): Promise<number> {
        const result = await this.notificationRepo.delete({
            user: { id: userId },
            is_read: true,
        });
        return result.affected || 0;
    }

    // Cleanup expired notifications
    async cleanupExpired(): Promise<number> {
        const result = await this.notificationRepo.delete({
            expires_at: LessThan(new Date()),
        });
        return result.affected || 0;
    }

    // =============== PREFERENCES ===============

    async getPreferences(userId: string): Promise<NotificationPreference[]> {
        return this.preferenceRepo.find({
            where: { user: { id: userId } },
        });
    }

    async updatePreference(
        userId: string,
        type: NotificationType,
        preferences: Partial<Pick<NotificationPreference, 'in_app_enabled' | 'email_enabled' | 'push_enabled' | 'sms_enabled'>>,
    ): Promise<NotificationPreference> {
        let pref = await this.preferenceRepo.findOne({
            where: { user: { id: userId }, notification_type: type },
        });

        if (!pref) {
            pref = this.preferenceRepo.create({
                user: { id: userId } as User,
                notification_type: type,
                ...preferences,
            });
        } else {
            Object.assign(pref, preferences);
        }

        return this.preferenceRepo.save(pref);
    }

    async setDefaultPreferences(userId: string): Promise<void> {
        // Create default preferences for important notification types
        const importantTypes = [
            NotificationType.APPROVAL_REQUIRED,
            NotificationType.LEAVE_REQUEST_APPROVED,
            NotificationType.LEAVE_REQUEST_REJECTED,
            NotificationType.CLAIM_APPROVED,
            NotificationType.LOAN_APPROVED,
            NotificationType.DOCUMENT_EXPIRING,
        ];

        for (const type of importantTypes) {
            const existing = await this.preferenceRepo.findOne({
                where: { user: { id: userId }, notification_type: type },
            });

            if (!existing) {
                await this.preferenceRepo.save(
                    this.preferenceRepo.create({
                        user: { id: userId } as User,
                        notification_type: type,
                        in_app_enabled: true,
                        email_enabled: true,
                    }),
                );
            }
        }
    }
}
