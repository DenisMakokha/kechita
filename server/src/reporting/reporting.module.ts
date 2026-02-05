import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { KpiService } from './kpi.service';
import { BranchDailyReport } from './entities/branch-daily-report.entity';
import { Branch } from '../org/entities/branch.entity';

@Module({
    imports: [TypeOrmModule.forFeature([BranchDailyReport, Branch])],
    controllers: [ReportingController],
    providers: [ReportingService, KpiService],
    exports: [ReportingService, KpiService],
})
export class ReportingModule { }

