import {
    Controller, Get, Post, Patch, Body, Param, Query,
    UseGuards, Request, BadRequestException
} from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ClaimStatus } from './entities/claim.entity';
import { ClaimItemStatus } from './entities/claim-item.entity';
import { CreateClaimTypeDto, UpdateClaimTypeDto, SaveClaimDraftDto } from './dto/claims.dto';

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
    getClaimTypesForMe(@Request() req: any) {
        return this.claimsService.getClaimTypesForStaff(req.user.staff_id);
    }

    @Post('types')
    @Roles('CEO', 'HR_MANAGER')
    createClaimType(@Body() dto: CreateClaimTypeDto) {
        return this.claimsService.createClaimType(dto);
    }

    @Patch('types/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateClaimType(@Param('id') id: string, @Body() dto: UpdateClaimTypeDto) {
        return this.claimsService.updateClaimType(id, dto);
    }

    // ==================== MY CLAIMS ====================

    @Get('my')
    getMyClaims(@Request() req: any, @Query('status') status?: ClaimStatus) {
        return this.claimsService.findMyClaims(req.user.staff_id, status);
    }

    @Post()
    submitClaim(
        @Request() req: any,
        @Body() body: {
            purpose?: string;
            period_start?: string;
            period_end?: string;
            is_urgent?: boolean;
            items: {
                claim_type_id: string;
                description: string;
                amount: number;
                expense_date?: string;
                quantity?: number;
                unit_price?: number;
                unit?: string;
                receipt_number?: string;
                vendor_name?: string;
                document_id?: string;
            }[];
        },
    ) {
        if (!body.items || body.items.length === 0) {
            throw new BadRequestException('At least one claim item is required');
        }
        return this.claimsService.submitClaim(req.user.staff_id, body);
    }

    @Post('draft')
    saveDraft(@Request() req: any, @Body() dto: SaveClaimDraftDto) {
        return this.claimsService.saveDraft(req.user.staff_id, dto);
    }

    @Patch(':id/submit')
    submitDraft(@Param('id') id: string, @Request() req: any) {
        return this.claimsService.submitDraft(id, req.user.staff_id);
    }

    @Patch(':id/cancel')
    cancelClaim(@Param('id') id: string, @Request() req: any) {
        return this.claimsService.cancelClaim(id, req.user.staff_id);
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
    getStats(@Query('staffId') staffId?: string, @Query('year') year?: string) {
        return this.claimsService.getClaimStats({
            staffId,
            year: year ? parseInt(year) : undefined,
        });
    }

    @Get('my/stats')
    getMyStats(@Request() req: any, @Query('year') year?: string) {
        return this.claimsService.getClaimStats({
            staffId: req.user.staff_id,
            year: year ? parseInt(year) : undefined,
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.claimsService.findById(id);
    }

    // ==================== REVIEW ====================

    @Patch(':id/review')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    reviewItems(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: {
            reviews: {
                item_id: string;
                approved_amount: number;
                status: ClaimItemStatus;
                comment?: string;
            }[];
        },
    ) {
        return this.claimsService.reviewItems(id, req.user.staff_id, body.reviews);
    }

    // ==================== PAYMENT ====================

    @Patch(':id/payment')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    recordPayment(
        @Param('id') id: string,
        @Body() body: {
            amount: number;
            payment_reference: string;
            payment_method: string;
        },
    ) {
        return this.claimsService.recordPayment(
            id,
            body.amount,
            body.payment_reference,
            body.payment_method,
        );
    }
}
