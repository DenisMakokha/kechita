import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationEventsListener } from './notification-events.listener';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { User } from '../auth/entities/user.entity';
import { ApprovalInstance } from '../approval/entities/approval-instance.entity';
import { Staff } from '../staff/entities/staff.entity';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, NotificationPreference, User, ApprovalInstance, Staff]),
        EmailModule,
        SmsModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [NotificationController],
    providers: [NotificationService, NotificationGateway, NotificationEventsListener],
    exports: [NotificationService, NotificationGateway],
})
export class NotificationModule { }
