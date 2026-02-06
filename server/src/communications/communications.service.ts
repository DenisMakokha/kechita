import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Announcement, AnnouncementRead, AnnouncementStatus, AnnouncementPriority, DeliveryChannel, TargetAudience } from './entities/announcement.entity';
import { Staff } from '../staff/entities/staff.entity';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';

export interface CreateAnnouncementDto {
    title: string;
    content: string;
    summary?: string;
    priority?: AnnouncementPriority;
    channels?: DeliveryChannel[];
    target_type?: TargetAudience;
    target_role_codes?: string[];
    target_branch_ids?: string[];
    target_region_ids?: string[];
    target_department_ids?: string[];
    target_user_ids?: string[];
    publish_at?: string;
    expires_at?: string;
    requires_acknowledgment?: boolean;
    attachment_ids?: string[];
}

@Injectable()
export class CommunicationsService {
    constructor(
        @InjectRepository(Announcement)
        private announcementRepo: Repository<Announcement>,
        @InjectRepository(AnnouncementRead)
        private readRepo: Repository<AnnouncementRead>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private emailService: EmailService,
        private smsService: SmsService,
    ) { }

    // ==================== ANNOUNCEMENTS ====================

    async createAnnouncement(data: CreateAnnouncementDto, createdById: string): Promise<Announcement> {
        const announcement = this.announcementRepo.create({
            title: data.title,
            content: data.content,
            summary: data.summary,
            priority: data.priority || AnnouncementPriority.NORMAL,
            channels: data.channels || [DeliveryChannel.PORTAL],
            target_type: data.target_type || TargetAudience.ALL,
            target_role_codes: data.target_role_codes,
            target_branch_ids: data.target_branch_ids,
            target_region_ids: data.target_region_ids,
            target_department_ids: data.target_department_ids,
            target_user_ids: data.target_user_ids,
            publish_at: data.publish_at ? new Date(data.publish_at) : undefined,
            expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
            requires_acknowledgment: data.requires_acknowledgment || false,
            attachment_ids: data.attachment_ids,
            createdBy: { id: createdById } as Staff,
            status: data.publish_at ? AnnouncementStatus.SCHEDULED : AnnouncementStatus.DRAFT,
        });

        return this.announcementRepo.save(announcement);
    }

    async updateAnnouncement(id: string, data: Partial<CreateAnnouncementDto>): Promise<Announcement> {
        const announcement = await this.getAnnouncement(id);

        if (announcement.status === AnnouncementStatus.PUBLISHED) {
            throw new BadRequestException('Cannot edit a published announcement');
        }

        Object.assign(announcement, {
            ...data,
            publish_at: data.publish_at ? new Date(data.publish_at) : announcement.publish_at,
            expires_at: data.expires_at ? new Date(data.expires_at) : announcement.expires_at,
        });

        return this.announcementRepo.save(announcement);
    }

    async getAnnouncement(id: string): Promise<Announcement> {
        const announcement = await this.announcementRepo.findOne({
            where: { id },
            relations: ['createdBy', 'publishedBy'],
        });
        if (!announcement) throw new NotFoundException('Announcement not found');
        return announcement;
    }

    async getAllAnnouncements(filters?: {
        status?: AnnouncementStatus;
        priority?: AnnouncementPriority;
    }): Promise<Announcement[]> {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.priority) where.priority = filters.priority;

