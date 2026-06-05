import {
    Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Res,
    UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PayrollService } from './services/payroll.service';
import { StaffCompService } from './services/staff-comp.service';
import { StatutoryExportService } from './services/statutory-export.service';
import { PayslipPDFService } from './services/payslip-pdf.service';
import { KenyaStatutoryService } from './services/kenya-statutory.service';
import {
    CreatePeriodDto, UpdatePeriodDto, CreateRunDto, CancelRunDto,
    CreateAllowanceDto, UpdateAllowanceDto,
    CreateDeductionDto, UpdateDeductionDto,
} from './dto/payroll.dto';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
    constructor(
        private readonly payroll: PayrollService,
        private readonly comp: StaffCompService,
        private readonly stat: StatutoryExportService,
        private readonly pdf: PayslipPDFService,
        private readonly rates: KenyaStatutoryService,
    ) {}

    // ─────────── Statutory rates ───────────
    @Get('statutory/rates')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getRates() {
        return this.rates.getRates();
    }

    @Patch('statutory/rates')
    @Roles('CEO', 'HR_MANAGER')
    async updateRates(@Body() newRates: any, @Req() req: AuthenticatedRequest) {
        return this.rates.updateRates(newRates, req.user?.sub);
    }

    // ─────────── Periods ───────────
    @Get('periods')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    listPeriods() {
        return this.payroll.listPeriods();
    }

    @Get('periods/:id')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getPeriod(@Param('id', ParseUUIDPipe) id: string) {
        return this.payroll.getPeriod(id);
    }

    @Post('periods')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    createPeriod(@Body() dto: CreatePeriodDto) {
        return this.payroll.createPeriod(dto);
    }

    @Patch('periods/:id')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    updatePeriod(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePeriodDto) {
        return this.payroll.updatePeriod(id, dto);
    }

    @Patch('periods/:id/lock')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    lockPeriod(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.payroll.lockPeriod(id, req.user?.sub);
    }

    @Patch('periods/:id/close')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    closePeriod(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.payroll.closePeriod(id, req.user?.sub);
    }

    // ─────────── Runs ───────────
    @Get('runs')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    listRuns(@Query('period_id') periodId?: string) {
        return this.payroll.listRuns(periodId);
    }

    @Get('runs/:id')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getRun(@Param('id', ParseUUIDPipe) id: string) {
        return this.payroll.getRun(id);
    }

    @Post('runs')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    createRun(@Body() dto: CreateRunDto) {
        return this.payroll.createRun(dto);
    }

    @Post('runs/:id/calculate')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    calculateRun(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.payroll.calculateRun(id, req.user?.sub);
    }

    @Patch('runs/:id/approve')
    @Roles('CEO', 'HR_MANAGER')
    approveRun(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.payroll.approveRun(id, req.user?.sub);
    }

    @Patch('runs/:id/mark-paid')
    @Roles('CEO', 'ACCOUNTANT')
    markPaid(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        return this.payroll.markPaid(id, req.user?.sub);
    }

    @Patch('runs/:id/cancel')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    cancelRun(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelRunDto, @Req() req: AuthenticatedRequest) {
        return this.payroll.cancelRun(id, dto.reason, req.user?.sub);
    }

    // ─────────── Payslips ───────────
    @Get('runs/:id/payslips')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    listPayslips(@Param('id', ParseUUIDPipe) id: string) {
        return this.payroll.listPayslips(id);
    }

    @Get('payslips/:id')
    getPayslip(@Param('id', ParseUUIDPipe) id: string) {
        return this.payroll.getPayslip(id);
    }

    @Get('payslips/:id/pdf')
    async downloadPayslipPdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const buf = await this.pdf.generate(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="payslip-${id}.pdf"`,
            'Content-Length': buf.length.toString(),
        });
        res.send(buf);
    }

    @Get('my/payslips')
    async getMyPayslips(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) return [];
        return this.payroll.getStaffPayslips(staffId);
    }

    @Get('staff/:staffId/payslips')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'STAFF')
    getStaffPayslips(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.payroll.getStaffPayslips(staffId);
    }

    // ─────────── Statutory Exports (CSV) ───────────
    @Get('runs/:id/export/paye')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    async exportPAYE(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const csv = await this.stat.exportPAYE(id);
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="PAYE-${id}.csv"` });
        res.send(csv);
    }

    @Get('runs/:id/export/nssf')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    async exportNSSF(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const csv = await this.stat.exportNSSF(id);
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="NSSF-${id}.csv"` });
        res.send(csv);
    }

    @Get('runs/:id/export/shif')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    async exportSHIF(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const csv = await this.stat.exportSHIF(id);
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="SHIF-${id}.csv"` });
        res.send(csv);
    }

    @Get('runs/:id/export/housing-levy')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    async exportHousingLevy(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const csv = await this.stat.exportHousingLevy(id);
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="HousingLevy-${id}.csv"` });
        res.send(csv);
    }

    @Get('runs/:id/export/nita')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    async exportNITA(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const csv = await this.stat.exportNITA(id);
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="NITA-${id}.csv"` });
        res.send(csv);
    }

    @Get('runs/:id/export/bank')
    @Roles('CEO', 'ACCOUNTANT')
    async exportBank(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const csv = await this.stat.exportBankNetPay(id);
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="BankNetPay-${id}.csv"` });
        res.send(csv);
    }

    // ─────────── Staff Compensation: Allowances ───────────
    @Get('staff/:staffId/allowances')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    listAllowances(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.comp.listAllowances(staffId);
    }

    @Post('allowances')
    @Roles('CEO', 'HR_MANAGER')
    createAllowance(@Body() dto: CreateAllowanceDto) {
        return this.comp.createAllowance(dto);
    }

    @Patch('allowances/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateAllowance(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAllowanceDto) {
        return this.comp.updateAllowance(id, dto);
    }

    @Delete('allowances/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteAllowance(@Param('id', ParseUUIDPipe) id: string) {
        return this.comp.deleteAllowance(id);
    }

    // ─────────── Staff Compensation: Recurring Deductions ───────────
    @Get('staff/:staffId/deductions')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    listDeductions(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.comp.listDeductions(staffId);
    }

    @Post('deductions')
    @Roles('CEO', 'HR_MANAGER')
    createDeduction(@Body() dto: CreateDeductionDto) {
        return this.comp.createDeduction(dto);
    }

    @Patch('deductions/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateDeduction(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeductionDto) {
        return this.comp.updateDeduction(id, dto);
    }

    @Delete('deductions/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteDeduction(@Param('id', ParseUUIDPipe) id: string) {
        return this.comp.deleteDeduction(id);
    }
}
