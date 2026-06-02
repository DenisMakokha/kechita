import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../auth/entities/system-setting.entity';
import { SmsService } from './sms.service';

@Global()
@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([SystemSetting])],
    providers: [SmsService],
    exports: [SmsService],
})
export class SmsModule { }
