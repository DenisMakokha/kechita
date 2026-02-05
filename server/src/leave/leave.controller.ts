import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, Req, BadRequestException,
} from '@nestjs/common';
import { LeaveService, CreateLeaveRequestDto } from './leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LeaveRequestStatus } from './entities/leave-request.entity';

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
    getMyLeaveTypes(@Req() req: any) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.getLeaveTypesForStaff(staffId);
    }

    @Post('types')
    @Roles('CEO', 'HR_MANAGER')
    createLeaveType(@Body() data: any) {
        return this.leaveService.createLeaveType(data);
    }

    @Put('types/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateLeaveType(@Param('id') id: string, @Body() data: any) {
        return this.leaveService.updateLeaveType(id, data);
    }

    // ==================== LEAVE REQUESTS ====================

    @Post('request')
    requestLeave(@Body() dto: CreateLeaveRequestDto, @Req() req: any) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.requestLeave(staffId, dto);
    }

    @Get('my-requests')
    getMyRequests(@Req() req: any, @Query('year') year?: string) {
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
    getLeaveRequest(@Param('id') id: string) {
        return this.leaveService.getLeaveRequest(id);
    }

    @Patch('requests/:id/cancel')
    cancelRequest(
        @Param('id') id: string,
        @Req() req: any,
        @Body('reason') reason?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.cancelLeaveRequest(id, staffId, reason);
    }

    // ==================== LEAVE BALANCES ====================

    @Get('my-balance')
    getMyBalance(@Req() req: any, @Query('year') year?: string) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.leaveService.getMyBalance(staffId, year ? parseInt(year) : undefined);
    }

    @Get('balance/:staffId')
    @Roles('CEO', 'HR_MANAGER')
    getStaffBalance(
        @Param('staffId') staffId: string,
        @Query('year') year?: string,
    ) {
        return this.leaveService.getMyBalance(staffId, year ? parseInt(year) : undefined);
    }

    @Post('balance/:staffId/adjust')
    @Roles('CEO', 'HR_MANAGER')
    adjustBalance(
        @Param('staffId') staffId: string,
        @Body('leaveTypeId') leaveTypeId: string,
        @Body('adjustmentDays') adjustmentDays: number,
        @Body('reason') reason: string,
        @Body('year') year?: number,
        @Req() req?: any,
    ) {
        const adjustedBy = req?.user?.id || 'system';
        return this.leaveService.adjustBalance(staffId, leaveTypeId, adjustmentDays, reason, adjustedBy, year);
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
    getLeaveStats(
        @Query('year') year?: string,
        @Query('branchId') branchId?: string,
    ) {
        return this.leaveService.getLeaveStats(year ? parseInt(year) : undefined, branchId);
    }

    // ==================== CONFLICT DETECTION ====================

    @Get('requests/:id/conflicts')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    checkRequestConflicts(@Param('id') id: string) {
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
    createPublicHoliday(@Body() data: any) {
        return this.leaveService.createPublicHoliday(data);
    }

    @Delete('holidays/:id')
    @Roles('CEO', 'HR_MANAGER')
    deletePublicHoliday(@Param('id') id: string) {
        return this.leaveService.deletePublicHoliday(id);
    }
}
