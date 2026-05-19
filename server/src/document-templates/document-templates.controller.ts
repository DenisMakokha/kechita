import {
    Controller, Get, Post, Put, Delete, Patch,
    Body, Param, Query, Req, Res, UseGuards, ParseUUIDPipe, HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { DocumentTemplatesService } from './document-templates.service';
import {
    CreateDocumentTemplateDto, UpdateDocumentTemplateDto, PreviewTemplateDto,
} from './dto/document-template.dto';
import { DocumentTemplateKind, DocumentTemplateScope } from './entities/document-template.entity';

@Controller('document-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentTemplatesController {
    constructor(private readonly svc: DocumentTemplatesService) {}

    @Get()
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    list(
        @Query('kind') kind?: DocumentTemplateKind,
        @Query('scope') scope?: DocumentTemplateScope,
        @Query('activeOnly') activeOnly?: string,
    ) {
        return this.svc.list({ kind, scope, activeOnly: activeOnly === 'true' });
    }

    @Get('kinds/:kind/variables')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getVariables(@Param('kind') kind: DocumentTemplateKind) {
        return this.svc.getVariables(kind);
    }

    @Get(':id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    get(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.findOne(id);
    }

    @Post()
    @Roles('CEO', 'HR_MANAGER')
    create(@Body() dto: CreateDocumentTemplateDto, @Req() req: AuthenticatedRequest) {
        return this.svc.create(dto, req.user?.id);
    }

    @Put(':id')
    @Roles('CEO', 'HR_MANAGER')
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentTemplateDto, @Req() req: AuthenticatedRequest) {
        return this.svc.update(id, dto, req.user?.id);
    }

    @Patch(':id')
    @Roles('CEO', 'HR_MANAGER')
    patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentTemplateDto, @Req() req: AuthenticatedRequest) {
        return this.svc.update(id, dto, req.user?.id);
    }

    @Post(':id/activate')
    @HttpCode(200)
    @Roles('CEO', 'HR_MANAGER')
    activate(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.activate(id);
    }

    @Delete(':id')
    @Roles('CEO', 'HR_MANAGER')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.svc.remove(id);
    }

    /**
     * Render an HTML preview using either a draft body (sent in the request)
     * or a saved template id. Returns JSON { html } so the editor can drop it
     * into an iframe / preview pane without reflowing the SPA.
     */
    @Post('preview')
    @HttpCode(200)
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async preview(@Body() dto: PreviewTemplateDto & { id?: string }) {
        const html = await this.svc.previewHtml(dto);
        return { html };
    }

    /** Render a saved template as PDF using sample data — for HR to print-test. */
    @Get(':id/preview.pdf')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async previewPdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: any) {
        const pdf = await this.svc.previewPdf(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="template-preview.pdf"`);
        res.send(pdf);
    }
}
