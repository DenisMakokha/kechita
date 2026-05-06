import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataRetentionService } from './data-retention.service';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { StaffLoanRepayment } from '../loans/entities/staff-loan-repayment.entity';
import { PettyCashTransaction } from '../petty-cash/entities/petty-cash-transaction.entity';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { SystemSetting } from '../auth/entities/system-setting.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AuditLog,
            StaffLoanRepayment,
            PettyCashTransaction,
            SystemSetting,
        ]),
    ],
    providers: [DataRetentionService, SettingsService, AuditService],
    exports: [DataRetentionService],
})
export class DataRetentionModule {}
