import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DisciplinaryService } from './disciplinary.service';
import { DisciplinaryCase, CaseStatus, DisciplinaryOutcome } from './entities/disciplinary-case.entity';

@Controller('disciplinary')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisciplinaryController {
    constructor(private readonly svc: DisciplinaryService) {}

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    stats() { return this.svc.getStats(); }

    @Get('cases')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    list(@Query('staff_id') staff_id?: string, @Query('status') status?: CaseStatus, @Query('type') type?: string) {
        return this.svc.list({ staff_id, status, type });
    }

    @Get('cases/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    get(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }

    @Post('cases')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')
    create(@Body() dto: Partial<DisciplinaryCase>, @Req() req: AuthenticatedRequest) {
        return this.svc.create({ ...dto, raised_by_staff_id: req.user?.staff_id });
    }

    @Patch('cases/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<DisciplinaryCase>) {
        return this.svc.update(id, dto);
    }

    @Post('cases/:id/schedule-hearing')
    @Roles('CEO', 'HR_MANAGER')
    scheduleHearing(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { date: string; location?: string; panel?: any[] }) {
        return this.svc.scheduleHearing(id, dto.date, dto.location, dto.panel);
    }

    @Post('cases/:id/outcome')
    @Roles('CEO', 'HR_MANAGER')
    outcome(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { outcome: DisciplinaryOutcome; notes: string; suspension_days?: number }) {
        return this.svc.recordOutcome(id, dto.outcome, dto.notes, dto.suspension_days);
    }

    @Post('cases/:id/appeal')
    appeal(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { reason: string }) {
        return this.svc.appeal(id, dto.reason);
    }

    @Post('cases/:id/close')
    @Roles('CEO', 'HR_MANAGER')
    close(@Param('id', ParseUUIDPipe) id: string) { return this.svc.close(id); }

    @Get('staff/:staffId/active-warnings')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    activeWarnings(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.svc.getActiveWarnings(staffId);
    }
}
