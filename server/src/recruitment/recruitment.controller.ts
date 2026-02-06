import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, Req, UseInterceptors, UploadedFile, Ip, Headers, BadRequestException, ParseUUIDPipe,
} from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { BackgroundCheckService, InitiateBackgroundCheckDto, CreateReferenceCheckDto, SubmitReferenceResponseDto } from './background-check.service';
import { SignatureService } from './signature.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { uuid } from '../common/id-utils';
import { JobStatus } from './entities/job-post.entity';
import { ApplicationStatus } from './entities/application.entity';
import { CandidateStatus } from './entities/candidate.entity';
import {
    CreateJobPostDto, UpdateJobPostDto, ApplyToJobDto, UpdateCandidateDto,
    ScheduleInterviewDto, CreatePipelineStageDto, UpdatePipelineStageDto,
    CreateOfferDto, UpdateApplicationStageDto, StarApplicationDto, RateApplicationDto,
    AssignApplicationDto, AddCandidateNoteDto, InterviewFeedbackDto, RescheduleInterviewDto,
    CancelInterviewDto, ReviewBackgroundCheckDto, VerifyReferenceDto, CreateSignatureRequestDto,
    SignOfferDto, DeclineOfferDto,
} from './dto/recruitment.dto';
import { UpdateBackgroundCheckDto } from './background-check.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('recruitment')
export class RecruitmentController {
    constructor(
        private readonly recruitmentService: RecruitmentService,
        private readonly backgroundCheckService: BackgroundCheckService,
        private readonly signatureService: SignatureService,
    ) { }

    // ==================== PUBLIC ENDPOINTS ====================

    // Public endpoint for candidates to view open jobs
    @Get('jobs/public')
    getPublishedJobs() {
        return this.recruitmentService.getPublishedJobs();
    }

    // View single job (public)
    @Get('jobs/public/:id')
    async getPublicJob(@Param('id') id: string) {
        await this.recruitmentService.incrementJobViews(id);
        return this.recruitmentService.getJobPost(id);
    }

    // Public endpoint for candidates to apply
    @Post('jobs/:id/apply')
    @UseInterceptors(FileInterceptor('resume', {
        storage: diskStorage({
            destination: './uploads/resumes',
            filename: (req, file, cb) => {
                return cb(null, `${uuid()}${extname(file.originalname)}`);
            }
        })
    }))
    applyToJob(
        @Param('id') id: string,
        @Body() dto: ApplyToJobDto,
        @UploadedFile() file: any,
    ) {
        const applicationData = {
            ...dto,
            resume_url: file ? `/uploads/resumes/${file.filename}` : undefined,
        };
        return this.recruitmentService.applyToJob(id, applicationData);
    }

    // ==================== JOB POSTS ====================

    @Get('jobs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getJobPosts(
        @Query('status') status?: JobStatus,
        @Query('department_id') departmentId?: string,
        @Query('is_urgent') isUrgent?: string,
    ) {
        return this.recruitmentService.getJobPosts({
            status,
            department_id: departmentId,
            is_urgent: isUrgent === 'true',
        });
    }

    @Get('jobs/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getJobPost(@Param('id') id: string) {
        return this.recruitmentService.getJobPost(id);
    }

    @Post('jobs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    createJobPost(@Body() dto: CreateJobPostDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        return this.recruitmentService.createJobPost(dto, staffId);
    }

    @Put('jobs/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    updateJobPost(@Param('id') id: string, @Body() dto: UpdateJobPostDto) {
        return this.recruitmentService.updateJobPost(id, dto);
    }

    @Patch('jobs/:id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    publishJob(@Param('id') id: string) {
        return this.recruitmentService.publishJob(id);
    }

    @Patch('jobs/:id/close')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    closeJob(@Param('id') id: string) {
        return this.recruitmentService.closeJob(id);
    }

    @Get('jobs-stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getJobStats() {
        return this.recruitmentService.getJobStats();
    }

    // ==================== APPLICATIONS ====================

    @Get('applications')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getApplications(
        @Query('job_post_id') jobPostId?: string,
        @Query('stage_code') stageCode?: string,
        @Query('status') status?: ApplicationStatus,
        @Query('is_starred') isStarred?: string,
    ) {
        return this.recruitmentService.getApplications({
            job_post_id: jobPostId,
            stage_code: stageCode,
            status,
            is_starred: isStarred === 'true' ? true : isStarred === 'false' ? false : undefined,
        });
    }

    @Get('applications/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getApplication(@Param('id') id: string) {
        return this.recruitmentService.getApplication(id);
    }

    @Patch('applications/:id/stage')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    updateApplicationStage(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateApplicationStageDto,
    ) {
        return this.recruitmentService.updateApplicationStage(id, dto.stage_code, dto.notes);
    }

