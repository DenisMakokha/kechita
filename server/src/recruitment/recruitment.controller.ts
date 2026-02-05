import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, Ip, Headers } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { BackgroundCheckService, InitiateBackgroundCheckDto, CreateReferenceCheckDto, SubmitReferenceResponseDto } from './background-check.service';
import { SignatureService } from './signature.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JobStatus } from './entities/job-post.entity';
import { ApplicationStatus } from './entities/application.entity';
import { CandidateStatus } from './entities/candidate.entity';
import { InterviewOutcome } from './entities/interview.entity';

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
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    applyToJob(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() file: any,
    ) {
        const applicationData = {
            ...body,
            years_of_experience: body.years_of_experience ? Number(body.years_of_experience) : undefined,
            expected_salary: body.expected_salary ? Number(body.expected_salary) : undefined,
            resume_url: file ? `/uploads/resumes/${file.filename}` : body.resume_url,
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
    createJobPost(@Body() body: any, @Request() req: any) {
        return this.recruitmentService.createJobPost(body, req.user?.staff_id);
    }

    @Put('jobs/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    updateJobPost(@Param('id') id: string, @Body() body: any) {
        return this.recruitmentService.updateJobPost(id, body);
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
        @Param('id') id: string,
        @Body() body: { stage_code: string; notes?: string },
    ) {
        return this.recruitmentService.updateApplicationStage(id, body.stage_code, body.notes);
    }

    @Patch('applications/:id/star')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    starApplication(@Param('id') id: string, @Body() body: { starred: boolean }) {
        return this.recruitmentService.starApplication(id, body.starred);
    }

    @Patch('applications/:id/rate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    rateApplication(@Param('id') id: string, @Body() body: { rating: number }) {
        return this.recruitmentService.rateApplication(id, body.rating);
    }

    @Patch('applications/:id/assign')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    assignApplication(@Param('id') id: string, @Body() body: { staff_id: string }) {
        return this.recruitmentService.assignApplication(id, body.staff_id);
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
    updateCandidate(@Param('id') id: string, @Body() body: any) {
        return this.recruitmentService.updateCandidate(id, body);
    }

    @Post('candidates/:id/notes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    addCandidateNote(
        @Param('id') id: string,
        @Body() body: { content: string },
        @Request() req: any
    ) {
        return this.recruitmentService.addCandidateNote(id, req.user?.staff_id, body.content);
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
    getUpcomingInterviews(@Request() req: any) {
        return this.recruitmentService.getUpcomingInterviews(req.user?.staff_id);
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
    scheduleInterview(@Body() body: any, @Request() req: any) {
        return this.recruitmentService.scheduleInterview(body, req.user?.staff_id);
    }

    @Patch('interviews/:id/feedback')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    submitInterviewFeedback(
        @Param('id') id: string,
        @Body() body: {
            outcome: InterviewOutcome;
            overall_rating?: number;
            feedback?: string;
            strengths?: string;
            weaknesses?: string;
            competency_scores?: Record<string, number>;
        },
    ) {
        return this.recruitmentService.updateInterviewFeedback(id, body);
    }

    @Patch('interviews/:id/reschedule')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    rescheduleInterview(
        @Param('id') id: string,
        @Body() body: { scheduled_at: string; reason?: string },
    ) {
        return this.recruitmentService.rescheduleInterview(id, body.scheduled_at, body.reason);
    }

    @Patch('interviews/:id/cancel')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    cancelInterview(
        @Param('id') id: string,
        @Body() body: { reason?: string; will_reschedule?: boolean },
    ) {
        return this.recruitmentService.cancelInterview(id, body.reason, body.will_reschedule);
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
    createPipelineStage(@Body() body: any) {
        return this.recruitmentService.createPipelineStage(body);
    }

    @Put('stages/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    updatePipelineStage(@Param('id') id: string, @Body() body: any) {
        return this.recruitmentService.updatePipelineStage(id, body);
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
    createOffer(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.recruitmentService.createOffer(id, body, req.user?.id);
    }

    // ==================== BACKGROUND CHECKS ====================

    @Post('background-checks')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    initiateBackgroundCheck(@Body() body: InitiateBackgroundCheckDto, @Request() req: any) {
        return this.backgroundCheckService.initiateBackgroundCheck(body, req.user?.staff_id);
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
    updateBackgroundCheck(@Param('id') id: string, @Body() body: any) {
        return this.backgroundCheckService.updateBackgroundCheck(id, body);
    }

    @Patch('background-checks/:id/review')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    reviewBackgroundCheck(@Param('id') id: string, @Body() body: { notes?: string }, @Request() req: any) {
        return this.backgroundCheckService.reviewBackgroundCheck(id, req.user?.staff_id, body.notes);
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
    recordReferenceContact(@Param('id') id: string, @Request() req: any) {
        return this.backgroundCheckService.recordContactAttempt(id, req.user?.staff_id);
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
    verifyReference(@Param('id') id: string, @Body() body: { verified: boolean; notes?: string }) {
        return this.backgroundCheckService.verifyReference(id, body.verified, body.notes);
    }

    // ==================== ELECTRONIC SIGNATURES ====================

    @Post('offers/:id/signature-request')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    createSignatureRequest(@Param('id') offerId: string, @Body() body: { expires_in_days?: number }) {
        return this.signatureService.createSignatureRequest(offerId, body.expires_in_days);
    }

    // Public endpoint for candidates to view and sign offers
    @Get('sign/:token')
    getSignatureRequest(@Param('token') token: string) {
        return this.signatureService.getSignatureByToken(token);
    }

    @Post('sign/:token')
    signOffer(
        @Param('token') token: string,
        @Body() body: { signature_type: 'drawn' | 'typed' | 'uploaded'; signature_data?: string; typed_name?: string },
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ) {
        return this.signatureService.signOffer(token, body, { ip_address: ip, user_agent: userAgent });
    }

    @Post('sign/:token/decline')
    declineOffer(
        @Param('token') token: string,
        @Body() body: { reason: string },
        @Ip() ip: string,
    ) {
        return this.signatureService.declineOffer(token, body.reason, { ip_address: ip });
    }

    @Get('offers/:id/signatures')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('CEO', 'HR_MANAGER')
    getOfferSignatures(@Param('id') offerId: string) {
        return this.signatureService.getSignaturesForOffer(offerId);
    }
}

