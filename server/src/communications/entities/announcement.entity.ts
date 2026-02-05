import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Staff } from '../../staff/entities/staff.entity';

export enum AnnouncementPriority {
    NORMAL = 'normal',
    URGENT = 'urgent',
    CRITICAL = 'critical',
}

export enum AnnouncementStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    PUBLISHED = 'published',
    EXPIRED = 'expired',
    ARCHIVED = 'archived',
}

export enum DeliveryChannel {
    PORTAL = 'portal',
    EMAIL = 'email',
    SMS = 'sms',
}

export enum TargetAudience {
    ALL = 'all',
    ROLES = 'roles',
    BRANCHES = 'branches',
    REGIONS = 'regions',
    DEPARTMENTS = 'departments',
    SPECIFIC_USERS = 'specific_users',
}

@Entity('announcements')
export class Announcement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', nullable: true })
    summary: string; // Short version for SMS/notifications

    @Column({ type: 'enum', enum: AnnouncementPriority, default: AnnouncementPriority.NORMAL })
    priority: AnnouncementPriority;

    @Column({ type: 'enum', enum: AnnouncementStatus, default: AnnouncementStatus.DRAFT })
    status: AnnouncementStatus;

    // Delivery channels
    @Column('simple-array', { default: 'portal' })
    channels: DeliveryChannel[];

    // Target audience
    @Column({ type: 'enum', enum: TargetAudience, default: TargetAudience.ALL })
    target_type: TargetAudience;

    @Column('simple-array', { nullable: true })
    target_role_codes: string[]; // When target_type = ROLES

    @Column('simple-array', { nullable: true })
    target_branch_ids: string[]; // When target_type = BRANCHES

    @Column('simple-array', { nullable: true })
    target_region_ids: string[]; // When target_type = REGIONS

    @Column('simple-array', { nullable: true })
    target_department_ids: string[]; // When target_type = DEPARTMENTS

    @Column('simple-array', { nullable: true })
    target_user_ids: string[]; // When target_type = SPECIFIC_USERS

    // Scheduling
    @Column({ type: 'timestamp', nullable: true })
    publish_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    expires_at: Date;

    // Tracking
    @Column({ default: false })
    requires_acknowledgment: boolean;

    @Column({ default: 0 })
    view_count: number;

    @Column({ default: 0 })
    acknowledgment_count: number;

    // Attachments
    @Column('simple-array', { nullable: true })
    attachment_ids: string[];

    @ManyToOne(() => Staff, { eager: true })
    @JoinColumn({ name: 'created_by_id' })
    createdBy: Staff;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'published_by_id' })
    publishedBy: Staff;

    @Column({ type: 'timestamp', nullable: true })
    published_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => AnnouncementRead, read => read.announcement)
    reads: AnnouncementRead[];
}

@Entity('announcement_reads')
export class AnnouncementRead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Announcement, announcement => announcement.reads, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'announcement_id' })
    announcement: Announcement;

    @ManyToOne(() => Staff)
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column({ type: 'timestamp' })
    read_at: Date;

    @Column({ default: false })
    acknowledged: boolean;

    @Column({ type: 'timestamp', nullable: true })
    acknowledged_at: Date;
}
