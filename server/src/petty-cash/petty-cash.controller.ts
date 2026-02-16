import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PettyCashService } from './petty-cash.service';
import { TransactionType, ExpenseCategory, TransactionStatus } from './entities/petty-cash-transaction.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
    CreateFloatDto,
    RecordExpenseDto,
    RequestReplenishmentDto,
    CashCountDto,
    UpdateCustodianDto,
    ApproveReplenishmentDto,
    DisburseReplenishmentDto,
    VerifyReconciliationDto,
} from './dto/petty-cash.dto';

@Controller('petty-cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PettyCashController {
    constructor(private readonly pettyCashService: PettyCashService) { }

    // ==================== FLOATS ====================

    @Get('floats')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getAllFloats() {
        return this.pettyCashService.getAllFloats();
    }

    @Get('floats/needing-replenishment')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getFloatsNeedingReplenishment() {
        return this.pettyCashService.getFloatsNeedingReplenishment();
    }

    @Get('floats/:id')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getFloat(@Param('id', ParseUUIDPipe) id: string) {
        return this.pettyCashService.getFloat(id);
    }

    @Get('floats/branch/:branchId')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getFloatByBranch(@Param('branchId', ParseUUIDPipe) branchId: string) {
        return this.pettyCashService.getFloatsByBranch(branchId);
    }

    @Post('floats')
    @Roles('CEO', 'HR_MANAGER')
    createFloat(@Body() data: CreateFloatDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.createFloat(data, staffId);
    }

    @Patch('floats/:id/custodian')
    @Roles('CEO', 'HR_MANAGER', 'BRANCH_MANAGER')
    updateCustodian(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustodianDto) {
        return this.pettyCashService.updateFloatCustodian(id, dto.custodian_id);
    }

    // ==================== TRANSACTIONS ====================

    @Get('transactions')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
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
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    recordExpense(@Body() data: RecordExpenseDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.recordExpense(data, staffId);
    }

    // Alias for frontend compatibility
    @Post('expenses')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    recordExpenseAlias(@Body() data: RecordExpenseDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.recordExpense(data, staffId);
    }

    @Get('ledger/:floatId')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getLedger(
        @Param('floatId', ParseUUIDPipe) floatId: string,
        @Query('start_date') startDate?: string,
        @Query('end_date') endDate?: string,
    ) {
        return this.pettyCashService.getLedger(floatId, startDate, endDate);
    }

    // ==================== REPLENISHMENTS ====================

    @Get('replenishments/pending')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getPendingReplenishments() {
        return this.pettyCashService.getPendingReplenishments();
    }

    @Post('replenishments')
    @Roles('CEO', 'HR_MANAGER', 'BRANCH_MANAGER')
    requestReplenishment(@Body() data: RequestReplenishmentDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.requestReplenishment(data, staffId);
    }

    @Patch('replenishments/:id/approve')
    @Roles('CEO', 'HR_MANAGER')
    approveReplenishment(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ApproveReplenishmentDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.approveReplenishment(id, staffId, dto.comment, dto.amount_approved);
    }

    @Patch('replenishments/:id/disburse')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    disburseReplenishment(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: DisburseReplenishmentDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.disburseReplenishment(id, staffId, dto);
    }

    // ==================== RECONCILIATION ====================

    @Post('reconciliations/cash-count')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    performCashCount(@Body() data: CashCountDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.performCashCount(data, staffId);
    }

    @Patch('reconciliations/:id/verify')
    @Roles('CEO', 'HR_MANAGER')
    verifyReconciliation(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: VerifyReconciliationDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.verifyReconciliation(id, staffId, dto.comment);
    }

    // ==================== REPORTS ====================

    @Get('reports/monthly/:floatId')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getMonthlyReport(
        @Param('floatId', ParseUUIDPipe) floatId: string,
        @Query('year') year: string,
        @Query('month') month: string,
    ) {
        return this.pettyCashService.getMonthlyReport(floatId, parseInt(year), parseInt(month));
    }

    @Get('dashboard')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getDashboardStats() {
        return this.pettyCashService.getDashboardStats();
    }

    // ==================== CATEGORY LIST ====================

    @Get('categories')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getCategories() {
        return Object.values(ExpenseCategory).map(cat => ({
            code: cat,
            name: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        }));
    }

    // ==================== REJECT REPLENISHMENT ====================

    @Patch('replenishments/:id/reject')
    @Roles('CEO', 'HR_MANAGER')
    rejectReplenishment(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason: string,
    ) {
        if (!reason) throw new BadRequestException('Rejection reason is required');
        return this.pettyCashService.rejectReplenishment(id, reason);
    }

    // ==================== CANCEL TRANSACTION ====================

    @Patch('transactions/:id/cancel')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    cancelTransaction(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason: string,
    ) {
        if (!reason) throw new BadRequestException('Cancellation reason is required');
        return this.pettyCashService.cancelTransaction(id, reason);
    }

    // ==================== FLOAT ACTIVATION ====================

    @Patch('floats/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    deactivateFloat(@Param('id', ParseUUIDPipe) id: string) {
        return this.pettyCashService.deactivateFloat(id);
    }

    @Patch('floats/:id/activate')
    @Roles('CEO', 'HR_MANAGER')
    activateFloat(@Param('id', ParseUUIDPipe) id: string) {
        return this.pettyCashService.activateFloat(id);
    }

    // ==================== RECONCILIATION HISTORY ====================

    @Get('reconciliations/:floatId/history')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    getReconciliationHistory(@Param('floatId', ParseUUIDPipe) floatId: string) {
        return this.pettyCashService.getReconciliationHistory(floatId);
    }

    // ==================== DELETE PENDING TRANSACTION ====================

    @Delete('transactions/:id')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'BRANCH_MANAGER')
    deletePendingTransaction(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.pettyCashService.deletePendingTransaction(id, staffId);
    }
}
