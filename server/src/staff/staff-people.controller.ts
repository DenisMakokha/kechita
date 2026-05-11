import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { StaffPeopleService } from './services/staff-people.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
    CreateNextOfKinDto, UpdateNextOfKinDto,
    CreateDependentDto, UpdateDependentDto,
    AdjustSalaryDto, CreateProbationReviewDto, AcknowledgeReviewDto,
} from './dto/people.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffPeopleController {
    constructor(private readonly people: StaffPeopleService) {}

    // ───── Next of Kin ─────
    @Get('staff/:id/next-of-kin')
    listNok(@Param('id', ParseUUIDPipe) id: string) {
        return this.people.listNextOfKin(id);
    }

    @Post('staff/:id/next-of-kin')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    addNok(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateNextOfKinDto) {
        return this.people.addNextOfKin(id, dto);
    }

    @Patch('staff-people/next-of-kin/:nokId')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    updateNok(@Param('nokId', ParseUUIDPipe) nokId: string, @Body() dto: UpdateNextOfKinDto) {
        return this.people.updateNextOfKin(nokId, dto);
    }

    @Delete('staff-people/next-of-kin/:nokId')
    @Roles('CEO', 'HR_MANAGER')
    deleteNok(@Param('nokId', ParseUUIDPipe) nokId: string) {
        return this.people.deleteNextOfKin(nokId);
    }

    // Self-service Next-of-Kin
    @Get('staff/me/next-of-kin')
    myNok(@Req() req: AuthenticatedRequest) {
        return this.people.listNextOfKin(req.user.staff_id!);
    }

    @Post('staff/me/next-of-kin')
    addMyNok(@Req() req: AuthenticatedRequest, @Body() dto: CreateNextOfKinDto) {
        return this.people.addNextOfKin(req.user.staff_id!, dto);
    }

    // ───── Dependents ─────
    @Get('staff/:id/dependents')
    listDeps(@Param('id', ParseUUIDPipe) id: string) {
        return this.people.listDependents(id);
    }

    @Post('staff/:id/dependents')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    addDep(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDependentDto) {
        return this.people.addDependent(id, dto as any);
    }

    @Patch('staff-people/dependents/:depId')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    updateDep(@Param('depId', ParseUUIDPipe) depId: string, @Body() dto: UpdateDependentDto) {
        return this.people.updateDependent(depId, dto as any);
    }

    @Delete('staff-people/dependents/:depId')
    @Roles('CEO', 'HR_MANAGER')
    deleteDep(@Param('depId', ParseUUIDPipe) depId: string) {
        return this.people.deleteDependent(depId);
    }

    @Get('staff/me/dependents')
    myDeps(@Req() req: AuthenticatedRequest) {
        return this.people.listDependents(req.user.staff_id!);
    }

    @Get('staff/me/salary-history')
    mySalary(@Req() req: AuthenticatedRequest) {
        return this.people.listSalaryHistory(req.user.staff_id!);
    }

    @Get('staff/me/probation-reviews')
    myProbReviews(@Req() req: AuthenticatedRequest) {
        return this.people.listProbationReviews(req.user.staff_id!);
    }

    // ───── Salary History & Adjustments ─────
    @Get('staff/:id/salary-history')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    salaryHistory(@Param('id', ParseUUIDPipe) id: string) {
        return this.people.listSalaryHistory(id);
    }

    @Post('staff/:id/salary-adjustment')
    @Roles('CEO', 'HR_MANAGER')
    adjustSalary(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdjustSalaryDto,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.people.adjustSalary(id, dto, req.user.id);
    }

    @Patch('staff-people/salary-history/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateSalaryEntry(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.people.updateSalaryHistory(id, data);
    }

    @Delete('staff-people/salary-history/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteSalaryEntry(@Param('id', ParseUUIDPipe) id: string) {
        return this.people.deleteSalaryHistory(id);
    }

    // ───── Probation Reviews ─────
    @Get('staff/:id/probation-reviews')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')
    listReviews(@Param('id', ParseUUIDPipe) id: string) {
        return this.people.listProbationReviews(id);
    }

    @Post('staff/:id/probation-reviews')
    @Roles('CEO', 'HR_MANAGER', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')
    createReview(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateProbationReviewDto,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.people.createProbationReview(id, dto as any, req.user.staff_id);
    }

    @Post('staff-people/probation-reviews/:reviewId/acknowledge')
    acknowledgeReview(
        @Param('reviewId', ParseUUIDPipe) reviewId: string,
        @Body() dto: AcknowledgeReviewDto,
    ) {
        return this.people.acknowledgeProbationReview(reviewId, dto.comments);
    }

    @Patch('staff-people/probation-reviews/:reviewId')
    @Roles('CEO', 'HR_MANAGER', 'BRANCH_MANAGER', 'REGIONAL_MANAGER')
    updateReview(@Param('reviewId', ParseUUIDPipe) reviewId: string, @Body() data: any) {
        return this.people.updateProbationReview(reviewId, data);
    }

    @Delete('staff-people/probation-reviews/:reviewId')
    @Roles('CEO', 'HR_MANAGER')
    deleteReview(@Param('reviewId', ParseUUIDPipe) reviewId: string) {
        return this.people.deleteProbationReview(reviewId);
    }
}
