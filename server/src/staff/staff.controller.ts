import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, UseInterceptors, UploadedFile, Req, Res, BadRequestException,
    ParseFilePipeBuilder, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto, StaffFilterDto } from './dto/staff.dto';
import { DocumentService } from './services/document.service';
import { OnboardingService } from './services/onboarding.service';
import { CreateTemplateDto, CreateTaskDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StaffStatus, ProbationStatus } from './entities/staff.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
    constructor(
        private readonly staffService: StaffService,
        private readonly documentService: DocumentService,
        private readonly onboardingService: OnboardingService,
    ) { }

    // ==================== STAFF CRUD ====================

    @Post()
    @Roles('CEO', 'HR_MANAGER')
    create(@Body() createStaffDto: CreateStaffDto, @Req() req: AuthenticatedRequest) {
        return this.staffService.create(createStaffDto, req.user.id);
    }

    @Get()
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    findAll(@Query() query: any) {
        const filter: StaffFilterDto = {
            status: query.status,
            branchId: query.branchId,
            regionId: query.regionId,
            departmentId: query.departmentId,
            positionId: query.positionId,
            managerId: query.managerId,
            search: query.search,
            isProbationary: query.isProbationary === 'true',
            role: query.role,
        };
        return this.staffService.findAll(filter);
    }

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER')
    getStats() {
        return this.staffService.getStaffStats();
    }

    @Get('probation/upcoming')
    @Roles('CEO', 'HR_MANAGER')
    getUpcomingProbationReviews(@Query('days') days?: string) {
        return this.staffService.getUpcomingProbationReviews(days ? parseInt(days) : 30);
    }

    @Get('probation/overdue')
    @Roles('CEO', 'HR_MANAGER')
    getOverdueProbationReviews() {
        return this.staffService.getOverdueProbationReviews();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.staffService.findOne(id);
    }

    @Get(':id/direct-reports')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getDirectReports(@Param('id') id: string) {
        return this.staffService.getDirectReports(id);
    }

    @Get(':id/team-hierarchy')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    getTeamHierarchy(@Param('id') id: string) {
        return this.staffService.getTeamHierarchy(id);
    }

    @Put(':id')
    @Roles('CEO', 'HR_MANAGER')
    update(@Param('id') id: string, @Body() updateStaffDto: UpdateStaffDto, @Req() req: AuthenticatedRequest) {
        return this.staffService.update(id, updateStaffDto, req.user.id);
    }

    @Patch(':id/activate')
    @Roles('CEO', 'HR_MANAGER')
    activate(@Param('id') id: string) {
        return this.staffService.activateStaff(id);
    }

    @Patch(':id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    deactivate(@Param('id') id: string, @Body('reason') reason?: string) {
        return this.staffService.deactivateStaff(id, reason);
    }

    @Patch(':id/terminate')
    @Roles('CEO', 'HR_MANAGER')
    terminate(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @Body('terminationDate') terminationDate?: string,
    ) {
        return this.staffService.terminateStaff(
            id,
            reason,
            terminationDate ? new Date(terminationDate) : undefined,
        );
    }

    @Patch(':id/probation')
    @Roles('CEO', 'HR_MANAGER')
    updateProbation(
        @Param('id') id: string,
        @Body('status') status: ProbationStatus,
        @Body('notes') notes?: string,
        @Body('extendedUntil') extendedUntil?: string,
    ) {
        return this.staffService.updateProbationStatus(
            id,
            status,
            notes,
            extendedUntil ? new Date(extendedUntil) : undefined,
        );
    }

    // ==================== DOCUMENT TYPES ====================

    @Get('documents/types')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getDocumentTypes(@Query('activeOnly') activeOnly?: string) {
        return this.documentService.getDocumentTypes(activeOnly !== 'false');
    }

    @Post('documents/types')
    @Roles('CEO', 'HR_MANAGER')
    createDocumentType(@Body() data: any) {
        return this.documentService.createDocumentType(data);
    }

    @Put('documents/types/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateDocumentType(@Param('id') id: string, @Body() data: any) {
        return this.documentService.updateDocumentType(id, data);
    }

    // ==================== STAFF DOCUMENTS ====================

    @Get(':staffId/documents')
    getStaffDocuments(@Param('staffId') staffId: string) {
        return this.documentService.getStaffDocuments(staffId);
    }

    @Get(':staffId/documents/compliance')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getDocumentCompliance(@Param('staffId') staffId: string) {
        return this.documentService.getStaffDocumentCompliance(staffId);
    }

    @Post(':staffId/documents')
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @Param('staffId') staffId: string,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB
                .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
        )
        file: Express.Multer.File,
        @Body('documentTypeId') documentTypeId: string,
        @Req() req: AuthenticatedRequest,
        @Body('expiryDate') expiryDate?: string,
        @Body('issueDate') issueDate?: string,
        @Body('referenceNumber') referenceNumber?: string,
    ) {
        if (!documentTypeId) {
            throw new BadRequestException('Document type is required');
        }
        return this.documentService.uploadStaffDocument(
            staffId,
            documentTypeId,
            {
                fieldname: file.fieldname,
                originalname: file.originalname,
                encoding: file.encoding || 'utf-8',
                mimetype: file.mimetype,
                size: file.size,
                buffer: file.buffer,
            },
            {
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                issueDate: issueDate ? new Date(issueDate) : undefined,
                referenceNumber,
            },
            req.user.id,
        );
    }

    @Patch('documents/:docId/verify')
    @Roles('CEO', 'HR_MANAGER')
    verifyDocument(
        @Param('docId') docId: string,
        @Req() req: AuthenticatedRequest,
        @Body('notes') notes?: string,
    ) {
        return this.documentService.verifyDocument(docId, req.user.id, notes);
    }

    @Patch('documents/:docId/reject')
    @Roles('CEO', 'HR_MANAGER')
    rejectDocument(
        @Param('docId') docId: string,
        @Body('reason') reason: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.documentService.rejectDocument(docId, reason, req.user.id);
    }

    @Delete('documents/:docId')
    @Roles('CEO', 'HR_MANAGER')
    deleteDocument(@Param('docId') docId: string) {
        return this.documentService.deleteStaffDocument(docId);
    }

    @Get('documents/file/:documentId')
    async downloadDocument(
        @Param('documentId') documentId: string,
        @Res() res: any,
    ) {
        const { buffer, document } = await this.documentService.getDocumentFile(documentId);
        res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
        res.send(buffer);
    }

    // ==================== DOCUMENT EXPIRY ====================

    @Get('documents/expiring')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getExpiringDocuments(@Query('days') days?: string) {
        return this.documentService.getExpiringDocuments(days ? parseInt(days) : 30);
    }

    @Get('documents/expired')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getExpiredDocuments() {
        return this.documentService.getExpiredDocuments();
    }

    // ==================== ONBOARDING TEMPLATES ====================

    @Get('onboarding/templates')
    @Roles('CEO', 'HR_MANAGER')
    getOnboardingTemplates(@Query('activeOnly') activeOnly?: string) {
        return this.onboardingService.getTemplates(activeOnly !== 'false');
    }

    @Get('onboarding/templates/:id')
    @Roles('CEO', 'HR_MANAGER')
    getOnboardingTemplate(@Param('id') id: string) {
        return this.onboardingService.getTemplate(id);
    }

    @Post('onboarding/templates')
    @Roles('CEO', 'HR_MANAGER')
    createOnboardingTemplate(@Body() data: CreateTemplateDto, @Req() req: AuthenticatedRequest) {
        return this.onboardingService.createTemplate(data, req.user.id);
    }

    @Put('onboarding/templates/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateOnboardingTemplate(@Param('id') id: string, @Body() data: Partial<CreateTemplateDto>) {
        return this.onboardingService.updateTemplate(id, data);
    }

    @Delete('onboarding/templates/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteOnboardingTemplate(@Param('id') id: string) {
        return this.onboardingService.deleteTemplate(id);
    }

    @Post('onboarding/templates/:id/tasks')
    @Roles('CEO', 'HR_MANAGER')
    addTaskToTemplate(@Param('id') templateId: string, @Body() data: CreateTaskDto) {
        return this.onboardingService.addTaskToTemplate(templateId, data);
    }

    @Put('onboarding/tasks/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateOnboardingTask(@Param('id') taskId: string, @Body() data: Partial<CreateTaskDto>) {
        return this.onboardingService.updateTask(taskId, data);
    }

    @Delete('onboarding/tasks/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteOnboardingTask(@Param('id') taskId: string) {
        return this.onboardingService.deleteTask(taskId);
    }

    // ==================== ONBOARDING INSTANCES ====================

    @Get('onboarding/instances')
    @Roles('CEO', 'HR_MANAGER')
    getOnboardingInstances() {
        return this.onboardingService.getInProgressInstances();
    }

    @Get('onboarding/instances/overdue')
    @Roles('CEO', 'HR_MANAGER')
    getOverdueOnboardingInstances() {
        return this.onboardingService.getOverdueInstances();
    }

    @Get('onboarding/stats')
    @Roles('CEO', 'HR_MANAGER')
    getOnboardingStats() {
        return this.onboardingService.getOnboardingStats();
    }

    @Get(':staffId/onboarding')
    getStaffOnboarding(@Param('staffId') staffId: string) {
        return this.onboardingService.getStaffInstance(staffId);
    }

    @Post(':staffId/onboarding')
    @Roles('CEO', 'HR_MANAGER')
    createStaffOnboarding(
        @Param('staffId') staffId: string,
        @Req() req: AuthenticatedRequest,
        @Body('templateId') templateId?: string,
    ) {
        return this.onboardingService.createInstance(staffId, templateId, req.user.id);
    }

    @Patch('onboarding/tasks/:taskStatusId/complete')
    completeOnboardingTask(
        @Param('taskStatusId') taskStatusId: string,
        @Req() req: AuthenticatedRequest,
        @Body('notes') notes?: string,
        @Body('documentId') documentId?: string,
    ) {
        return this.onboardingService.completeTask(taskStatusId, req.user.staff_id || '', notes, documentId);
    }

    @Patch('onboarding/tasks/:taskStatusId/skip')
    @Roles('CEO', 'HR_MANAGER')
    skipOnboardingTask(
        @Param('taskStatusId') taskStatusId: string,
        @Body('reason') reason: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.onboardingService.skipTask(taskStatusId, reason, req.user.id);
    }
}
