import {
    Controller, Get, Post, Put, Patch, Delete,
    Body, Param, Res, Req, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JobDescriptionService } from './job-description.service';

interface JdPayload {
    purpose?: string;
    notes?: string;
    responsibilities?: string[];
    qualifications?: string[];
    skills?: string[];
    kpis?: string[];
    reports_to?: string;
    working_conditions?: string;
    effective_from?: string;
}

@Controller('job-descriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobDescriptionController {
    constructor(private readonly svc: JobDescriptionService) {}

    /** All JDs (versions) for a position, newest first. */
    @Get('position/:positionId')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    list(@Param('positionId', ParseUUIDPipe) positionId: string) {
        return this.svc.listForPosition(positionId);
    }

    /** Currently-active JD for a position (or 404 if none). */
    @Get('position/:positionId/active')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    async getActive(@Param('positionId', ParseUUIDPipe) positionId: string) {
        const jd = await this.svc.findActiveForPosition(positionId);
        return jd || null;
    }

    @Get(':id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    get(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.findOne(id);
    }

    @Post('position/:positionId')
    @Roles('CEO', 'HR_MANAGER')
    create(
        @Param('positionId', ParseUUIDPipe) positionId: string,
        @Body() data: JdPayload,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.svc.create(positionId, data, req.user?.id);
    }

    @Put(':id')
    @Roles('CEO', 'HR_MANAGER')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() data: JdPayload) {
        return this.svc.update(id, data);
    }

    @Patch(':id')
    @Roles('CEO', 'HR_MANAGER')
    patch(@Param('id', ParseUUIDPipe) id: string, @Body() data: JdPayload) {
        return this.svc.update(id, data);
    }

    @Post(':id/activate')
    @Roles('CEO', 'HR_MANAGER')
    activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.svc.activate(id, req.user?.id);
    }

    @Delete(':id')
    @Roles('CEO', 'HR_MANAGER')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.remove(id);
    }

    @Get(':id/pdf')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    async downloadPdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: any) {
        const { buffer, fileName } = await this.svc.renderPdf(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.send(buffer);
    }
}
