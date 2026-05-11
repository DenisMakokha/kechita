import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AttendanceService } from './services/attendance.service';
import {
    CreateShiftDto, UpdateShiftDto, AssignRosterDto,
    ClockInRequestDto, ClockOutRequestDto, ManualEntryDto, RejectEntryDto,
} from './dto/attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
    constructor(private readonly svc: AttendanceService) {}

    // ─── Shifts (admin) ───
    @Get('shifts')
    listShifts(@Query('active_only') activeOnly?: string) {
        return this.svc.listShifts(activeOnly === 'true');
    }

    @Post('shifts')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    createShift(@Body() dto: CreateShiftDto) {
        return this.svc.createShift(dto);
    }

    @Patch('shifts/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    updateShift(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShiftDto) {
        return this.svc.updateShift(id, dto);
    }

    @Delete('shifts/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteShift(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.deleteShift(id);
    }

    // ─── Roster ───
    @Get('roster/staff/:staffId')
    getStaffRoster(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        if (!from || !to) throw new BadRequestException('from and to are required (YYYY-MM-DD)');
        return this.svc.getRoster(staffId, from, to);
    }

    @Get('roster/branch/:branchId')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getBranchRoster(
        @Param('branchId', ParseUUIDPipe) branchId: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        if (!from || !to) throw new BadRequestException('from and to are required');
        return this.svc.getBranchRoster(branchId, from, to);
    }

    @Post('roster/assign')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    assignRoster(@Body() dto: AssignRosterDto) {
        return this.svc.assignRoster(dto.assignments);
    }

    // ─── Clock In / Out (self) ───
    @Post('clock-in')
    async clockIn(@Body() dto: ClockInRequestDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Authenticated user is not linked to a staff record');
        const ip = (req.ip || (req as any).socket?.remoteAddress || '').toString();
        return this.svc.clockIn({ staff_id: staffId, ...dto, ip });
    }

    @Post('clock-out')
    async clockOut(@Body() dto: ClockOutRequestDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Authenticated user is not linked to a staff record');
        const ip = (req.ip || (req as any).socket?.remoteAddress || '').toString();
        return this.svc.clockOut({ staff_id: staffId, ...dto, ip });
    }

    @Get('today')
    async getToday(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) return null;
        return this.svc.getTodayEntry(staffId);
    }

    @Get('my/entries')
    async getMyEntries(
        @Req() req: AuthenticatedRequest,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) return [];
        if (!from || !to) throw new BadRequestException('from and to are required');
        return this.svc.listEntries(staffId, from, to);
    }

    @Get('my/summary/:year/:month')
    async getMyMonthly(
        @Req() req: AuthenticatedRequest,
        @Param('year') year: string,
        @Param('month') month: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) return null;
        return this.svc.monthlySummary(staffId, parseInt(year), parseInt(month));
    }

    // ─── Admin views ───
    @Get('entries')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT')
    listEntries(
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('branch_id') branchId?: string,
    ) {
        if (!from || !to) throw new BadRequestException('from and to are required');
        return this.svc.listAllEntries(from, to, branchId);
    }

    @Get('staff/:staffId/entries')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT')
    listStaffEntries(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Query('from') from: string,
        @Query('to') to: string,
    ) {
        if (!from || !to) throw new BadRequestException('from and to are required');
        return this.svc.listEntries(staffId, from, to);
    }

    @Get('staff/:staffId/summary/:year/:month')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'ACCOUNTANT')
    staffMonthly(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Param('year') year: string,
        @Param('month') month: string,
    ) {
        return this.svc.monthlySummary(staffId, parseInt(year), parseInt(month));
    }

    @Patch('entries/:id/approve')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    approveEntry(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.svc.approveEntry(id, req.user!.sub);
    }

    @Patch('entries/:id/reject')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    rejectEntry(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectEntryDto, @Req() req: AuthenticatedRequest) {
        return this.svc.rejectEntry(id, dto.reason, req.user!.sub);
    }

    @Post('entries/manual')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    manualEntry(@Body() dto: ManualEntryDto) {
        return this.svc.manualEntry({
            staff_id: dto.staff_id,
            date: dto.date,
            clock_in_at: new Date(dto.clock_in_at),
            clock_out_at: dto.clock_out_at ? new Date(dto.clock_out_at) : undefined,
            shift_id: dto.shift_id,
            notes: dto.notes,
        });
    }
}
