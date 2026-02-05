import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PettyCashService, RecordExpenseDto, RequestReplenishmentDto, CashCountDto, CreateFloatDto } from './petty-cash.service';
import { TransactionType, ExpenseCategory, TransactionStatus } from './entities/petty-cash-transaction.entity';

@Controller('petty-cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PettyCashController {
    constructor(private readonly pettyCashService: PettyCashService) { }

    // ==================== FLOATS ====================

    @Get('floats')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getAllFloats() {
        return this.pettyCashService.getAllFloats();
    }

    @Get('floats/needing-replenishment')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT')
    getFloatsNeedingReplenishment() {
        return this.pettyCashService.getFloatsNeedingReplenishment();
    }

    @Get('floats/:id')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getFloat(@Param('id') id: string) {
        return this.pettyCashService.getFloat(id);
    }

    @Get('floats/branch/:branchId')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getFloatByBranch(@Param('branchId') branchId: string) {
        return this.pettyCashService.getFloatsByBranch(branchId);
    }

    @Post('floats')
    @Roles('CEO', 'FINANCE_MANAGER')
    createFloat(@Body() data: CreateFloatDto, @Request() req: any) {
        return this.pettyCashService.createFloat(data, req.user?.staff_id);
    }

    @Patch('floats/:id/custodian')
    @Roles('CEO', 'FINANCE_MANAGER', 'BRANCH_MANAGER')
    updateCustodian(@Param('id') id: string, @Body() body: { custodian_id: string }) {
        return this.pettyCashService.updateFloatCustodian(id, body.custodian_id);
    }

    // ==================== TRANSACTIONS ====================

    @Get('transactions')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getTransactions(
        @Query('float_id') floatId?: string,
        @Query('type') type?: TransactionType,
        @Query('category') category?: ExpenseCategory,
        @Query('status') status?: TransactionStatus,
        @Query('start_date') startDate?: string,
        @Query('end_date') endDate?: string,
    ) {
        return this.pettyCashService.getTransactions({
            float_id: floatId,
            type,
            category,
            status,
            start_date: startDate,
            end_date: endDate,
        });
    }

    @Post('transactions/expense')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    recordExpense(@Body() data: RecordExpenseDto, @Request() req: any) {
        return this.pettyCashService.recordExpense(data, req.user?.staff_id);
    }

    // Alias for frontend compatibility
    @Post('expenses')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    recordExpenseAlias(@Body() data: RecordExpenseDto, @Request() req: any) {
        return this.pettyCashService.recordExpense(data, req.user?.staff_id);
    }

    @Get('ledger/:floatId')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getLedger(
        @Param('floatId') floatId: string,
        @Query('start_date') startDate?: string,
        @Query('end_date') endDate?: string,
    ) {
        return this.pettyCashService.getLedger(floatId, startDate, endDate);
    }

    // ==================== REPLENISHMENTS ====================

    @Get('replenishments/pending')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT')
    getPendingReplenishments() {
        return this.pettyCashService.getPendingReplenishments();
    }

    @Post('replenishments')
    @Roles('CEO', 'FINANCE_MANAGER', 'BRANCH_MANAGER')
    requestReplenishment(@Body() data: RequestReplenishmentDto, @Request() req: any) {
        return this.pettyCashService.requestReplenishment(data, req.user?.staff_id);
    }

    @Patch('replenishments/:id/approve')
    @Roles('CEO', 'FINANCE_MANAGER')
    approveReplenishment(
        @Param('id') id: string,
        @Body() body: { comment?: string; amount_approved?: number },
        @Request() req: any,
    ) {
        return this.pettyCashService.approveReplenishment(id, req.user?.staff_id, body.comment, body.amount_approved);
    }

    @Patch('replenishments/:id/disburse')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT')
    disburseReplenishment(
        @Param('id') id: string,
        @Body() body: { cheque_number?: string; payment_reference?: string },
        @Request() req: any,
    ) {
        return this.pettyCashService.disburseReplenishment(id, req.user?.staff_id, body);
    }

    // ==================== RECONCILIATION ====================

    @Post('reconciliations/cash-count')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    performCashCount(@Body() data: CashCountDto, @Request() req: any) {
        return this.pettyCashService.performCashCount(data, req.user?.staff_id);
    }

    @Patch('reconciliations/:id/verify')
    @Roles('CEO', 'FINANCE_MANAGER')
    verifyReconciliation(
        @Param('id') id: string,
        @Body() body: { comment?: string },
        @Request() req: any,
    ) {
        return this.pettyCashService.verifyReconciliation(id, req.user?.staff_id, body.comment);
    }

    // ==================== REPORTS ====================

    @Get('reports/monthly/:floatId')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getMonthlyReport(
        @Param('floatId') floatId: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ) {
        return this.pettyCashService.getMonthlyReport(floatId, parseInt(year), parseInt(month));
    }

    @Get('dashboard')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT')
    getDashboardStats() {
        return this.pettyCashService.getDashboardStats();
    }

    // ==================== CATEGORY LIST ====================

    @Get('categories')
    @Roles('CEO', 'FINANCE_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getCategories() {
        return Object.values(ExpenseCategory).map(cat => ({
            code: cat,
            name: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        }));
    }
}
