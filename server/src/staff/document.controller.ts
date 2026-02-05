import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UploadedFile, UseInterceptors, Res, StreamableFile,
    UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentService } from './services/document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentController {
    constructor(private readonly documentService: DocumentService) { }

    // ==================== DOCUMENT TYPES ====================

    @Get('types')
    getDocumentTypes(@Query('activeOnly') activeOnly?: string) {
        return this.documentService.getDocumentTypes(activeOnly !== 'false');
    }

    @Get('types/:id')
    getDocumentType(@Param('id') id: string) {
        return this.documentService.getDocumentType(id);
    }

    @Post('types')
    @Roles('CEO', 'HR_MANAGER')
    createDocumentType(@Body() data: any) {
        return this.documentService.createDocumentType(data);
    }

    @Patch('types/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateDocumentType(@Param('id') id: string, @Body() data: any) {
        return this.documentService.updateDocumentType(id, data);
    }

    // ==================== FILE UPLOAD ====================

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
            }
        },
    }))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        return this.documentService.uploadFile(file as any, req.user?.staff_id);
    }

    @Post('staff/:staffId/upload')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
            }
        },
    }))
    async uploadStaffDocument(
        @Param('staffId') staffId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('documentTypeId') documentTypeId: string,
        @Body('expiryDate') expiryDate?: string,
        @Body('issueDate') issueDate?: string,
        @Body('referenceNumber') referenceNumber?: string,
        @Request() req?: any,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        if (!documentTypeId) {
            throw new BadRequestException('documentTypeId is required');
        }

        return this.documentService.uploadStaffDocument(
            staffId,
            documentTypeId,
            file as any,
            {
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                issueDate: issueDate ? new Date(issueDate) : undefined,
                referenceNumber,
            },
            req?.user?.staff_id,
        );
    }

    // ==================== DOCUMENT ACCESS ====================

    @Get(':id')
    getDocument(@Param('id') id: string) {
        return this.documentService.getDocument(id);
    }

    @Get(':id/download')
    async downloadDocument(
        @Param('id') id: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const { buffer, document } = await this.documentService.getDocumentFile(id);

        res.set({
            'Content-Type': document.mime_type,
            'Content-Disposition': `attachment; filename="${document.original_name}"`,
            'Content-Length': buffer.length,
        });

        return new StreamableFile(buffer);
    }

    @Get(':id/preview')
    async previewDocument(
        @Param('id') id: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const { buffer, document } = await this.documentService.getDocumentFile(id);

        res.set({
            'Content-Type': document.mime_type,
            'Content-Disposition': `inline; filename="${document.original_name}"`,
            'Content-Length': buffer.length,
        });

        return new StreamableFile(buffer);
    }

    @Delete(':id')
    @Roles('CEO', 'HR_MANAGER')
    async deleteDocument(@Param('id') id: string) {
        await this.documentService.deleteDocument(id);
        return { success: true, message: 'Document deleted' };
    }

    // ==================== STAFF DOCUMENTS ====================

    @Get('staff/:staffId')
    getStaffDocuments(@Param('staffId') staffId: string) {
        return this.documentService.getStaffDocuments(staffId);
    }

    @Get('staff/:staffId/compliance')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getStaffCompliance(@Param('staffId') staffId: string) {
        return this.documentService.getStaffDocumentCompliance(staffId);
    }

    @Get('staff-document/:id')
    getStaffDocument(@Param('id') id: string) {
        return this.documentService.getStaffDocument(id);
    }

    @Patch('staff-document/:id/verify')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    verifyDocument(
        @Param('id') id: string,
        @Body('notes') notes: string,
        @Request() req: any,
    ) {
        return this.documentService.verifyDocument(id, req.user?.staff_id, notes);
    }

    @Patch('staff-document/:id/reject')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    rejectDocument(
        @Param('id') id: string,
        @Body('reason') reason: string,
        @Request() req: any,
    ) {
        if (!reason) {
            throw new BadRequestException('reason is required');
        }
        return this.documentService.rejectDocument(id, reason, req.user?.staff_id);
    }

    @Delete('staff-document/:id')
    @Roles('CEO', 'HR_MANAGER')
    async deleteStaffDocument(@Param('id') id: string) {
        await this.documentService.deleteStaffDocument(id);
        return { success: true, message: 'Staff document deleted' };
    }

    // ==================== EXPIRING DOCUMENTS ====================

    @Get('expiring/all')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getExpiringDocuments(@Query('days') days?: string) {
        const daysAhead = days ? parseInt(days) : 30;
        return this.documentService.getExpiringDocuments(daysAhead);
    }

    @Get('expired/all')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getExpiredDocuments() {
        return this.documentService.getExpiredDocuments();
    }

    @Post('expired/update-statuses')
    @Roles('CEO', 'HR_MANAGER')
    updateExpiredStatuses() {
        return this.documentService.updateExpiredDocumentStatuses()
            .then(count => ({ success: true, updatedCount: count }));
    }
}
