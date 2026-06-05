import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollPeriod } from './entities/payroll-period.entity';
import { PayrollRun } from './entities/payroll-run.entity';
import { Payslip } from './entities/payslip.entity';
import { PayslipLine } from './entities/payslip-line.entity';
import { StaffAllowance } from './entities/staff-allowance.entity';
import { StaffRecurringDeduction } from './entities/staff-recurring-deduction.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffBankAccount } from '../staff/entities/staff-bank-account.entity';
import { StaffLoanRepayment } from '../loans/entities/staff-loan-repayment.entity';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './services/payroll.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { KenyaStatutoryService } from './services/kenya-statutory.service';
import { StaffCompService } from './services/staff-comp.service';
import { StatutoryExportService } from './services/statutory-export.service';
import { PayslipPDFService } from './services/payslip-pdf.service';
import { SystemSetting } from '../auth/entities/system-setting.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PayrollPeriod,
            PayrollRun,
            Payslip,
            PayslipLine,
            StaffAllowance,
            StaffRecurringDeduction,
            Staff,
            StaffBankAccount,
            StaffLoanRepayment,
            LeaveRequest,
            SystemSetting,
        ]),
        AuditModule,
    ],
    controllers: [PayrollController],
    providers: [
        PayrollService,
        PayrollCalculationService,
        KenyaStatutoryService,
        StaffCompService,
        StatutoryExportService,
        PayslipPDFService,
    ],
    exports: [PayrollService, KenyaStatutoryService],
})
export class PayrollModule {}
