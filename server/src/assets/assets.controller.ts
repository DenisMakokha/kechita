import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AssetsService } from './assets.service';
import { Asset, AssetStatus } from './entities/asset.entity';
import { AssignmentStatus } from './entities/asset-assignment.entity';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
    constructor(private readonly svc: AssetsService) {}

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'ACCOUNTANT')
    stats() { return this.svc.getStats(); }

    @Get()
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'ACCOUNTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')
    list(@Query('category') category?: string, @Query('status') status?: AssetStatus, @Query('branch_id') branch_id?: string) {
        return this.svc.list({ category, status, branch_id });
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }

    @Post()
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    create(@Body() dto: Partial<Asset>) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Asset>) { return this.svc.update(id, dto); }

    @Post(':id/retire')
    @Roles('CEO', 'HR_MANAGER')
    retire(@Param('id', ParseUUIDPipe) id: string) { return this.svc.retire(id); }

    // Assignments
    @Post('assign')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    assign(@Body() dto: { asset_id: string; staff_id: string; assigned_at?: string; condition?: any; notes?: string }, @Req() req: AuthenticatedRequest) {
        return this.svc.assign({ ...dto, issued_by_user_id: req.user?.sub });
    }

    @Post('assignments/:id/return')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    returnAsset(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { condition?: any; deduction_amount?: number; notes?: string; status?: AssignmentStatus }, @Req() req: AuthenticatedRequest) {
        return this.svc.returnAsset(id, { ...dto, received_by_user_id: req.user?.sub });
    }

    @Get('staff/:staffId/assignments')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')
    staffAssets(@Param('staffId', ParseUUIDPipe) staffId: string, @Query('active_only') a?: string) {
        return this.svc.listStaffAssets(staffId, a === 'true');
    }

    @Get('my/assignments')
    async myAssets(@Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) return [];
        return this.svc.listStaffAssets(req.user.staff_id);
    }
}
