import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, UseInterceptors, Req, BadRequestException, Ip, ParseUUIDPipe,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalInstanceStatus } from './entities/approval-instance.entity';
import { CreateApprovalFlowDto, UpdateApprovalFlowDto } from './dto/approval-flow.dto';
import { CreateApprovalStepDto } from './dto/approval-step.dto';
import { ApproveDto, RejectDto, CancelDto } from './dto/approval-action.dto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

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
    getFlow(@Param('id', ParseUUIDPipe) id: string) {
        return this.approvalService.getFlow(id);
    }

    @Post('flows')
    @Roles('CEO', 'HR_MANAGER')
    createFlow(@Body() dto: CreateApprovalFlowDto) {
        return this.approvalService.createFlow(dto);
    }

    @Put('flows/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateFlow(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateApprovalFlowDto) {
        return this.approvalService.updateFlow(id, dto);
    }

    @Post('flows/:id/steps')
    @Roles('CEO', 'HR_MANAGER')
    addStep(@Param('id', ParseUUIDPipe) flowId: string, @Body() dto: CreateApprovalStepDto) {
        return this.approvalService.addStepToFlow(flowId, dto);
    }

    @Delete('flows/steps/:stepId')
    @Roles('CEO', 'HR_MANAGER')
    removeStep(@Param('stepId', ParseUUIDPipe) stepId: string) {
        return this.approvalService.removeStep(stepId);
    }

    // ==================== PENDING APPROVALS ====================

    @Get('pending')
    getPendingApprovals(@Req() req: AuthenticatedRequest) {
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
    getMySubmissions(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.approvalService.getMySubmittedApprovals(staffId);
    }

    // ==================== APPROVAL INSTANCES ====================

    @Get('instances/:id')
    getInstance(@Param('id', ParseUUIDPipe) id: string) {
        return this.approvalService.getInstance(id);
    }

    @Get('target/:targetType/:targetId')
    getByTarget(
        @Param('targetType') targetType: string,
        @Param('targetId', ParseUUIDPipe) targetId: string,
    ) {
        return this.approvalService.getInstanceByTarget(targetType, targetId);
    }

    @Get('instances/:id/history')
    getHistory(@Param('id', ParseUUIDPipe) id: string) {
        return this.approvalService.getApprovalHistory(id);
    }

    // ==================== APPROVE / REJECT ====================

    @Post('instances/:id/approve')
    approveInstance(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: ApproveDto,
        @Ip() ip?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.approvalService.approveStep(id, staffId, dto.comment, ip);
    }

    @Post('instances/:id/reject')
    rejectInstance(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: RejectDto,
        @Ip() ip?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.approvalService.rejectStep(id, staffId, dto.comment, ip);
    }

    @Post('instances/:id/cancel')
    @Roles('CEO', 'HR_MANAGER')
    cancelInstance(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelDto,
    ) {
        return this.approvalService.cancelApproval(id, dto.reason);
    }

    // ==================== STATS ====================

    @Get('stats')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(30000)
    getStats(@Req() req: AuthenticatedRequest, @Query('all') all?: string) {
        const staffId = all === 'true' ? undefined : req.user?.staff_id;
        return this.approvalService.getApprovalStats(staffId);
    }

    // ==================== FLOW ACTIVATION ====================

    @Patch('flows/:id/activate')
    @Roles('CEO', 'HR_MANAGER')
    activateFlow(@Param('id', ParseUUIDPipe) id: string) {
        return this.approvalService.activateFlow(id);
    }

    @Patch('flows/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    deactivateFlow(@Param('id', ParseUUIDPipe) id: string) {
        return this.approvalService.deactivateFlow(id);
    }

    @Delete('flows/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteFlow(@Param('id', ParseUUIDPipe) id: string) {
        return this.approvalService.deleteFlow(id);
    }

    // ==================== STEP MANAGEMENT ====================

    @Put('flows/steps/:stepId')
    @Roles('CEO', 'HR_MANAGER')
    updateStep(
        @Param('stepId', ParseUUIDPipe) stepId: string,
        @Body() dto: Partial<CreateApprovalStepDto>,
    ) {
        return this.approvalService.updateStep(stepId, dto);
    }

    @Post('flows/:id/reorder-steps')
    @Roles('CEO', 'HR_MANAGER')
    reorderSteps(
        @Param('id', ParseUUIDPipe) flowId: string,
        @Body() data: { steps: { stepId: string; order: number }[] },
    ) {
        return this.approvalService.reorderSteps(flowId, data.steps);
    }

    // ==================== DELEGATE / RETURN ====================

    @Post('instances/:id/delegate')
    delegateApproval(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: { delegateToStaffId: string; reason: string },
        @Ip() ip?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!dto.delegateToStaffId) throw new BadRequestException('Delegate target is required');
        if (!dto.reason) throw new BadRequestException('Delegation reason is required');
        return this.approvalService.delegateApproval(id, staffId, dto.delegateToStaffId, dto.reason, ip);
    }

    @Post('instances/:id/return')
    returnForMoreInfo(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: { comment: string },
        @Ip() ip?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!dto.comment) throw new BadRequestException('Comment is required when returning for more info');
        return this.approvalService.returnForMoreInfo(id, staffId, dto.comment, ip);
    }
}
