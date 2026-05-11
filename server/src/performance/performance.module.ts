import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewCycle } from './entities/review-cycle.entity';
import { Review } from './entities/review.entity';
import { Goal } from './entities/goal.entity';
import { KeyResult } from './entities/key-result.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './services/performance.service';

@Module({
    imports: [TypeOrmModule.forFeature([ReviewCycle, Review, Goal, KeyResult, Staff])],
    controllers: [PerformanceController],
    providers: [PerformanceService],
    exports: [PerformanceService],
})
export class PerformanceModule {}
