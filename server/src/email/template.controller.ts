import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    BadRequestException,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TemplateService, CreateTemplateDto, UpdateTemplateDto, TemplateFilter } from './template.service';
import { TemplateCategory, TemplateStatus } from './entities/email-template.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@ApiTags('Email Templates')
@ApiBearerAuth('JWT-auth')
@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplateController {
    constructor(private readonly templateService: TemplateService) {}

    @Get()
    @Roles('CEO', 'HR_MANAGER')
    @ApiOperation({ summary: 'List all email templates', description: 'Get all email templates with optional filtering by category, status, or search term' })
    findAll(
        @Query('category') category?: TemplateCategory,
        @Query('status') status?: TemplateStatus,
        @Query('search') search?: string,
    ) {
        const filter: TemplateFilter = {};
        if (category) filter.category = category;
        if (status) filter.status = status;
        if (search) filter.search = search;
        return this.templateService.findAll(filter);
    }

    @Get('categories')
    @Roles('CEO', 'HR_MANAGER')
    @ApiOperation({ summary: 'Get template categories', description: 'Returns all available template categories' })
    getCategories() {
        return this.templateService.getCategories();
    }

    @Get(':id')
    @Roles('CEO', 'HR_MANAGER')
    @ApiOperation({ summary: 'Get template by ID', description: 'Retrieve a specific email template by its ID' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.templateService.findOne(id);
    }

    @Post()
    @Roles('CEO', 'HR_MANAGER')
    @ApiOperation({ summary: 'Create email template', description: 'Create a new email template with HTML content and variables' })
    create(@Body() dto: CreateTemplateDto, @Req() req: AuthenticatedRequest) {
        const userId = req.user?.id;
        return this.templateService.create(dto, userId);
    }

    @Put(':id')
    @Roles('CEO', 'HR_MANAGER')
    @ApiOperation({ summary: 'Update email template', description: 'Update an existing email template' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTemplateDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const userId = req.user?.id;
        return this.templateService.update(id, dto, userId);
    }

    @Delete(':id')
    @Roles('CEO', 'HR_MANAGER')
    @ApiOperation({ summary: 'Delete email template', description: 'Delete an email template (system templates cannot be deleted)' })
    remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const userId = req.user?.id;
        return this.templateService.delete(id, userId);
    }

    @Post('seed-defaults')
    @Roles('CEO')
    @ApiOperation({ summary: 'Seed default templates', description: 'Initialize system with default email templates (CEO only)' })
    async seedDefaults() {
        await this.templateService.seedDefaultTemplates();
        return { message: 'Default templates seeded successfully' };
    }
}
