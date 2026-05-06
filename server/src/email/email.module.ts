import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { CalendarService } from './calendar.service';
import { TemplateService } from './template.service';
import { TemplateController } from './template.controller';
import { EmailTemplateEntity } from './entities/email-template.entity';
import { AuditService } from '../audit/audit.service';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Global()
@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([EmailTemplateEntity, AuditLog]),
    ],
    controllers: [TemplateController],
    providers: [EmailService, CalendarService, TemplateService, AuditService],
    exports: [EmailService, CalendarService, TemplateService],
})
export class EmailModule { }
