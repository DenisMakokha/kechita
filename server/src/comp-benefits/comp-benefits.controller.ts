import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompBenefitsService } from './comp-benefits.service';
import { SalaryBand } from './entities/salary-band.entity';
import { BenefitPlan } from './entities/benefit-plan.entity';
import { BenefitEnrollment } from './entities/benefit-enrollment.entity';

@Controller('comp-benefits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompBenefitsController {
    constructor(private readonly svc: CompBenefitsService) {}

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER')
    stats() { return this.svc.getStats(); }

    // Salary Bands
    @Get('bands')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'ACCOUNTANT')
    listBands(@Query('active_only') a?: string) { return this.svc.listBands(a === 'true'); }

    @Post('bands')
    @Roles('CEO', 'HR_MANAGER')
    createBand(@Body() dto: Partial<SalaryBand>) { return this.svc.createBand(dto); }

    @Patch('bands/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateBand(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<SalaryBand>) { return this.svc.updateBand(id, dto); }

    @Delete('bands/:id')
    @Roles('CEO')
    deleteBand(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteBand(id); }

    // Benefit Plans
    @Get('plans')
    listPlans(@Query('active_only') a?: string) { return this.svc.listPlans(a === 'true'); }

    @Post('plans')
    @Roles('CEO', 'HR_MANAGER')
    createPlan(@Body() dto: Partial<BenefitPlan>) { return this.svc.createPlan(dto); }

    @Patch('plans/:id')
    @Roles('CEO', 'HR_MANAGER')
    updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<BenefitPlan>) { return this.svc.updatePlan(id, dto); }

    @Delete('plans/:id')
    @Roles('CEO')
    deletePlan(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deletePlan(id); }

    // Enrollments
    @Get('staff/:staffId/enrollments')
    listStaffEnrollments(@Param('staffId', ParseUUIDPipe) staffId: string) { return this.svc.listStaffEnrollments(staffId); }

    @Get('plans/:planId/enrollments')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    listPlanEnrollments(@Param('planId', ParseUUIDPipe) planId: string) { return this.svc.listPlanEnrollments(planId); }

    @Get('my/enrollments')
    async myEnrollments(@Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) return [];
        return this.svc.listStaffEnrollments(req.user.staff_id);
    }

    @Post('enrollments')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    enroll(@Body() dto: Partial<BenefitEnrollment>) { return this.svc.enroll(dto); }

    @Patch('enrollments/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    updateEnrollment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<BenefitEnrollment>) {
        return this.svc.updateEnrollment(id, dto);
    }

    @Post('enrollments/:id/terminate')
    @Roles('CEO', 'HR_MANAGER')
    terminate(@Param('id', ParseUUIDPipe) id: string) { return this.svc.terminateEnrollment(id); }
}
