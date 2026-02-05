import {
    Controller, Get, Post, Patch, Body, Param, Query,
    UseGuards, Request, BadRequestException
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LoanType, LoanStatus } from './entities/staff-loan.entity';

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
    constructor(private readonly loansService: LoansService) { }

    // ==================== MY LOANS ====================

    @Get('my')
    getMyLoans(@Request() req: any, @Query('status') status?: LoanStatus) {
        return this.loansService.findMyLoans(req.user.staff_id, status);
    }

    @Get('my/stats')
    getMyLoanStats(@Request() req: any, @Query('year') year?: string) {
        return this.loansService.getLoanStats({
            staffId: req.user.staff_id,
            year: year ? parseInt(year) : undefined,
        });
    }

    @Post('apply')
    applyForLoan(
        @Request() req: any,
        @Body() body: {
            loan_type: LoanType;
            principal: number;
            term_months: number;
            interest_rate?: number;
            purpose?: string;
            is_urgent?: boolean;
            deduct_from_salary?: boolean;
            max_salary_deduction_percent?: number;
            guarantor_id?: string;
        },
    ) {
        if (!body.principal || body.principal <= 0) {
            throw new BadRequestException('Principal amount must be positive');
        }
        if (!body.term_months || body.term_months <= 0) {
            throw new BadRequestException('Term months must be positive');
        }
        return this.loansService.applyForLoan(req.user.staff_id, body);
    }

    @Patch(':id/cancel')
    cancelLoan(@Param('id') id: string, @Request() req: any) {
        return this.loansService.cancelLoan(id, req.user.staff_id);
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
    processPayrollDeductions(
        @Body('month') month: string,
        @Body('payroll_reference') payrollReference: string,
    ) {
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            throw new BadRequestException('Month must be in YYYY-MM format');
        }
        if (!payrollReference) {
            throw new BadRequestException('payroll_reference is required');
        }
        return this.loansService.processPayrollDeductions(month, payrollReference);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.loansService.findById(id);
    }

    @Get(':id/schedule')
    getRepaymentSchedule(@Param('id') id: string) {
        return this.loansService.findById(id).then(loan => loan.repayments);
    }

    // ==================== DISBURSEMENT ====================

    @Patch(':id/disburse')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    disburseLoan(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: {
            disbursement_reference: string;
            disbursement_method: string;
            first_repayment_date?: string;
        },
    ) {
        return this.loansService.disburseLoan(
            id,
            req.user.staff_id,
            body.disbursement_reference,
            body.disbursement_method,
            body.first_repayment_date ? new Date(body.first_repayment_date) : undefined,
        );
    }

    // ==================== PAYMENTS ====================

    @Patch(':id/payment')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    recordPayment(
        @Param('id') id: string,
        @Body() body: {
            repayment_id?: string;
            amount: number;
            payment_reference: string;
            payment_method: string;
            notes?: string;
        },
    ) {
        if (!body.amount || body.amount <= 0) {
            throw new BadRequestException('Payment amount must be positive');
        }
        return this.loansService.recordRepayment(id, body);
    }

    @Patch(':id/payroll-deduction')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    recordPayrollDeduction(
        @Param('id') id: string,
        @Body() body: {
            amount: number;
            payroll_month: string;
            payroll_reference: string;
        },
    ) {
        return this.loansService.recordPayrollDeduction(
            id,
            body.amount,
            body.payroll_month,
            body.payroll_reference,
        );
    }

    // ==================== REGENERATE SCHEDULE ====================

    @Post(':id/regenerate-schedule')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    regenerateSchedule(@Param('id') id: string) {
        return this.loansService.generateRepaymentSchedule(id);
    }

    @Get('my/payroll-deductions')
    getMyPayrollDeductions(@Request() req: any, @Query('year') year?: string) {
        return this.loansService.getStaffPayrollDeductions(
            req.user.staff_id,
            year ? parseInt(year) : undefined
        );
    }
}
