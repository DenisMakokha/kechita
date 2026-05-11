import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PerformanceService } from './services/performance.service';
import { ReviewCycle, ReviewCycleStatus } from './entities/review-cycle.entity';
import { Review } from './entities/review.entity';
import { Goal, GoalStatus } from './entities/goal.entity';
import { KeyResult } from './entities/key-result.entity';

@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceController {
    constructor(private readonly svc: PerformanceService) {}

    // ─── Review cycles ───
    @Get('cycles')
    listCycles() {
        return this.svc.listCycles();
    }

    @Get('cycles/:id')
    getCycle(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.getCycle(id);
    }

    @Post('cycles')
    @Roles('CEO', 'HR_MANAGER')
    createCycle(@Body() dto: Partial<ReviewCycle>, @Req() req: AuthenticatedRequest) {
        return this.svc.createCycle(dto, req.user?.sub);
    }

    @Patch('cycles/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateCycle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<ReviewCycle>) {
        return this.svc.updateCycle(id, dto);
    }

    @Patch('cycles/:id/status')
    @Roles('CEO', 'HR_MANAGER')
    transitionCycle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { status: ReviewCycleStatus }) {
        return this.svc.transitionCycle(id, dto.status);
    }

    @Post('cycles/:id/launch')
    @Roles('CEO', 'HR_MANAGER')
    launchCycle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { staff_ids?: string[] }) {
        return this.svc.launchCycle(id, dto.staff_ids);
    }

    @Get('cycles/:id/analytics')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    cycleAnalytics(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.cycleAnalytics(id);
    }

    @Get('cycles/:id/reviews')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    listCycleReviews(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.listCycleReviews(id);
    }

    // ─── My reviews ───
    @Get('my/to-give')
    async getMyReviewsToGive(@Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) return [];
        return this.svc.getMyReviewsToGive(req.user.staff_id);
    }

    @Get('my/about-me')
    async getMyReviewsAboutMe(@Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) return [];
        return this.svc.getMyReviewsAboutMe(req.user.staff_id);
    }

    // ─── Single review ───
    @Get('reviews/:id')
    getReview(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.getReview(id);
    }

    @Patch('reviews/:id/draft')
    saveDraft(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Review>, @Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) throw new BadRequestException('Not linked to a staff record');
        return this.svc.saveReviewDraft(id, dto, req.user.staff_id);
    }

    @Patch('reviews/:id/submit')
    submitReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Review>, @Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) throw new BadRequestException('Not linked to a staff record');
        return this.svc.submitReview(id, dto, req.user.staff_id);
    }

    @Patch('reviews/:id/acknowledge')
    acknowledgeReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { comments?: string }, @Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) throw new BadRequestException('Not linked to a staff record');
        return this.svc.acknowledgeReview(id, dto.comments, req.user.staff_id);
    }

    @Patch('reviews/:id/dispute')
    disputeReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { reason: string }, @Req() req: AuthenticatedRequest) {
        if (!req.user?.staff_id) throw new BadRequestException('Not linked to a staff record');
        return this.svc.disputeReview(id, dto.reason, req.user.staff_id);
    }

    // ─── Goals ───
    @Get('my/goals')
    async getMyGoals(@Req() req: AuthenticatedRequest, @Query('status') status?: GoalStatus) {
        if (!req.user?.staff_id) return [];
        return this.svc.listStaffGoals(req.user.staff_id, status);
    }

    @Get('staff/:staffId/goals')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listGoals(@Param('staffId', ParseUUIDPipe) staffId: string, @Query('status') status?: GoalStatus) {
        return this.svc.listStaffGoals(staffId, status);
    }

    @Post('goals')
    createGoal(@Body() dto: Partial<Goal> & { staff_id: string }) {
        return this.svc.createGoal(dto);
    }

    @Patch('goals/:id')
    updateGoal(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Goal>) {
        return this.svc.updateGoal(id, dto);
    }

    @Delete('goals/:id')
    deleteGoal(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.deleteGoal(id);
    }

    // ─── Key Results ───
    @Post('goals/:goalId/key-results')
    addKR(@Param('goalId', ParseUUIDPipe) goalId: string, @Body() dto: Partial<KeyResult>) {
        return this.svc.addKeyResult(goalId, dto);
    }

    @Patch('key-results/:id')
    updateKR(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<KeyResult>) {
        return this.svc.updateKeyResult(id, dto);
    }

    @Delete('key-results/:id')
    deleteKR(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.deleteKeyResult(id);
    }
}
