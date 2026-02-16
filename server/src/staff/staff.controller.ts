import {
    Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
    UseGuards, UseInterceptors, UploadedFile, Req, Res, BadRequestException,
    ParseFilePipeBuilder, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto, StaffFilterDto } from './dto/staff.dto';
import { DocumentService } from './services/document.service';
import { OnboardingService } from './services/onboarding.service';
import { ContractService } from './services/contract.service';
import { CreateTemplateDto, CreateTaskDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StaffStatus, ProbationStatus } from './entities/staff.entity';
import { ContractType } from './entities/staff-contract.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
    constructor(
        private readonly staffService: StaffService,
        private readonly documentService: DocumentService,
        private readonly onboardingService: OnboardingService,
        private readonly contractService: ContractService,
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

    // ==================== HIRE CANDIDATE ====================

    @Post('hire-candidate')
    @Roles('CEO', 'HR_MANAGER')
    hireCandidate(
        @Body() data: {
            candidate_first_name: string;
            candidate_last_name: string;
            candidate_email: string;
            candidate_phone?: string;
            position_id: string;
            role_id: string;
            branch_id?: string;
            region_id?: string;
            department_id?: string;
            manager_id?: string;
            basic_salary?: number;
            hire_date?: string;
            probation_months?: number;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.staffService.hireCandidate(data, req.user.id);
    }

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(60000)
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
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.findOne(id);
    }

    @Get(':id/direct-reports')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    getDirectReports(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.getDirectReports(id);
    }

    @Get(':id/team-hierarchy')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    getTeamHierarchy(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.getTeamHierarchy(id);
    }

    @Put(':id')
    @Roles('CEO', 'HR_MANAGER')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() updateStaffDto: UpdateStaffDto, @Req() req: AuthenticatedRequest) {
        return this.staffService.update(id, updateStaffDto, req.user.id);
    }

    @Patch(':id/activate')
    @Roles('CEO', 'HR_MANAGER')
    activate(@Param('id', ParseUUIDPipe) id: string) {
        return this.staffService.activateStaff(id);
    }

    @Patch(':id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    deactivate(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason?: string) {
        return this.staffService.deactivateStaff(id, reason);
    }

    @Patch(':id/terminate')
    @Roles('CEO', 'HR_MANAGER')
    terminate(
        @Param('id', ParseUUIDPipe) id: string,
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
        @Param('id', ParseUUIDPipe) id: string,
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
    getStaffDocuments(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.documentService.getStaffDocuments(staffId);
    }

    @Get(':staffId/documents/compliance')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getDocumentCompliance(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.documentService.getStaffDocumentCompliance(staffId);
    }

    @Post(':staffId/documents')
    @UseInterceptors(FileInterceptor('file'))
    async uploadDocument(
        @Param('staffId', ParseUUIDPipe) staffId: string,
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
        @Param('docId', ParseUUIDPipe) docId: string,
        @Req() req: AuthenticatedRequest,
        @Body('notes') notes?: string,
    ) {
        return this.documentService.verifyDocument(docId, req.user.id, notes);
    }

    @Patch('documents/:docId/reject')
    @Roles('CEO', 'HR_MANAGER')
    rejectDocument(
        @Param('docId', ParseUUIDPipe) docId: string,
        @Body('reason') reason: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.documentService.rejectDocument(docId, reason, req.user.id);
    }

    @Delete('documents/:docId')
    @Roles('CEO', 'HR_MANAGER')
    deleteDocument(@Param('docId', ParseUUIDPipe) docId: string) {
        return this.documentService.deleteStaffDocument(docId);
    }

    @Get('documents/file/:documentId')
    async downloadDocument(
        @Param('documentId', ParseUUIDPipe) documentId: string,
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
    getOnboardingTemplate(@Param('id', ParseUUIDPipe) id: string) {
        return this.onboardingService.getTemplate(id);
    }

    @Post('onboarding/templates')
    @Roles('CEO', 'HR_MANAGER')
    createOnboardingTemplate(@Body() data: CreateTemplateDto, @Req() req: AuthenticatedRequest) {
        return this.onboardingService.createTemplate(data, req.user.id);
    }

    @Put('onboarding/templates/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateOnboardingTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() data: Partial<CreateTemplateDto>) {
        return this.onboardingService.updateTemplate(id, data);
    }

    @Delete('onboarding/templates/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteOnboardingTemplate(@Param('id', ParseUUIDPipe) id: string) {
        return this.onboardingService.deleteTemplate(id);
    }

    @Post('onboarding/templates/:id/tasks')
    @Roles('CEO', 'HR_MANAGER')
    addTaskToTemplate(@Param('id', ParseUUIDPipe) templateId: string, @Body() data: CreateTaskDto) {
        return this.onboardingService.addTaskToTemplate(templateId, data);
    }

    @Put('onboarding/tasks/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateOnboardingTask(@Param('id', ParseUUIDPipe) taskId: string, @Body() data: Partial<CreateTaskDto>) {
        return this.onboardingService.updateTask(taskId, data);
    }

    @Delete('onboarding/tasks/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteOnboardingTask(@Param('id', ParseUUIDPipe) taskId: string) {
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
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(60000)
    getOnboardingStats() {
        return this.onboardingService.getOnboardingStats();
    }

    @Get(':staffId/onboarding')
    getStaffOnboarding(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.onboardingService.getStaffInstance(staffId);
    }

    @Post(':staffId/onboarding')
    @Roles('CEO', 'HR_MANAGER')
    createStaffOnboarding(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Req() req: AuthenticatedRequest,
        @Body('templateId') templateId?: string,
    ) {
        return this.onboardingService.createInstance(staffId, templateId, req.user.id);
    }

    @Patch('onboarding/tasks/:taskStatusId/complete')
    completeOnboardingTask(
        @Param('taskStatusId', ParseUUIDPipe) taskStatusId: string,
        @Req() req: AuthenticatedRequest,
        @Body('notes') notes?: string,
        @Body('documentId') documentId?: string,
    ) {
        return this.onboardingService.completeTask(taskStatusId, req.user.staff_id || '', notes, documentId);
    }

    @Patch('onboarding/tasks/:taskStatusId/skip')
    @Roles('CEO', 'HR_MANAGER')
    skipOnboardingTask(
        @Param('taskStatusId', ParseUUIDPipe) taskStatusId: string,
        @Body('reason') reason: string,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.onboardingService.skipTask(taskStatusId, reason, req.user.id);
    }

    // ==================== EMPLOYMENT HISTORY ====================

    @Get(':staffId/employment-history')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getEmploymentHistory(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.staffService.getEmploymentHistory(staffId);
    }

    @Post(':staffId/employment-history')
    @Roles('CEO', 'HR_MANAGER')
    addEmploymentHistory(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Body() data: {
            position_id?: string;
            region_id?: string;
            branch_id?: string;
            employment_type?: string;
            start_date: string;
            end_date?: string;
            change_reason?: string;
        },
    ) {
        return this.staffService.addEmploymentHistory(staffId, {
            ...data,
            start_date: new Date(data.start_date),
            end_date: data.end_date ? new Date(data.end_date) : undefined,
        });
    }

    // ==================== PROMOTION ====================

    @Post(':id/promote')
    @Roles('CEO', 'HR_MANAGER')
    promoteStaff(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: {
            new_position_id: string;
            new_salary?: number;
            new_department_id?: string;
            new_branch_id?: string;
            effective_date?: string;
            reason?: string;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.staffService.promoteStaff(
            id,
            {
                ...data,
                effective_date: data.effective_date ? new Date(data.effective_date) : undefined,
            },
            req.user.id,
        );
    }

    // ==================== TRANSFER ====================

    @Post(':id/transfer')
    @Roles('CEO', 'HR_MANAGER')
    transferStaff(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: {
            region_id?: string;
            branch_id?: string;
            position_id?: string;
            manager_id?: string;
            effective_date?: string;
            reason?: string;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.staffService.transferStaff(
            id,
            {
                ...data,
                effective_date: data.effective_date ? new Date(data.effective_date) : undefined,
            },
            req.user.id,
        );
    }

    // ==================== PHOTO UPLOAD ====================

    @Post(':id/photo')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    @UseInterceptors(FileInterceptor('photo'))
    async uploadPhoto(
        @Param('id', ParseUUIDPipe) id: string,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ })
                .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }) // 5MB
                .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
        )
        file: Express.Multer.File,
    ) {
        // Store photo via document service and get URL
        const doc = await this.documentService.uploadFile(
            {
                fieldname: file.fieldname,
                originalname: file.originalname,
                encoding: file.encoding || 'utf-8',
                mimetype: file.mimetype,
                size: file.size,
                buffer: file.buffer,
            },
            id,
        );
        return this.staffService.updatePhoto(id, `/documents/${doc.id}/preview`);
    }

    // ==================== SELF-SERVICE (MY PROFILE) ====================

    @Get('me/profile')
    async getMyProfile(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.staffService.findOne(staffId);
    }

    @Patch('me/profile')
    async updateMyProfile(
        @Req() req: AuthenticatedRequest,
        @Body() data: {
            phone?: string;
            alternate_phone?: string;
            personal_email?: string;
            address?: string;
            city?: string;
            postal_code?: string;
            emergency_contact_name?: string;
            emergency_contact_phone?: string;
            emergency_contact_relationship?: string;
            bank_name?: string;
            bank_branch?: string;
            bank_account_number?: string;
            bank_account_name?: string;
        },
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.staffService.updateMyProfile(staffId, data);
    }

    @Get('me/documents')
    async getMyDocuments(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.documentService.getStaffDocuments(staffId);
    }

    @Get('me/employment-history')
    async getMyEmploymentHistory(@Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.staffService.getEmploymentHistory(staffId);
    }

    // ==================== RESIGNATION ====================

    @Post('me/resign')
    async submitResignation(
        @Req() req: AuthenticatedRequest,
        @Body() data: {
            reason: string;
            last_working_date: string;
            notice_period_days?: number;
        },
    ) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        if (!data.reason) throw new BadRequestException('Resignation reason is required');
        if (!data.last_working_date) throw new BadRequestException('Last working date is required');
        
        return this.staffService.submitResignation(staffId, {
            reason: data.reason,
            last_working_date: new Date(data.last_working_date),
            notice_period_days: data.notice_period_days,
        });
    }

    // ==================== CONTRACTS ====================

    @Get('contracts/expiring')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getExpiringContracts(@Query('days') days?: string) {
        return this.contractService.getExpiringContracts(days ? parseInt(days) : 30);
    }

    @Get(':staffId/contracts')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getStaffContracts(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.contractService.findByStaff(staffId);
    }

    @Get(':staffId/contracts/active')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getActiveContract(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.contractService.getActiveContract(staffId);
    }

    @Post(':staffId/contracts')
    @Roles('CEO', 'HR_MANAGER')
    createContract(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Body() data: {
            contract_type: ContractType;
            start_date: string;
            end_date?: string;
            salary?: number;
            salary_currency?: string;
            job_title?: string;
            title?: string;
            terms?: string;
            special_conditions?: string;
            notice_period_days?: number;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.contractService.create(
            staffId,
            {
                ...data,
                start_date: new Date(data.start_date),
                end_date: data.end_date ? new Date(data.end_date) : undefined,
            },
            req.user.id,
        );
    }

    @Put('contracts/:contractId')
    @Roles('CEO', 'HR_MANAGER')
    updateContract(
        @Param('contractId', ParseUUIDPipe) contractId: string,
        @Body() data: any,
    ) {
        return this.contractService.update(contractId, data);
    }

    @Patch('contracts/:contractId/activate')
    @Roles('CEO', 'HR_MANAGER')
    activateContract(@Param('contractId', ParseUUIDPipe) contractId: string) {
        return this.contractService.activate(contractId);
    }

    @Patch('contracts/:contractId/terminate')
    @Roles('CEO', 'HR_MANAGER')
    terminateContract(
        @Param('contractId', ParseUUIDPipe) contractId: string,
        @Body() data: { reason: string; termination_date?: string },
    ) {
        return this.contractService.terminate(
            contractId,
            data.reason,
            data.termination_date ? new Date(data.termination_date) : undefined,
        );
    }

    @Post('contracts/:contractId/renew')
    @Roles('CEO', 'HR_MANAGER')
    renewContract(
        @Param('contractId', ParseUUIDPipe) contractId: string,
        @Body() data: { new_end_date: string; new_salary?: number; new_terms?: string },
        @Req() req: AuthenticatedRequest,
    ) {
        return this.contractService.renew(
            contractId,
            {
                new_end_date: new Date(data.new_end_date),
                new_salary: data.new_salary,
                new_terms: data.new_terms,
            },
            req.user.id,
        );
    }

    @Delete('contracts/:contractId')
    @Roles('CEO', 'HR_MANAGER')
    deleteContract(@Param('contractId', ParseUUIDPipe) contractId: string) {
        return this.contractService.delete(contractId);
    }

    @Get('contracts/:contractId/pdf')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async downloadContractPDF(
        @Param('contractId', ParseUUIDPipe) contractId: string,
        @Res() res: any,
    ) {
        const { buffer, fileName } = await this.contractService.generateContractPDF(contractId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    }

    @Get('contracts/:contractId/pdf/preview')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async previewContractPDF(
        @Param('contractId', ParseUUIDPipe) contractId: string,
        @Res() res: any,
    ) {
        const { buffer, fileName } = await this.contractService.generateContractPDF(contractId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    }
}
