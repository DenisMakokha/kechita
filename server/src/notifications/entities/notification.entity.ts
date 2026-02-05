import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum NotificationType {
    // Approvals
    APPROVAL_REQUIRED = 'approval_required',
    APPROVAL_COMPLETED = 'approval_completed',
    APPROVAL_REJECTED = 'approval_rejected',

    // Leave
    LEAVE_REQUEST_SUBMITTED = 'leave_request_submitted',
    LEAVE_REQUEST_APPROVED = 'leave_request_approved',
    LEAVE_REQUEST_REJECTED = 'leave_request_rejected',
    LEAVE_BALANCE_LOW = 'leave_balance_low',

    // Claims
    CLAIM_SUBMITTED = 'claim_submitted',
    CLAIM_APPROVED = 'claim_approved',
    CLAIM_REJECTED = 'claim_rejected',
    CLAIM_PAID = 'claim_paid',

    // Loans
    LOAN_APPLICATION_SUBMITTED = 'loan_application_submitted',
    LOAN_APPROVED = 'loan_approved',
    LOAN_REJECTED = 'loan_rejected',
    LOAN_PAYMENT_DUE = 'loan_payment_due',
    LOAN_PAYMENT_OVERDUE = 'loan_payment_overdue',

    // Documents
    DOCUMENT_EXPIRING = 'document_expiring',
    DOCUMENT_EXPIRED = 'document_expired',
    DOCUMENT_UPLOADED = 'document_uploaded',
    DOCUMENT_VERIFIED = 'document_verified',
    DOCUMENT_REJECTED = 'document_rejected',

    // Recruitment
    NEW_APPLICATION = 'new_application',
    INTERVIEW_SCHEDULED = 'interview_scheduled',
    INTERVIEW_REMINDER = 'interview_reminder',
    OFFER_EXTENDED = 'offer_extended',

    // Staff
    PROBATION_REVIEW_DUE = 'probation_review_due',
    ONBOARDING_TASK_ASSIGNED = 'onboarding_task_assigned',
    WELCOME_NEW_STAFF = 'welcome_new_staff',

    // System
    SYSTEM_ANNOUNCEMENT = 'system_announcement',
    TASK_ASSIGNED = 'task_assigned',
    REMINDER = 'reminder',
}

export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Entity('notifications')
@Index(['user', 'is_read'])
@Index(['user', 'created_at'])
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column()
    title: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'enum', enum: NotificationPriority, default: NotificationPriority.MEDIUM })
    priority: NotificationPriority;

    // Payload for additional data (e.g., links, IDs)
    @Column({ type: 'jsonb', nullable: true })
    payload: Record<string, any>;

    // Reference to related entity (e.g., leave_request_id, claim_id)
    @Column({ nullable: true })
    reference_type: string;

    @Column({ nullable: true })
    reference_id: string;

    @Column({ default: false })
    is_read: boolean;

    @Column({ type: 'timestamp', nullable: true })
    read_at: Date;

    // For grouped notifications
    @Column({ nullable: true })
    group_key: string;

    // Action buttons
    @Column({ type: 'jsonb', nullable: true })
    actions: Array<{
        label: string;
        action: string;
        url?: string;
        style?: 'primary' | 'secondary' | 'danger';
    }>;

    @CreateDateColumn()
    created_at: Date;

    // Optional expiry for time-sensitive notifications
    @Column({ type: 'timestamp', nullable: true })
    expires_at: Date;
}