        return this.announcementRepo.find({
            where,
            relations: ['createdBy'],
            order: { created_at: 'DESC' },
        });
    }

    async publishAnnouncement(id: string, publishedById: string): Promise<Announcement> {
        const announcement = await this.getAnnouncement(id);

        if (announcement.status === AnnouncementStatus.PUBLISHED) {
            throw new BadRequestException('Announcement is already published');
        }

        announcement.status = AnnouncementStatus.PUBLISHED;
        announcement.publishedBy = { id: publishedById } as Staff;
        announcement.published_at = new Date();

        const saved = await this.announcementRepo.save(announcement);

        // Send via channels
        await this.deliverAnnouncement(saved);

        return saved;
    }

    async archiveAnnouncement(id: string): Promise<Announcement> {
        const announcement = await this.getAnnouncement(id);
        announcement.status = AnnouncementStatus.ARCHIVED;
        return this.announcementRepo.save(announcement);
    }

    // ==================== DELIVERY ====================

    private async deliverAnnouncement(announcement: Announcement): Promise<void> {
        const targetUsers = await this.getTargetUsers(announcement);

        // Send emails
        if (announcement.channels.includes(DeliveryChannel.EMAIL)) {
            for (const user of targetUsers) {
                // Extract name from email if no staff record
                const emailName = user.email.split('@')[0].replace(/[._]/g, ' ');
                await this.emailService.sendNotificationEmail({
                    email: user.email,
                    name: emailName || 'Team Member',
                    subject: `[${announcement.priority.toUpperCase()}] ${announcement.title}`,
                    title: announcement.title,
                    message: announcement.summary || announcement.content.substring(0, 300),
                    actionUrl: `/announcements/${announcement.id}`,
                    actionText: 'Read More',
                });
            }
        }

        // SMS would be sent here if configured
        if (announcement.channels.includes(DeliveryChannel.SMS)) {
            const usersWithStaff = await this.userRepo.find({
                where: { id: In(targetUsers.map((u) => u.id)) },
                relations: ['staff'],
            });

            const message = `${announcement.title}\n\n${announcement.summary || announcement.content.substring(0, 300)}`;

            for (const user of usersWithStaff) {
                const phone = user.staff?.phone;
                if (!phone) continue;
                await this.smsService.sendSms({
                    to: phone,
                    message,
                });
            }
        }
    }

    private async getTargetUsers(announcement: Announcement): Promise<User[]> {
        const qb = this.userRepo.createQueryBuilder('u')
            .leftJoinAndSelect('u.roles', 'roles')
            .where('u.is_active = true');

        // For staff-related filters, we need to use subqueries or get staff separately
        // Since User doesn't have direct Staff relation, we fetch all active users
        // and let audience targeting work at the announcement display level

        switch (announcement.target_type) {
            case TargetAudience.ROLES:
                if (announcement.target_role_codes?.length) {
                    qb.andWhere('roles.code IN (:...roleCodes)', { roleCodes: announcement.target_role_codes });
                }
                break;
            case TargetAudience.SPECIFIC_USERS:
                if (announcement.target_user_ids?.length) {
                    qb.andWhere('u.id IN (:...userIds)', { userIds: announcement.target_user_ids });
                }
                break;
            // For branch/region/department targeting, we need different approach
            // These will be handled via staff lookup
            default:
                break;
        }

        return qb.getMany();
    }

    // ==================== USER-FACING ====================

    async getAnnouncementsForUser(userId: string): Promise<(Announcement & { is_read: boolean; is_acknowledged: boolean })[]> {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['staff', 'staff.branch', 'staff.region', 'staff.department', 'roles'],
        });

        if (!user) throw new NotFoundException('User not found');

        const now = new Date();
        const announcements = await this.announcementRepo.find({
            where: {
                status: AnnouncementStatus.PUBLISHED,
            },
            relations: ['createdBy'],
            order: { published_at: 'DESC' },
        });

        // Filter by target audience
        const filteredAnnouncements = announcements.filter(a => {
            // Check expiration
            if (a.expires_at && new Date(a.expires_at) < now) return false;

            switch (a.target_type) {
                case TargetAudience.ALL:
                    return true;
                case TargetAudience.ROLES:
                    return a.target_role_codes?.some(rc => user.roles?.some(r => r.code === rc));
                case TargetAudience.BRANCHES:
                    return !!(user.staff?.branch?.id && a.target_branch_ids?.includes(user.staff.branch.id));
                case TargetAudience.REGIONS:
                    return !!(user.staff?.region?.id && a.target_region_ids?.includes(user.staff.region.id));
                case TargetAudience.DEPARTMENTS:
                    return !!(user.staff?.department?.id && a.target_department_ids?.includes(user.staff.department.id));
                case TargetAudience.SPECIFIC_USERS:
                    return a.target_user_ids?.includes(userId);
                default:
                    return true;
            }
        });

        // Get read status
        if (!user.staff?.id || filteredAnnouncements.length === 0) {
            return filteredAnnouncements.map(a => ({
                ...a,
                is_read: false,
                is_acknowledged: false,
            }));
        }

        const reads = await this.readRepo.find({
            where: {
                staff: { id: user.staff.id },
                announcement: { id: In(filteredAnnouncements.map(a => a.id)) },
            },
        });

        const readMap = new Map(reads.map(r => [r.announcement?.id, r]));

        return filteredAnnouncements.map(a => ({
            ...a,
            is_read: !!readMap.get(a.id),
            is_acknowledged: readMap.get(a.id)?.acknowledged || false,
        }));
    }

    async markAsRead(announcementId: string, staffId: string): Promise<AnnouncementRead> {
        const announcement = await this.getAnnouncement(announcementId);

        let read = await this.readRepo.findOne({
            where: { announcement: { id: announcementId }, staff: { id: staffId } },
        });

        if (!read) {
            read = this.readRepo.create({
                announcement,
                staff: { id: staffId } as Staff,
                read_at: new Date(),
            });

            await this.announcementRepo.increment({ id: announcementId }, 'view_count', 1);
        }

        return this.readRepo.save(read);
    }

    async acknowledge(announcementId: string, staffId: string): Promise<AnnouncementRead> {
        let read = await this.readRepo.findOne({
            where: { announcement: { id: announcementId }, staff: { id: staffId } },
        });

        if (!read) {
            read = await this.markAsRead(announcementId, staffId);
        }

        if (!read.acknowledged) {
            read.acknowledged = true;
            read.acknowledged_at = new Date();
            await this.readRepo.save(read);
            await this.announcementRepo.increment({ id: announcementId }, 'acknowledgment_count', 1);
        }

        return read;
    }

    async getReadStats(announcementId: string): Promise<{
        total_views: number;
        total_acknowledgments: number;
        read_by: Array<{ staff_name: string; read_at: Date; acknowledged: boolean }>;
    }> {
        const announcement = await this.getAnnouncement(announcementId);

        const reads = await this.readRepo.find({
            where: { announcement: { id: announcementId } },
            relations: ['staff'],
            order: { read_at: 'DESC' },
        });

        return {
            total_views: announcement.view_count,
            total_acknowledgments: announcement.acknowledgment_count,
            read_by: reads.map(r => ({
                staff_name: `${r.staff?.first_name} ${r.staff?.last_name}`,
                read_at: r.read_at,
                acknowledged: r.acknowledged,
            })),
        };
    }

    // ==================== SCHEDULED PUBLISHING ====================

    async publishScheduledAnnouncements(): Promise<number> {
        const now = new Date();
        const scheduled = await this.announcementRepo.find({
            where: {
                status: AnnouncementStatus.SCHEDULED,
                publish_at: LessThanOrEqual(now),
            },
        });

        for (const announcement of scheduled) {
            announcement.status = AnnouncementStatus.PUBLISHED;
            announcement.published_at = now;
            await this.announcementRepo.save(announcement);
            await this.deliverAnnouncement(announcement);
        }

        return scheduled.length;
    }

    async expireOldAnnouncements(): Promise<number> {
        const now = new Date();
        const result = await this.announcementRepo.update(
            {
                status: AnnouncementStatus.PUBLISHED,
                expires_at: LessThanOrEqual(now),
            },
            { status: AnnouncementStatus.EXPIRED },
        );

        return result.affected || 0;
    }

    // ==================== DELETE & UNARCHIVE ====================

    async deleteAnnouncement(id: string): Promise<{ message: string }> {
        const announcement = await this.announcementRepo.findOne({ where: { id } });
        if (!announcement) throw new NotFoundException('Announcement not found');

        if (announcement.status === AnnouncementStatus.PUBLISHED) {
            throw new BadRequestException('Cannot delete a published announcement. Archive it first.');
        }

        await this.announcementRepo.remove(announcement);
        return { message: 'Announcement deleted successfully' };
    }

    async unarchiveAnnouncement(id: string): Promise<Announcement> {
        const announcement = await this.announcementRepo.findOne({ where: { id } });
        if (!announcement) throw new NotFoundException('Announcement not found');

        if (announcement.status !== AnnouncementStatus.ARCHIVED) {
            throw new BadRequestException('Only archived announcements can be unarchived');
        }

        announcement.status = AnnouncementStatus.DRAFT;
        return this.announcementRepo.save(announcement);
    }
}
