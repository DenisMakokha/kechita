import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, Res, UseInterceptors, UploadedFile, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReportingService } from './reporting.service';
import { KpiService } from './kpi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SubmitReportDto } from './reporting.service';
import { DailyReportDto } from './kpi.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ApproveReportDto } from './dto/reporting.dto';

@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
    constructor(
        private readonly reportingService: ReportingService,
        private readonly kpiService: KpiService,
    ) { }

    @Post('daily')
    @Roles('BRANCH_MANAGER', 'RELATIONSHIP_OFFICER', 'BDM')
    submitDailyReport(
        @Req() req: AuthenticatedRequest,
        @Body() dto: SubmitReportDto,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.reportingService.submitReport(staffId, dto.branch_id, dto);
    }

    @Get('branch/:branchId')
    @Roles('BRANCH_MANAGER', 'REGIONAL_MANAGER', 'CEO', 'HR_MANAGER')
    getByBranch(@Param('branchId', ParseUUIDPipe) branchId: string) {
        return this.reportingService.getReportsByBranch(branchId);
    }

    @Get('region/:regionId')
    @Roles('REGIONAL_MANAGER', 'CEO', 'HR_MANAGER')
    getByRegion(@Param('regionId', ParseUUIDPipe) regionId: string) {
        return this.reportingService.getReportsByRegion(regionId);
    }

    @Post(':id/approve')
    @Roles('REGIONAL_MANAGER', 'CEO')
    approveReport(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveReportDto) {
        return this.reportingService.approveReport(id, dto.comment);
    }

    @Get('dashboard/ceo')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'ACCOUNTANT')
    getCEODashboard() {
        return this.reportingService.getCEODashboard();
    }

    @Get('export/excel')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'ACCOUNTANT')
    async exportExcel(
        @Query('type') type: 'summary' | 'regional' | 'branches' = 'summary',
        @Res() res: Response,
    ) {
        const buffer = await this.reportingService.exportToExcel(type);
        const filename = `kechita-report-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    }

    @Get('export/pdf')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'ACCOUNTANT')
    async exportPdf(
        @Query('type') type: string = 'summary',
        @Res() res: Response,
    ) {
        const buffer = await this.reportingService.exportToPdf(type);
        const filename = `kechita-report-${type}-${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    }

    @Get('analytics/trends')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    async getAnalyticsTrends() {
        const dashboard = await this.reportingService.getCEODashboard();
        return {
            monthlyTrends: dashboard.monthlyTrends,
            regionPerformance: dashboard.regionPerformance,
        };
    }

    // ==================== KPI ENDPOINTS ====================

    @Get('kpi/monthly/:year/:month')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'ACCOUNTANT')
    getMonthlyKPI(
        @Param('year') year: string,
        @Param('month') month: string,
    ) {
        return this.kpiService.getMonthlyKPISummary(parseInt(year), parseInt(month));
    }

    @Post('kpi/daily')
    @Roles('BRANCH_MANAGER', 'ACCOUNTANT')
    submitKPIReport(@Body() dto: DailyReportDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.kpiService.submitDailyReport(dto, staffId);
    }

    @Post('kpi/import/csv')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
    async importCsv(@UploadedFile() file: Express.Multer.File, @Req() req: AuthenticatedRequest) {
        const csvContent = file.buffer.toString('utf-8');
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.kpiService.importFromCsv(csvContent, staffId);
    }

    @Post('kpi/import/excel')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
    async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.kpiService.importFromExcel(file.buffer, staffId);
    }

    @Get('kpi/template')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    async getImportTemplate(@Res() res: Response) {
        const buffer = await this.kpiService.generateImportTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="kpi_import_template.xlsx"');
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    }

    @Get('kpi/par/:branchId')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getBranchPAR(@Param('branchId', ParseUUIDPipe) branchId: string, @Query('date') date: string) {
        return this.kpiService.getBranchPAR(branchId, new Date(date || Date.now()));
    }

    @Get('kpi/par/region/:regionId')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    getRegionalPAR(
        @Param('regionId', ParseUUIDPipe) regionId: string,
        @Query('start') start: string,
        @Query('end') end: string,
    ) {
        const startDate = new Date(start || new Date().setDate(1));
        const endDate = new Date(end || Date.now());
        return this.kpiService.getRegionalPARSummary(regionId, startDate, endDate);
    }

    // ==================== GET SINGLE REPORT ====================

    @Get(':id')
    @Roles('BRANCH_MANAGER', 'REGIONAL_MANAGER', 'CEO', 'HR_MANAGER')
    getReportById(@Param('id', ParseUUIDPipe) id: string) {
        return this.reportingService.getReportById(id);
    }

    // ==================== MY REPORTS ====================

    @Get('my/reports')
    @Roles('BRANCH_MANAGER', 'RELATIONSHIP_OFFICER')
    getMyReports(
        @Req() req: AuthenticatedRequest,
        @Query('status') status?: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.reportingService.getMyReports(staffId, status);
    }

    // ==================== REJECT REPORT ====================

    @Post(':id/reject')
    @Roles('REGIONAL_MANAGER', 'CEO')
    rejectReport(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason: string,
    ) {
        if (!reason) throw new BadRequestException('Rejection reason is required');
        return this.reportingService.rejectReport(id, reason);
    }

    // ==================== UPDATE DRAFT ====================

    @Patch(':id')
    @Roles('BRANCH_MANAGER', 'RELATIONSHIP_OFFICER')
    updateDraftReport(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: SubmitReportDto,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.reportingService.updateDraftReport(id, staffId, dto);
    }

    // ==================== DELETE DRAFT ====================

    @Delete(':id')
    @Roles('BRANCH_MANAGER', 'RELATIONSHIP_OFFICER')
    deleteDraftReport(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.reportingService.deleteDraftReport(id, staffId);
    }
}

