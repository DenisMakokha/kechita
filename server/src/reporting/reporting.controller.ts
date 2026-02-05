import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReportingService } from './reporting.service';
import { KpiService } from './kpi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SubmitReportDto } from './reporting.service';
import { DailyReportDto } from './kpi.service';

@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
    constructor(
        private readonly reportingService: ReportingService,
        private readonly kpiService: KpiService,
    ) { }

    @Post('daily')
    @Roles('BRANCH_MANAGER', 'RELATIONSHIP_OFFICER')
    submitDailyReport(
        @Request() req: any,
        @Body() dto: SubmitReportDto,
    ) {
        return this.reportingService.submitReport(req.user.staff_id, dto.branch_id, dto);
    }

    @Get('branch/:branchId')
    @Roles('BRANCH_MANAGER', 'REGIONAL_MANAGER', 'CEO', 'HR_MANAGER')
    getByBranch(@Param('branchId') branchId: string) {
        return this.reportingService.getReportsByBranch(branchId);
    }

    @Get('region/:regionId')
    @Roles('REGIONAL_MANAGER', 'CEO', 'HR_MANAGER')
    getByRegion(@Param('regionId') regionId: string) {
        return this.reportingService.getReportsByRegion(regionId);
    }

    @Post(':id/approve')
    @Roles('REGIONAL_MANAGER', 'CEO')
    approveReport(@Param('id') id: string, @Body() body: { comment?: string }) {
        return this.reportingService.approveReport(id, body.comment);
    }

    @Get('dashboard/ceo')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
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
    submitKPIReport(@Body() dto: DailyReportDto, @Request() req: any) {
        return this.kpiService.submitDailyReport(dto, req.user?.staff_id);
    }

    @Post('kpi/import/csv')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    @UseInterceptors(FileInterceptor('file'))
    async importCsv(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
        const csvContent = file.buffer.toString('utf-8');
        return this.kpiService.importFromCsv(csvContent, req.user?.staff_id);
    }

    @Post('kpi/import/excel')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    @UseInterceptors(FileInterceptor('file'))
    async importExcel(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
        return this.kpiService.importFromExcel(file.buffer, req.user?.staff_id);
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
    getBranchPAR(@Param('branchId') branchId: string, @Query('date') date: string) {
        return this.kpiService.getBranchPAR(branchId, new Date(date || Date.now()));
    }

    @Get('kpi/par/region/:regionId')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    getRegionalPAR(
        @Param('regionId') regionId: string,
        @Query('start') start: string,
        @Query('end') end: string,
    ) {
        const startDate = new Date(start || new Date().setDate(1));
        const endDate = new Date(end || Date.now());
        return this.kpiService.getRegionalPARSummary(regionId, startDate, endDate);
    }
}

