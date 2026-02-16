import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, Req, BadRequestException, ParseUUIDPipe, UseInterceptors,
    UploadedFile, HttpStatus,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LeaveRequestStatus } from './entities/leave-request.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';
import { CreatePublicHolidayDto } from './dto/public-holiday.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
    constructor(private readonly leaveService: LeaveService) { }

    // ==================== LEAVE TYPES ====================

    @Get('types')
    getLeaveTypes(@Query('activeOnly') activeOnly?: string) {
        return this.leaveService.getLeaveTypes(activeOnly !== 'false');
    }

    @Get('types/for-me')
    getMyLeaveTypes(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.getLeaveTypesForStaff(staffId);
    }

    @Post('types')
    @Roles('CEO', 'HR_MANAGER')
    createLeaveType(@Body() dto: CreateLeaveTypeDto) {
        return this.leaveService.createLeaveType(dto);
    }

    @Put('types/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateLeaveType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeaveTypeDto) {
        return this.leaveService.updateLeaveType(id, dto);
    }

    // ==================== LEAVE REQUESTS ====================

    @Post('request')
    requestLeave(@Body() dto: CreateLeaveRequestDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.requestLeave(staffId, dto);
    }

    @Get('my-requests')
    getMyRequests(@Req() req: AuthenticatedRequest, @Query('year') year?: string) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.findMyRequests(staffId, year ? parseInt(year) : undefined);
    }

    @Get('requests')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getAllRequests(
        @Query('status') status?: LeaveRequestStatus,
        @Query('branchId') branchId?: string,
        @Query('departmentId') departmentId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.leaveService.findAllRequests({ status, branchId, departmentId, startDate, endDate });
    }

    @Get('requests/:id')
    getLeaveRequest(@Param('id', ParseUUIDPipe) id: string) {
        return this.leaveService.getLeaveRequest(id);
    }

    @Patch('requests/:id/cancel')
    cancelRequest(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body('reason') reason?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.cancelLeaveRequest(id, staffId, reason);
    }

    @Patch('requests/:id/approve')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    approveRequest(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body('comment') comment?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.approveLeaveRequest(id, staffId, comment);
    }

    @Patch('requests/:id/reject')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    rejectRequest(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body('reason') reason: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!reason) throw new BadRequestException('Rejection reason is required');
        return this.leaveService.rejectLeaveRequest(id, staffId, reason);
    }

    // ==================== LEAVE BALANCES ====================

    @Get('my-balance')
    getMyBalance(@Req() req: AuthenticatedRequest, @Query('year') year?: string) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.getMyBalance(staffId, year ? parseInt(year) : undefined);
    }

    @Get('balance/:staffId')
    @Roles('CEO', 'HR_MANAGER')
    getStaffBalance(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Query('year') year?: string,
    ) {
        return this.leaveService.getMyBalance(staffId, year ? parseInt(year) : undefined);
    }

    @Post('balance/:staffId/adjust')
    @Roles('CEO', 'HR_MANAGER')
    adjustBalance(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Body() dto: AdjustBalanceDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const adjustedBy = req.user?.id || 'system';
        return this.leaveService.adjustBalance(
            staffId,
            dto.leaveTypeId,
            dto.adjustmentDays,
            dto.reason,
            adjustedBy,
            dto.year,
        );
    }

    @Post('balance/initialize')
    @Roles('CEO', 'HR_MANAGER')
    initializeYearlyBalances(@Body('year') year: number) {
        return this.leaveService.initializeYearlyBalances(year);
    }

    // ==================== CALENDAR & REPORTS ====================

    @Get('calendar')
    getLeaveCalendar(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('branchId') branchId?: string,
    ) {
        if (!startDate || !endDate) {
            throw new BadRequestException('startDate and endDate are required');
        }
        return this.leaveService.getLeaveCalendar(startDate, endDate, branchId);
    }

    @Get('on-leave-today')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getStaffOnLeaveToday(@Query('branchId') branchId?: string) {
        return this.leaveService.getStaffOnLeaveToday(branchId);
    }

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(60000)
    getLeaveStats(
        @Query('year') year?: string,
        @Query('branchId') branchId?: string,
    ) {
        return this.leaveService.getLeaveStats(year ? parseInt(year) : undefined, branchId);
    }

    // ==================== CONFLICT DETECTION ====================

    @Get('requests/:id/conflicts')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    checkRequestConflicts(@Param('id', ParseUUIDPipe) id: string) {
        return this.leaveService.checkConflicts(id);
    }

    @Get('conflicts/upcoming')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getUpcomingConflicts(
        @Query('branchId') branchId: string,
        @Query('daysAhead') daysAhead?: string,
    ) {
        if (!branchId) {
            throw new BadRequestException('branchId is required');
        }
        return this.leaveService.getUpcomingConflicts(
            branchId,
            daysAhead ? parseInt(daysAhead) : 30
        );
    }

    // ==================== PUBLIC HOLIDAYS ====================

    @Get('holidays')
    getPublicHolidays(@Query('year') year?: string) {
        return this.leaveService.getPublicHolidays(year ? parseInt(year) : undefined);
    }

    @Post('holidays')
    @Roles('CEO', 'HR_MANAGER')
    createPublicHoliday(@Body() dto: CreatePublicHolidayDto) {
        return this.leaveService.createPublicHoliday(dto);
    }

    @Delete('holidays/:id')
    @Roles('CEO', 'HR_MANAGER')
    deletePublicHoliday(@Param('id', ParseUUIDPipe) id: string) {
        return this.leaveService.deletePublicHoliday(id);
    }

    @Put('holidays/:id')
    @Roles('CEO', 'HR_MANAGER')
    updatePublicHoliday(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: { name?: string; date?: string; is_recurring?: boolean },
    ) {
        return this.leaveService.updatePublicHoliday(id, {
            name: dto.name,
            date: dto.date ? new Date(dto.date) : undefined,
            is_recurring: dto.is_recurring,
        });
    }

    // ==================== LEAVE TYPE ACTIVATION ====================

    @Patch('types/:id/activate')
    @Roles('CEO', 'HR_MANAGER')
    activateLeaveType(@Param('id', ParseUUIDPipe) id: string) {
        return this.leaveService.activateLeaveType(id);
    }

    @Patch('types/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    deactivateLeaveType(@Param('id', ParseUUIDPipe) id: string) {
        return this.leaveService.deactivateLeaveType(id);
    }

    // ==================== RECALL LEAVE ====================

    @Patch('requests/:id/recall')
    recallLeave(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body('reason') reason: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!reason) throw new BadRequestException('Reason is required to recall leave');
        return this.leaveService.recallLeave(id, staffId, reason);
    }

    // ==================== TEAM REQUESTS ====================

    @Get('team/requests')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getTeamRequests(
        @Req() req: AuthenticatedRequest,
        @Query('status') status?: LeaveRequestStatus,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.getTeamRequests(staffId, status);
    }

    @Get('team/pending')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getPendingTeamRequests(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.getPendingTeamRequests(staffId);
    }

    // ==================== ACCRUAL & CARRY FORWARD (Admin) ====================

    @Post('admin/process-accrual')
    @Roles('CEO', 'HR_MANAGER')
    processMonthlyAccrual(
        @Body('year') year?: number,
        @Body('month') month?: number,
    ) {
        return this.leaveService.processMonthlyAccrual(year, month);
    }

    @Post('admin/process-carry-forward')
    @Roles('CEO', 'HR_MANAGER')
    processCarryForward(@Body('fromYear') fromYear: number) {
        if (!fromYear) throw new BadRequestException('fromYear is required');
        return this.leaveService.processYearEndCarryForward(fromYear);
    }
}
