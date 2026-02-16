import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { StaffLoan } from './entities/staff-loan.entity';
import { StaffLoanRepayment } from './entities/staff-loan-repayment.entity';
import { ApprovalModule } from '../approval/approval.module';
import { SettingsModule } from '../settings/settings.module';
import { Staff } from '../staff/entities/staff.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaffLoan, StaffLoanRepayment, Staff]),
        ApprovalModule,
        SettingsModule,
        AuditModule,
    ],
    controllers: [LoansController],
    providers: [LoansService],
    exports: [LoansService],
})
export class LoansModule { }
