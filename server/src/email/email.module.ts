import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { CalendarService } from './calendar.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [EmailService, CalendarService],
    exports: [EmailService, CalendarService],
})
export class EmailModule { }
