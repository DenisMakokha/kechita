import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryBand } from './entities/salary-band.entity';
import { BenefitPlan } from './entities/benefit-plan.entity';
import { BenefitEnrollment } from './entities/benefit-enrollment.entity';
import { CompBenefitsController } from './comp-benefits.controller';
import { CompBenefitsService } from './comp-benefits.service';

@Module({
    imports: [TypeOrmModule.forFeature([SalaryBand, BenefitPlan, BenefitEnrollment])],
    controllers: [CompBenefitsController],
    providers: [CompBenefitsService],
    exports: [CompBenefitsService],
})
export class CompBenefitsModule {}