    @Patch('applications/:id/star')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    starApplication(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StarApplicationDto) {
        return this.recruitmentService.starApplication(id, dto.starred);
    }

    @Patch('applications/:id/rate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    rateApplication(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RateApplicationDto) {
        return this.recruitmentService.rateApplication(id, dto.rating);
    }

    @Patch('applications/:id/assign')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    assignApplication(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignApplicationDto) {
        return this.recruitmentService.assignApplication(id, dto.staff_id);
    }

    @Get('applications-stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getApplicationStats(@Query('job_post_id') jobPostId?: string) {
        return this.recruitmentService.getApplicationStats(jobPostId);
    }

    // ==================== CANDIDATES ====================

    @Get('candidates')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getCandidates(
        @Query('search') search?: string,
        @Query('status') status?: CandidateStatus,
    ) {
        return this.recruitmentService.getCandidates({ search, status });
    }

    @Get('candidates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getCandidate(@Param('id') id: string) {
        return this.recruitmentService.getCandidate(id);
    }

    @Get('candidates/:id/applications')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getCandidateApplications(@Param('id') id: string) {
        return this.recruitmentService.getCandidateApplications(id);
    }

    @Put('candidates/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    updateCandidate(@Param('id') id: string, @Body() dto: UpdateCandidateDto) {
        return this.recruitmentService.updateCandidate(id, dto);
    }

    @Post('candidates/:id/notes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    addCandidateNote(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AddCandidateNoteDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.recruitmentService.addCandidateNote(id, staffId, dto.content);
    }

    @Get('candidates/:id/notes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getCandidateNotes(@Param('id') id: string) {
        return this.recruitmentService.getCandidateNotes(id);
    }

    // ==================== INTERVIEWS ====================

    @Get('interviews')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getInterviews(
        @Query('application_id') applicationId?: string,
        @Query('date') date?: string,
    ) {
        return this.recruitmentService.getInterviews({ application_id: applicationId, date });
    }

    @Get('interviews/upcoming')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getUpcomingInterviews(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        return this.recruitmentService.getUpcomingInterviews(staffId);
    }

    @Get('interviews/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getInterview(@Param('id') id: string) {
        return this.recruitmentService.getInterview(id);
    }

    @Post('interviews')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    scheduleInterview(@Body() dto: ScheduleInterviewDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        return this.recruitmentService.scheduleInterview(dto, staffId);
    }

    @Patch('interviews/:id/feedback')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    submitInterviewFeedback(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: InterviewFeedbackDto,
    ) {
        return this.recruitmentService.updateInterviewFeedback(id, dto);
    }

    @Patch('interviews/:id/reschedule')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    rescheduleInterview(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RescheduleInterviewDto,
    ) {
        return this.recruitmentService.rescheduleInterview(id, dto.scheduled_at, dto.reason);
    }

    @Patch('interviews/:id/cancel')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    cancelInterview(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelInterviewDto,
    ) {
        return this.recruitmentService.cancelInterview(id, dto.reason, dto.will_reschedule);
    }

    @Post('interviews/send-reminders')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    sendInterviewReminders() {
        return this.recruitmentService.sendInterviewReminders();
    }

    // ==================== PIPELINE STAGES ====================

    @Get('stages')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getPipelineStages() {
        return this.recruitmentService.getPipelineStages();
    }

    @Post('stages')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    createPipelineStage(@Body() dto: CreatePipelineStageDto) {
        return this.recruitmentService.createPipelineStage(dto);
    }

    @Put('stages/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    updatePipelineStage(@Param('id') id: string, @Body() dto: UpdatePipelineStageDto) {
        return this.recruitmentService.updatePipelineStage(id, dto);
    }

    // ==================== DASHBOARD ====================

    @Get('dashboard')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getDashboardStats() {
        return this.recruitmentService.getDashboardStats();
    }

    // ==================== OFFERS ====================

