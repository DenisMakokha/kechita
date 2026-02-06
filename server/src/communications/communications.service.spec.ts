import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunicationsService } from './communications.service';
import { Announcement, AnnouncementRead, AnnouncementStatus, AnnouncementPriority, DeliveryChannel, TargetAudience } from './entities/announcement.entity';
import { Staff } from '../staff/entities/staff.entity';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CommunicationsService', () => {
    let service: CommunicationsService;

    const mockAnnouncementRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        increment: jest.fn(),
    };

    const mockReadRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        count: jest.fn(),
    };

    const mockStaffRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockUserRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        }),
    };

    const mockEmailService = {
        sendEmail: jest.fn(),
        sendBulkEmail: jest.fn(),
    };

    const mockSmsService = {
        sendSms: jest.fn(),
        sendBulkSms: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CommunicationsService,
                { provide: getRepositoryToken(Announcement), useValue: mockAnnouncementRepo },
                { provide: getRepositoryToken(AnnouncementRead), useValue: mockReadRepo },
                { provide: getRepositoryToken(Staff), useValue: mockStaffRepo },
                { provide: getRepositoryToken(User), useValue: mockUserRepo },
                { provide: EmailService, useValue: mockEmailService },
                { provide: SmsService, useValue: mockSmsService },
            ],
        }).compile();

        service = module.get<CommunicationsService>(CommunicationsService);
        jest.clearAllMocks();
    });

    describe('createAnnouncement', () => {
        it('should create a draft announcement', async () => {
            const dto = {
                title: 'Test Announcement',
                content: 'Test content',
            };
            const created = { id: '1', ...dto, status: AnnouncementStatus.DRAFT };
            mockAnnouncementRepo.create.mockReturnValue(created);
            mockAnnouncementRepo.save.mockResolvedValue(created);

            const result = await service.createAnnouncement(dto, 'staff-1');

            expect(mockAnnouncementRepo.create).toHaveBeenCalled();
            expect(mockAnnouncementRepo.save).toHaveBeenCalled();
            expect(result.status).toBe(AnnouncementStatus.DRAFT);
        });

        it('should create a scheduled announcement with publish_at', async () => {
            const dto = {
                title: 'Scheduled Announcement',
                content: 'Test content',
                publish_at: '2024-12-01T10:00:00Z',
            };
            const created = { id: '1', ...dto, status: AnnouncementStatus.SCHEDULED };
            mockAnnouncementRepo.create.mockReturnValue(created);
            mockAnnouncementRepo.save.mockResolvedValue(created);

            const result = await service.createAnnouncement(dto, 'staff-1');

            expect(result.status).toBe(AnnouncementStatus.SCHEDULED);
        });
    });

    describe('getAnnouncement', () => {
        it('should throw NotFoundException if announcement not found', async () => {
            mockAnnouncementRepo.findOne.mockResolvedValue(null);

            await expect(service.getAnnouncement('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return announcement with relations', async () => {
            const announcement = { id: '1', title: 'Test', createdBy: { id: 's1' } };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);

            const result = await service.getAnnouncement('1');

            expect(result).toEqual(announcement);
        });
    });

    describe('updateAnnouncement', () => {
        it('should throw BadRequestException if announcement is published', async () => {
            const announcement = { id: '1', status: AnnouncementStatus.PUBLISHED };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);

            await expect(service.updateAnnouncement('1', { title: 'New Title' }))
                .rejects.toThrow(BadRequestException);
        });

        it('should update draft announcement', async () => {
            const announcement = { id: '1', title: 'Old', status: AnnouncementStatus.DRAFT };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockAnnouncementRepo.save.mockResolvedValue({ ...announcement, title: 'New Title' });

            const result = await service.updateAnnouncement('1', { title: 'New Title' });

            expect(mockAnnouncementRepo.save).toHaveBeenCalled();
        });
    });

    describe('getAllAnnouncements', () => {
        it('should return all announcements', async () => {
            const announcements = [
                { id: '1', title: 'Announcement 1' },
                { id: '2', title: 'Announcement 2' },
            ];
            mockAnnouncementRepo.find.mockResolvedValue(announcements);

            const result = await service.getAllAnnouncements();

            expect(mockAnnouncementRepo.find).toHaveBeenCalled();
            expect(result).toEqual(announcements);
        });

        it('should filter by status', async () => {
            const announcements = [{ id: '1', status: AnnouncementStatus.PUBLISHED }];
            mockAnnouncementRepo.find.mockResolvedValue(announcements);

            const result = await service.getAllAnnouncements({ status: AnnouncementStatus.PUBLISHED });

            expect(mockAnnouncementRepo.find).toHaveBeenCalled();
        });
    });

    describe('publishAnnouncement', () => {
        it('should throw NotFoundException if announcement not found', async () => {
            mockAnnouncementRepo.findOne.mockResolvedValue(null);

            await expect(service.publishAnnouncement('non-existent', 'staff-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should publish announcement and send notifications', async () => {
            const announcement = {
                id: '1',
                title: 'Test',
                status: AnnouncementStatus.DRAFT,
                channels: [DeliveryChannel.PORTAL],
                target_type: TargetAudience.ALL,
            };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockAnnouncementRepo.save.mockResolvedValue({
                ...announcement,
                status: AnnouncementStatus.PUBLISHED,
            });
            mockStaffRepo.find.mockResolvedValue([]);

            const result = await service.publishAnnouncement('1', 'staff-1');

            expect(result.status).toBe(AnnouncementStatus.PUBLISHED);
        });
    });

    describe('archiveAnnouncement', () => {
        it('should throw NotFoundException if announcement not found', async () => {
            mockAnnouncementRepo.findOne.mockResolvedValue(null);

            await expect(service.archiveAnnouncement('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should archive announcement', async () => {
            const announcement = { id: '1', status: AnnouncementStatus.PUBLISHED };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockAnnouncementRepo.save.mockResolvedValue({
                ...announcement,
                status: AnnouncementStatus.ARCHIVED,
            });

            const result = await service.archiveAnnouncement('1');

            expect(result.status).toBe(AnnouncementStatus.ARCHIVED);
        });
    });

    describe('markAsRead', () => {
        it('should throw NotFoundException if announcement not found', async () => {
            mockAnnouncementRepo.findOne.mockResolvedValue(null);

            await expect(service.markAsRead('non-existent', 'staff-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should create read record if not exists', async () => {
            const announcement = { id: '1', title: 'Test' };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockReadRepo.findOne.mockResolvedValue(null);
            const readRecord = { id: 'r1', announcement, staff: { id: 'staff-1' }, read_at: new Date() };
            mockReadRepo.create.mockReturnValue(readRecord);
            mockReadRepo.save.mockResolvedValue(readRecord);
            mockAnnouncementRepo.increment.mockResolvedValue({ affected: 1 });

            const result = await service.markAsRead('1', 'staff-1');

            expect(mockReadRepo.save).toHaveBeenCalled();
        });

        it('should return existing read record', async () => {
            const announcement = { id: '1', title: 'Test' };
            const existingRead = { id: 'r1', announcement, staff: { id: 'staff-1' } };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockReadRepo.findOne.mockResolvedValue(existingRead);

            const result = await service.markAsRead('1', 'staff-1');

            expect(result.id).toBe('r1');
        });
    });

    describe('acknowledge', () => {
        it('should create read record and acknowledge if not exists', async () => {
            const announcement = { id: '1', title: 'Test', requires_acknowledgment: true };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockReadRepo.findOne.mockResolvedValue(null);
            const readRecord = { id: 'r1', acknowledged: true, acknowledged_at: new Date() };
            mockReadRepo.create.mockReturnValue(readRecord);
            mockReadRepo.save.mockResolvedValue(readRecord);
            mockAnnouncementRepo.increment.mockResolvedValue({ affected: 1 });

            const result = await service.acknowledge('1', 'staff-1');

            expect(result.acknowledged).toBe(true);
        });

        it('should acknowledge announcement', async () => {
            const announcement = { id: '1', requires_acknowledgment: true };
            const readRecord = { id: 'r1', acknowledged: false };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockReadRepo.findOne.mockResolvedValue(readRecord);
            mockReadRepo.save.mockResolvedValue({ ...readRecord, acknowledged: true });
            mockAnnouncementRepo.increment.mockResolvedValue({ affected: 1 });

            const result = await service.acknowledge('1', 'staff-1');

            expect(result.acknowledged).toBe(true);
        });
    });

    describe('getReadStats', () => {
        it('should return read statistics', async () => {
            const announcement = { id: '1', view_count: 10, acknowledgment_count: 5, target_type: TargetAudience.ALL };
            mockAnnouncementRepo.findOne.mockResolvedValue(announcement);
            mockReadRepo.find.mockResolvedValue([
                { staff: { first_name: 'John', last_name: 'Doe' }, read_at: new Date(), acknowledged: true },
            ]);
            mockStaffRepo.find.mockResolvedValue([{}, {}, {}]); // 3 staff

            const result = await service.getReadStats('1');

            expect(result).toHaveProperty('total_views');
            expect(result).toHaveProperty('total_acknowledgments');
        });
    });
});
