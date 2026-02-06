import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationService', () => {
    let service: NotificationService;

    const mockNotificationRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        findAndCount: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    };

    const mockPreferenceRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockUserRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    const mockEmailService = {
        sendNotificationEmail: jest.fn(),
    };

    const mockSmsService = {
        sendSms: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
                { provide: getRepositoryToken(NotificationPreference), useValue: mockPreferenceRepo },
                { provide: getRepositoryToken(User), useValue: mockUserRepo },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: EmailService, useValue: mockEmailService },
                { provide: SmsService, useValue: mockSmsService },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a notification', async () => {
            mockPreferenceRepo.findOne.mockResolvedValue(null);
            const notification = { id: '1', title: 'Test', type: NotificationType.REMINDER };
            mockNotificationRepo.create.mockReturnValue(notification);
            mockNotificationRepo.save.mockResolvedValue(notification);

            const result = await service.create({
                userId: 'user-1',
                type: NotificationType.REMINDER,
                title: 'Test Notification',
                body: 'Test body',
            });

            expect(mockNotificationRepo.save).toHaveBeenCalled();
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification.created', expect.any(Object));
        });

        it('should skip notification if in_app_enabled is false', async () => {
            mockPreferenceRepo.findOne.mockResolvedValue({ in_app_enabled: false });

            const result = await service.create({
                userId: 'user-1',
                type: NotificationType.REMINDER,
                title: 'Test',
                body: 'Test body',
            });

            expect(result).toBeNull();
            expect(mockNotificationRepo.save).not.toHaveBeenCalled();
        });

        it('should send email if email_enabled in preferences', async () => {
            mockPreferenceRepo.findOne.mockResolvedValue({ in_app_enabled: true, email_enabled: true });
            const notification = { id: '1', title: 'Test' };
            mockNotificationRepo.create.mockReturnValue(notification);
            mockNotificationRepo.save.mockResolvedValue(notification);
            mockUserRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

            await service.create({
                userId: 'user-1',
                type: NotificationType.REMINDER,
                title: 'Test',
                body: 'Test body',
            });

            expect(mockEmailService.sendNotificationEmail).toHaveBeenCalled();
        });
    });

    describe('createBulk', () => {
        it('should create multiple notifications', async () => {
            mockPreferenceRepo.findOne.mockResolvedValue(null);
            const notification = { id: '1', title: 'Test' };
            mockNotificationRepo.create.mockReturnValue(notification);
            mockNotificationRepo.save.mockResolvedValue(notification);

            const result = await service.createBulk([
                { userId: 'user-1', type: NotificationType.REMINDER, title: 'Test 1', body: 'Body 1' },
                { userId: 'user-2', type: NotificationType.REMINDER, title: 'Test 2', body: 'Body 2' },
            ]);

            expect(result).toHaveLength(2);
        });
    });

    describe('getUserNotifications', () => {
        it('should return user notifications with pagination', async () => {
            const notifications = [{ id: '1' }, { id: '2' }];
            mockNotificationRepo.findAndCount.mockResolvedValue([notifications, 10]);

            const result = await service.getUserNotifications('user-1', { limit: 10, offset: 0 });

            expect(result.notifications).toEqual(notifications);
            expect(result.total).toBe(10);
        });

        it('should filter unread only when requested', async () => {
            mockNotificationRepo.findAndCount.mockResolvedValue([[], 0]);

            await service.getUserNotifications('user-1', { unreadOnly: true });

            expect(mockNotificationRepo.findAndCount).toHaveBeenCalled();
        });
    });

    describe('getUnreadCount', () => {
        it('should return count of unread notifications', async () => {
            mockNotificationRepo.count.mockResolvedValue(5);

            const result = await service.getUnreadCount('user-1');

            expect(result).toBe(5);
        });
    });

    describe('getStats', () => {
        it('should return notification statistics', async () => {
            const notifications = [
                { id: '1', type: NotificationType.REMINDER, is_read: false },
                { id: '2', type: NotificationType.REMINDER, is_read: true },
                { id: '3', type: NotificationType.APPROVAL_REQUIRED, is_read: false },
            ];
            mockNotificationRepo.findAndCount.mockResolvedValue([notifications, 3]);

            const result = await service.getStats('user-1');

            expect(result.total).toBe(3);
            expect(result.unread).toBe(2);
            expect(result.byType[NotificationType.REMINDER]).toBe(2);
        });
    });

    describe('markAsRead', () => {
        it('should throw NotFoundException if notification not found', async () => {
            mockNotificationRepo.findOne.mockResolvedValue(null);

            await expect(service.markAsRead('non-existent', 'user-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should mark notification as read', async () => {
            const notification = { id: '1', is_read: false };
            mockNotificationRepo.findOne.mockResolvedValue(notification);
            mockNotificationRepo.save.mockResolvedValue({ ...notification, is_read: true });

            const result = await service.markAsRead('1', 'user-1');

            expect(result.is_read).toBe(true);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all user notifications as read', async () => {
            mockNotificationRepo.update.mockResolvedValue({ affected: 5 });

            const result = await service.markAllAsRead('user-1');

            expect(result).toBe(5);
        });
    });

    describe('markMultipleAsRead', () => {
        it('should mark multiple notifications as read', async () => {
            mockNotificationRepo.update.mockResolvedValue({ affected: 3 });

            const result = await service.markMultipleAsRead(['1', '2', '3'], 'user-1');

            expect(result).toBe(3);
        });
    });

    describe('delete', () => {
        it('should delete notification', async () => {
            mockNotificationRepo.delete.mockResolvedValue({ affected: 1 });

            await service.delete('1', 'user-1');

            expect(mockNotificationRepo.delete).toHaveBeenCalledWith({ id: '1', user: { id: 'user-1' } });
        });
    });

    describe('deleteAll', () => {
        it('should delete all user notifications', async () => {
            mockNotificationRepo.delete.mockResolvedValue({ affected: 10 });

            const result = await service.deleteAll('user-1');

            expect(result).toBe(10);
        });
    });

    describe('deleteRead', () => {
        it('should delete read notifications only', async () => {
            mockNotificationRepo.delete.mockResolvedValue({ affected: 5 });

            const result = await service.deleteRead('user-1');

            expect(result).toBe(5);
        });
    });

    describe('cleanupExpired', () => {
        it('should delete expired notifications', async () => {
            mockNotificationRepo.delete.mockResolvedValue({ affected: 20 });

            const result = await service.cleanupExpired();

            expect(result).toBe(20);
        });
    });

    describe('getPreferences', () => {
        it('should return user preferences', async () => {
            const preferences = [
                { notification_type: NotificationType.REMINDER, in_app_enabled: true },
            ];
            mockPreferenceRepo.find.mockResolvedValue(preferences);

            const result = await service.getPreferences('user-1');

            expect(result).toEqual(preferences);
        });
    });

    describe('updatePreference', () => {
        it('should create new preference if not exists', async () => {
            mockPreferenceRepo.findOne.mockResolvedValue(null);
            const newPref = { notification_type: NotificationType.REMINDER, in_app_enabled: true };
            mockPreferenceRepo.create.mockReturnValue(newPref);
            mockPreferenceRepo.save.mockResolvedValue(newPref);

            const result = await service.updatePreference('user-1', NotificationType.REMINDER, {
                in_app_enabled: true,
            });

            expect(mockPreferenceRepo.create).toHaveBeenCalled();
            expect(mockPreferenceRepo.save).toHaveBeenCalled();
        });

        it('should update existing preference', async () => {
            const existingPref = { notification_type: NotificationType.REMINDER, in_app_enabled: true, email_enabled: false };
            mockPreferenceRepo.findOne.mockResolvedValue(existingPref);
            mockPreferenceRepo.save.mockResolvedValue({ ...existingPref, email_enabled: true });

            const result = await service.updatePreference('user-1', NotificationType.REMINDER, {
                email_enabled: true,
            });

            expect(mockPreferenceRepo.save).toHaveBeenCalled();
        });
    });
});
