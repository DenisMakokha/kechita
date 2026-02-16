import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query,
    UseGuards, UseInterceptors, Req, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ClaimsService } from './claims.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClaimStatus } from './entities/claim.entity';
import { ClaimItemStatus } from './entities/claim-item.entity';
import {
    CreateClaimTypeDto,
    UpdateClaimTypeDto,
    SaveClaimDraftDto,
    SubmitClaimDto,
    ReviewClaimItemsDto,
    RecordPaymentDto,
} from './dto/claims.dto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsController {
    constructor(private readonly claimsService: ClaimsService) { }

    // ==================== CLAIM TYPES ====================

    @Get('types')
    getClaimTypes(@Query('all') all?: string) {
        return this.claimsService.getClaimTypes(all === 'true');
    }

    @Get('types/for-me')
    getClaimTypesForMe(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.getClaimTypesForStaff(staffId);
    }

    @Post('types')
    @Roles('CEO', 'HR_MANAGER')
    createClaimType(@Body() dto: CreateClaimTypeDto) {
        return this.claimsService.createClaimType(dto);
    }

    @Patch('types/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateClaimType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClaimTypeDto) {
        return this.claimsService.updateClaimType(id, dto);
    }

    // ==================== MY CLAIMS ====================

    @Get('my')
    getMyClaims(@Req() req: AuthenticatedRequest, @Query('status') status?: ClaimStatus) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.findMyClaims(staffId, status);
    }

    @Post()
    submitClaim(@Req() req: AuthenticatedRequest, @Body() dto: SubmitClaimDto) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException('At least one claim item is required');
        }
        return this.claimsService.submitClaim(staffId, dto);
    }

    @Post('draft')
    saveDraft(@Req() req: AuthenticatedRequest, @Body() dto: SaveClaimDraftDto) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.saveDraft(staffId, dto);
    }

    @Patch(':id/submit')
    submitDraft(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.submitDraft(id, staffId);
    }

    @Patch(':id/cancel')
    cancelClaim(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.cancelClaim(id, staffId);
    }

    // ==================== ADMIN/FINANCE ====================

    @Get()
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    findAll(
        @Query('status') status?: ClaimStatus,
        @Query('staffId') staffId?: string,
        @Query('branchId') branchId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.claimsService.findAll({ status, staffId, branchId, startDate, endDate });
    }

    @Get('pending-review')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    findPendingReview() {
        return this.claimsService.findPendingReview();
    }

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(60000)
    getStats(@Query('staffId') staffId?: string, @Query('year') year?: string) {
        return this.claimsService.getClaimStats({
            staffId,
            year: year ? parseInt(year) : undefined,
        });
    }

    @Get('my/stats')
    getMyStats(@Req() req: AuthenticatedRequest, @Query('year') year?: string) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.getClaimStats({
            staffId,
            year: year ? parseInt(year) : undefined,
        });
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.claimsService.findById(id);
    }

    // ==================== REVIEW ====================

    @Patch(':id/review')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    reviewItems(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: ReviewClaimItemsDto,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.reviewItems(id, staffId, dto.reviews as any);
    }

    // ==================== PAYMENT ====================

    @Patch(':id/payment')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    recordPayment(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RecordPaymentDto,
    ) {
        return this.claimsService.recordPayment(
            id,
            dto.amount,
            dto.payment_reference,
            dto.payment_method,
        );
    }

    // ==================== CLAIM TYPE ACTIVATION ====================

    @Patch('types/:id/activate')
    @Roles('CEO', 'HR_MANAGER')
    activateClaimType(@Param('id', ParseUUIDPipe) id: string) {
        return this.claimsService.activateClaimType(id);
    }

    @Patch('types/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    deactivateClaimType(@Param('id', ParseUUIDPipe) id: string) {
        return this.claimsService.deactivateClaimType(id);
    }

    @Delete('types/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteClaimType(@Param('id', ParseUUIDPipe) id: string) {
        return this.claimsService.deleteClaimType(id);
    }

    // ==================== UPDATE/DELETE DRAFT ====================

    @Patch('draft/:id')
    updateDraft(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: SaveClaimDraftDto,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.updateDraft(id, staffId, dto);
    }

    @Delete('draft/:id')
    deleteDraft(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.deleteDraft(id, staffId);
    }

    // ==================== TEAM CLAIMS ====================

    @Get('team')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getTeamClaims(
        @Req() req: AuthenticatedRequest,
        @Query('status') status?: ClaimStatus,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.getTeamClaims(staffId, status);
    }

    @Get('team/pending')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getPendingTeamClaims(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.claimsService.getPendingTeamClaims(staffId);
    }

    // ==================== REJECT CLAIM ====================

    @Patch(':id/reject')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    rejectClaim(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() req: AuthenticatedRequest,
        @Body('reason') reason: string,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!reason) throw new BadRequestException('Rejection reason is required');
        return this.claimsService.rejectClaim(id, staffId, reason);
    }
}
