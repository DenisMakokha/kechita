import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { NotificationType } from './notification.entity';

@Entity('notification_preferences')
@Unique(['user', 'notification_type'])
export class NotificationPreference {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'enum', enum: NotificationType })
    notification_type: NotificationType;

    // In-app notification (always available, but can be hidden)
    @Column({ default: true })
    in_app_enabled: boolean;

    // Email notification
    @Column({ default: true })
    email_enabled: boolean;

    // Push notification (for future mobile app)
    @Column({ default: false })
    push_enabled: boolean;

    // SMS notification (for critical alerts)
    @Column({ default: false })
    sms_enabled: boolean;
}
