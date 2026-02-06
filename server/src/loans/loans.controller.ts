import {
    Controller, Get, Post, Patch, Body, Param, Query,
    UseGuards, Req, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LoanType, LoanStatus } from './entities/staff-loan.entity';
import {
    ApplyLoanDto,
    DisburseLoanDto,
    RecordPaymentDto,
    RecordPayrollDeductionDto,
    ProcessPayrollDto,
} from './dto/loans.dto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
    constructor(private readonly loansService: LoansService) { }

    // ==================== MY LOANS ====================

    @Get('my')
    getMyLoans(@Req() req: AuthenticatedRequest, @Query('status') status?: LoanStatus) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.findMyLoans(staffId, status);
    }

    @Get('my/stats')
    getMyLoanStats(@Req() req: AuthenticatedRequest, @Query('year') year?: string) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.getLoanStats({
            staffId,
            year: year ? parseInt(year) : undefined,
        });
    }

    @Post('apply')
    applyForLoan(@Req() req: AuthenticatedRequest, @Body() dto: ApplyLoanDto) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.applyForLoan(staffId, dto);
    }

    @Patch(':id/cancel')
    cancelLoan(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.cancelLoan(id, staffId);
    }

    // ==================== ADMIN/HR/ACCOUNTANT ====================

    @Get()
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    findAll(
        @Query('status') status?: LoanStatus,
        @Query('loanType') loanType?: LoanType,
        @Query('staffId') staffId?: string,
        @Query('branchId') branchId?: string,
    ) {
        return this.loansService.findAll({ status, loanType, staffId, branchId });
    }

    @Get('pending-approval')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    findPendingApproval() {
        return this.loansService.findPendingApproval();
    }

    @Get('overdue')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    findOverdueLoans() {
        return this.loansService.findOverdueLoans();
    }

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getStats(@Query('staffId') staffId?: string, @Query('year') year?: string) {
        return this.loansService.getLoanStats({
            staffId,
            year: year ? parseInt(year) : undefined,
        });
    }

    // ==================== PAYROLL EXPORT ====================
    // Note: These routes MUST be defined before :id routes to avoid conflicts

    @Get('payroll/export')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getPayrollExport(@Query('month') month: string) {
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            throw new BadRequestException('Month must be in YYYY-MM format');
        }
        return this.loansService.getPayrollExport(month);
    }

    @Get('payroll/summary-by-branch')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getPayrollSummaryByBranch(@Query('month') month: string) {
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            throw new BadRequestException('Month must be in YYYY-MM format');
        }
        return this.loansService.getPayrollSummaryByBranch(month);
    }

    @Post('payroll/process')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    processPayrollDeductions(@Body() dto: ProcessPayrollDto) {
        return this.loansService.processPayrollDeductions(dto.month, dto.payroll_reference);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.loansService.findById(id);
    }

    @Get(':id/schedule')
    getRepaymentSchedule(@Param('id', ParseUUIDPipe) id: string) {
        return this.loansService.findById(id).then(loan => loan.repayments);
    }

    // ==================== DISBURSEMENT ====================

    @Patch(':id/disburse')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    disburseLoan(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: DisburseLoanDto,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.disburseLoan(
            id,
            staffId,
            dto.disbursement_reference,
            dto.disbursement_method,
            dto.first_repayment_date ? new Date(dto.first_repayment_date) : undefined,
        );
    }

    // ==================== PAYMENTS ====================

    @Patch(':id/payment')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    recordPayment(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RecordPaymentDto,
    ) {
        return this.loansService.recordRepayment(id, dto);
    }

    @Patch(':id/payroll-deduction')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    recordPayrollDeduction(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RecordPayrollDeductionDto,
    ) {
        return this.loansService.recordPayrollDeduction(
            id,
            dto.amount,
            dto.payroll_month,
            dto.payroll_reference,
        );
    }

    // ==================== REGENERATE SCHEDULE ====================

    @Post(':id/regenerate-schedule')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    regenerateSchedule(@Param('id', ParseUUIDPipe) id: string) {
        return this.loansService.generateRepaymentSchedule(id);
    }

    @Get('my/payroll-deductions')
    getMyPayrollDeductions(@Req() req: AuthenticatedRequest, @Query('year') year?: string) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.getStaffPayrollDeductions(
            staffId,
            year ? parseInt(year) : undefined
        );
    }

    // ==================== REJECT LOAN ====================

    @Patch(':id/reject')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    rejectLoan(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body('reason') reason: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!reason) throw new BadRequestException('Rejection reason is required');
        return this.loansService.rejectLoan(id, staffId, reason);
    }

    // ==================== WRITE-OFF / DEFAULT ====================

    @Patch(':id/write-off')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    writeOffLoan(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason: string,
    ) {
        if (!reason) throw new BadRequestException('Write-off reason is required');
        return this.loansService.writeOffLoan(id, reason);
    }

    @Patch(':id/mark-defaulted')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    markAsDefaulted(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason?: string,
    ) {
        return this.loansService.markAsDefaulted(id, reason);
    }

    // ==================== TEAM LOANS ====================

    @Get('team')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getTeamLoans(
        @Req() req: AuthenticatedRequest,
        @Query('status') status?: LoanStatus,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.getTeamLoans(staffId, status);
    }

    @Get('team/pending')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getPendingTeamLoans(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.getPendingTeamLoans(staffId);
    }

    // ==================== GUARANTOR ====================

    @Get('my/as-guarantor')
    getLoansAsGuarantor(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.getLoansAsGuarantor(staffId);
    }

    @Patch(':id/guarantor-consent')
    recordGuarantorConsent(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.loansService.recordGuarantorConsent(id, staffId);
    }
}
