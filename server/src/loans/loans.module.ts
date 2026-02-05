import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { StaffLoan } from './entities/staff-loan.entity';
import { StaffLoanRepayment } from './entities/staff-loan-repayment.entity';
import { ApprovalModule } from '../approval/approval.module';
import { Staff } from '../staff/entities/staff.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaffLoan, StaffLoanRepayment, Staff]),
        ApprovalModule,
    ],
    controllers: [LoansController],
    providers: [LoansService],
    exports: [LoansService],
})
export class LoansModule { }
