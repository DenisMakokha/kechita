import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { KpiService } from './kpi.service';
import { BranchDailyReport } from './entities/branch-daily-report.entity';
import { Branch } from '../org/entities/branch.entity';
import { Staff } from '../staff/entities/staff.entity';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { Claim } from '../claims/entities/claim.entity';
import { StaffLoan } from '../loans/entities/staff-loan.entity';
import { Region } from '../org/entities/region.entity';

@Module({
    imports: [TypeOrmModule.forFeature([
        BranchDailyReport,
        Branch,
        Staff,
        LeaveRequest,
        Claim,
        StaffLoan,
        Region,
    ])],
    controllers: [ReportingController],
    providers: [ReportingService, KpiService],
    exports: [ReportingService, KpiService],
})
export class ReportingModule { }

