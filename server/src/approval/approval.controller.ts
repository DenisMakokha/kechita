import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, Req, BadRequestException, Ip,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalInstanceStatus } from './entities/approval-instance.entity';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalController {
    constructor(private readonly approvalService: ApprovalService) { }

    // ==================== APPROVAL FLOWS ====================

    @Get('flows')
    @Roles('CEO', 'HR_MANAGER')
    getFlows(@Query('targetType') targetType?: string) {
        return this.approvalService.getFlows(targetType);
    }

    @Get('flows/:id')
    @Roles('CEO', 'HR_MANAGER')
    getFlow(@Param('id') id: string) {
        return this.approvalService.getFlow(id);
    }

    @Post('flows')
    @Roles('CEO', 'HR_MANAGER')
    createFlow(@Body() data: any) {
        return this.approvalService.createFlow(data);
    }

    @Put('flows/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateFlow(@Param('id') id: string, @Body() data: any) {
        return this.approvalService.updateFlow(id, data);
    }

    @Post('flows/:id/steps')
    @Roles('CEO', 'HR_MANAGER')
    addStep(@Param('id') flowId: string, @Body() data: any) {
        return this.approvalService.addStepToFlow(flowId, data);
    }

    @Delete('flows/steps/:stepId')
    @Roles('CEO', 'HR_MANAGER')
    removeStep(@Param('stepId') stepId: string) {
        return this.approvalService.removeStep(stepId);
    }

    // ==================== PENDING APPROVALS ====================

    @Get('pending')
    getPendingApprovals(@Req() req: any) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.approvalService.getPendingApprovalsForStaff(staffId);
    }

    @Get('pending/role/:roleCode')
    @Roles('CEO', 'HR_MANAGER')
    getPendingForRole(@Param('roleCode') roleCode: string) {
        return this.approvalService.getPendingApprovalsForRole(roleCode);
    }

    @Get('my-submissions')
    getMySubmissions(@Req() req: any) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.approvalService.getMySubmittedApprovals(staffId);
    }

    // ==================== APPROVAL INSTANCES ====================

    @Get('instances/:id')
    getInstance(@Param('id') id: string) {
        return this.approvalService.getInstance(id);
    }

    @Get('target/:targetType/:targetId')
    getByTarget(
        @Param('targetType') targetType: string,
        @Param('targetId') targetId: string,
    ) {
        return this.approvalService.getInstanceByTarget(targetType, targetId);
    }

    @Get('instances/:id/history')
    getHistory(@Param('id') id: string) {
        return this.approvalService.getApprovalHistory(id);
    }

    // ==================== APPROVE / REJECT ====================

    @Post('instances/:id/approve')
    approveInstance(
        @Param('id') id: string,
        @Req() req: any,
        @Body('comment') comment?: string,
        @Ip() ip?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.approvalService.approveStep(id, staffId, comment, ip);
    }

    @Post('instances/:id/reject')
    rejectInstance(
        @Param('id') id: string,
        @Req() req: any,
        @Body('comment') comment: string,
        @Ip() ip?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!comment) throw new BadRequestException('Rejection reason is required');
        return this.approvalService.rejectStep(id, staffId, comment, ip);
    }

    @Post('instances/:id/cancel')
    @Roles('CEO', 'HR_MANAGER')
    cancelInstance(
        @Param('id') id: string,
        @Body('reason') reason?: string,
    ) {
        return this.approvalService.cancelApproval(id, reason);
    }

    // ==================== STATS ====================

    @Get('stats')
    getStats(@Req() req: any, @Query('all') all?: string) {
        const staffId = all === 'true' ? undefined : req.user?.staff_id;
        return this.approvalService.getApprovalStats(staffId);
    }
}
