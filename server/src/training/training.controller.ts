import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TrainingService } from './training.service';
import { TrainingProgram } from './entities/training-program.entity';
import { TrainingSession } from './entities/training-session.entity';
import { TrainingEnrollment } from './entities/training-enrollment.entity';

@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingController {
    constructor(private readonly svc: TrainingService) {}

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    stats() { return this.svc.getStats(); }

    @Get('programs')
    listPrograms(@Query('active_only') a?: string) { return this.svc.listPrograms(a === 'true'); }

    @Get('programs/:id')
    getProgram(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getProgram(id); }

    @Post('programs')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    createProgram(@Body() dto: Partial<TrainingProgram>) { return this.svc.createProgram(dto); }

    @Patch('programs/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    updateProgram(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<TrainingProgram>) { return this.svc.updateProgram(id, dto); }

    @Delete('programs/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteProgram(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteProgram(id); }

    @Get('sessions')
    listSessions(@Query('program_id') programId?: string) { return this.svc.listSessions(programId); }

    @Get('sessions/:id')
    getSession(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getSession(id); }

    @Post('sessions')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    createSession(@Body() dto: Partial<TrainingSession> & { program_id: string }) { return this.svc.createSession(dto); }

    @Patch('sessions/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    updateSession(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<TrainingSession>) { return this.svc.updateSession(id, dto); }

    @Post('sessions/:id/enroll')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    enroll(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { staff_ids: string[] }) {
        return this.svc.enroll(id, dto.staff_ids);
    }

    @Patch('enrollments/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    updateEnrollment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<TrainingEnrollment>) {
        return this.svc.updateEnrollment(id, dto);
    }

    @Get('my/enrollments')
    async myEnrollments(@Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) return [];
        return this.svc.listMyTrainings(req.user.staff_id);
    }

    @Get('staff/:staffId/enrollments')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')
    staffEnrollments(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.svc.listStaffEnrollments(staffId);
    }

    @Get('certificates/expiring')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    expiring(@Query('days') days?: string) {
        return this.svc.getExpiringCertificates(days ? parseInt(days) : 60);
    }
}