    @Post('applications/:id/offer')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    createOffer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateOfferDto, @Req() req: AuthenticatedRequest) {
        return this.recruitmentService.createOffer(id, dto, req.user?.id);
    }

    // ==================== BACKGROUND CHECKS ====================

    @Post('background-checks')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    initiateBackgroundCheck(@Body() dto: InitiateBackgroundCheckDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.backgroundCheckService.initiateBackgroundCheck(dto, staffId);
    }

    @Get('background-checks/pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    getPendingBackgroundChecks() {
        return this.backgroundCheckService.getPendingBackgroundChecks();
    }

    @Get('candidates/:id/background-checks')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getCandidateBackgroundChecks(@Param('id') id: string) {
        return this.backgroundCheckService.getBackgroundChecksForCandidate(id);
    }

    @Get('candidates/:id/background-summary')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getCandidateBackgroundSummary(@Param('id') id: string) {
        return this.backgroundCheckService.getBackgroundCheckSummary(id);
    }

    @Patch('background-checks/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    updateBackgroundCheck(@Param('id') id: string, @Body() dto: UpdateBackgroundCheckDto) {
        return this.backgroundCheckService.updateBackgroundCheck(id, dto);
    }

    @Patch('background-checks/:id/review')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    reviewBackgroundCheck(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ReviewBackgroundCheckDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.backgroundCheckService.reviewBackgroundCheck(id, staffId, dto.notes);
    }

    // ==================== REFERENCE CHECKS ====================

    @Post('reference-checks')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    createReferenceCheck(@Body() body: CreateReferenceCheckDto) {
        return this.backgroundCheckService.createReferenceCheck(body);
    }

    @Get('candidates/:id/reference-checks')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getCandidateReferenceChecks(@Param('id') id: string) {
        return this.backgroundCheckService.getReferenceChecksForCandidate(id);
    }

    @Get('candidates/:id/reference-summary')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getCandidateReferenceSummary(@Param('id') id: string) {
        return this.backgroundCheckService.getReferenceSummary(id);
    }

    @Patch('reference-checks/:id/contact')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    recordReferenceContact(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.backgroundCheckService.recordContactAttempt(id, staffId);
    }

    @Patch('reference-checks/:id/response')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    submitReferenceResponse(@Param('id') id: string, @Body() body: SubmitReferenceResponseDto) {
        return this.backgroundCheckService.submitReferenceResponse(id, body);
    }

    @Patch('reference-checks/:id/verify')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    verifyReference(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VerifyReferenceDto) {
        return this.backgroundCheckService.verifyReference(id, dto.verified, dto.notes);
    }

    // ==================== ELECTRONIC SIGNATURES ====================

    @Post('offers/:id/signature-request')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    createSignatureRequest(@Param('id', ParseUUIDPipe) offerId: string, @Body() dto: CreateSignatureRequestDto) {
        return this.signatureService.createSignatureRequest(offerId, dto.expires_in_days);
    }

    // Public endpoint for candidates to view and sign offers
    @Get('sign/:token')
    getSignatureRequest(@Param('token') token: string) {
        return this.signatureService.getSignatureByToken(token);
    }

    @Post('sign/:token')
    signOffer(
        @Param('token') token: string,
        @Body() dto: SignOfferDto,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ) {
        return this.signatureService.signOffer(token, dto, { ip_address: ip, user_agent: userAgent });
    }

    @Post('sign/:token/decline')
    declineOffer(
        @Param('token') token: string,
        @Body() dto: DeclineOfferDto,
        @Ip() ip: string,
    ) {
        return this.signatureService.declineOffer(token, dto.reason, { ip_address: ip });
    }

    @Get('offers/:id/signatures')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    getOfferSignatures(@Param('id') offerId: string) {
        return this.signatureService.getSignaturesForOffer(offerId);
    }

    // ==================== REJECT APPLICATION ====================

    @Patch('applications/:id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    rejectApplication(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason?: string,
    ) {
        return this.recruitmentService.rejectApplication(id, reason);
    }

    @Post('applications/bulk-reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    bulkRejectApplications(
        @Body() dto: { applicationIds: string[]; reason?: string },
    ) {
        if (!dto.applicationIds || dto.applicationIds.length === 0) {
            throw new BadRequestException('Application IDs are required');
        }
        return this.recruitmentService.bulkRejectApplications(dto.applicationIds, dto.reason);
    }

    // ==================== WITHDRAW APPLICATION (Public) ====================

    @Post('applications/:id/withdraw')
    withdrawApplication(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('email') email: string,
    ) {
        if (!email) throw new BadRequestException('Email is required to verify identity');
        return this.recruitmentService.withdrawApplication(id, email);
    }

    // ==================== DELETE JOB POST ====================

    @Delete('jobs/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    deleteJobPost(@Param('id', ParseUUIDPipe) id: string) {
        return this.recruitmentService.deleteJobPost(id);
    }

    // ==================== DELETE PIPELINE STAGE ====================

    @Delete('stages/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    deletePipelineStage(@Param('id', ParseUUIDPipe) id: string) {
        return this.recruitmentService.deletePipelineStage(id);
    }

    // ==================== BLACKLIST CANDIDATE ====================

    @Patch('candidates/:id/blacklist')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    blacklistCandidate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('reason') reason?: string,
    ) {
        return this.recruitmentService.blacklistCandidate(id, reason);
    }

    @Patch('candidates/:id/unblacklist')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    unblacklistCandidate(@Param('id', ParseUUIDPipe) id: string) {
        return this.recruitmentService.unblacklistCandidate(id);
    }
}

