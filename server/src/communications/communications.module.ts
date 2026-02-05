import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement, AnnouncementRead } from './entities/announcement.entity';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { Staff } from '../staff/entities/staff.entity';
import { User } from '../auth/entities/user.entity';
import { SmsModule } from '../sms/sms.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Announcement, AnnouncementRead, Staff, User]),
        SmsModule,
    ],
    controllers: [CommunicationsController],
    providers: [CommunicationsService],
    exports: [CommunicationsService],
})
export class CommunicationsModule { }
