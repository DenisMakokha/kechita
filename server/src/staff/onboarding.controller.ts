import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query,
    UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { OnboardingService, CreateTemplateDto, CreateTaskDto } from './services/onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) { }

    // ==================== TEMPLATES ====================

    @Get('templates')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getTemplates(@Query('activeOnly') activeOnly?: string) {
        return this.onboardingService.getTemplates(activeOnly !== 'false');
    }

    @Get('templates/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getTemplate(@Param('id') id: string) {
        return this.onboardingService.getTemplate(id);
    }

    @Post('templates')
    @Roles('CEO', 'HR_MANAGER')
    createTemplate(
        @Body() data: CreateTemplateDto,
        @Request() req: any,
    ) {
        return this.onboardingService.createTemplate(data, req.user?.staff_id);
    }

    @Patch('templates/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateTemplate(
        @Param('id') id: string,
        @Body() data: Partial<CreateTemplateDto>,
    ) {
        return this.onboardingService.updateTemplate(id, data);
    }

    @Delete('templates/:id')
    @Roles('CEO', 'HR_MANAGER')
    async deleteTemplate(@Param('id') id: string) {
        await this.onboardingService.deleteTemplate(id);
        return { success: true, message: 'Template deleted' };
    }

    // ==================== TASKS ====================

    @Post('templates/:templateId/tasks')
    @Roles('CEO', 'HR_MANAGER')
    addTaskToTemplate(
        @Param('templateId') templateId: string,
        @Body() data: CreateTaskDto,
    ) {
        return this.onboardingService.addTaskToTemplate(templateId, data);
    }

    @Patch('tasks/:taskId')
    @Roles('CEO', 'HR_MANAGER')
    updateTask(
        @Param('taskId') taskId: string,
        @Body() data: Partial<CreateTaskDto>,
    ) {
        return this.onboardingService.updateTask(taskId, data);
    }

    @Delete('tasks/:taskId')
    @Roles('CEO', 'HR_MANAGER')
    async deleteTask(@Param('taskId') taskId: string) {
        await this.onboardingService.deleteTask(taskId);
        return { success: true, message: 'Task deleted' };
    }

    // ==================== INSTANCES ====================

    @Get('instances')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getInProgressInstances() {
        return this.onboardingService.getInProgressInstances();
    }

    @Get('instances/overdue')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getOverdueInstances() {
        return this.onboardingService.getOverdueInstances();
    }

    @Get('instances/:id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'BRANCH_MANAGER')
    getInstance(@Param('id') id: string) {
        return this.onboardingService.getInstance(id);
    }

    @Get('staff/:staffId')
    getStaffInstance(@Param('staffId') staffId: string) {
        return this.onboardingService.getStaffInstance(staffId);
    }

    @Post('staff/:staffId/start')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    createInstance(
        @Param('staffId') staffId: string,
        @Body('templateId') templateId?: string,
        @Request() req?: any,
    ) {
        return this.onboardingService.createInstance(
            staffId,
            templateId,
            req?.user?.staff_id,
        );
    }

    // ==================== TASK STATUS UPDATES ====================

    @Patch('task-status/:taskStatusId/complete')
    completeTask(
        @Param('taskStatusId') taskStatusId: string,
        @Body('notes') notes?: string,
        @Body('documentId') documentId?: string,
        @Request() req?: any,
    ) {
        if (!req?.user?.staff_id) {
            throw new BadRequestException('Staff ID required');
        }
        return this.onboardingService.completeTask(
            taskStatusId,
            req.user.staff_id,
            notes,
            documentId,
        );
    }

    @Patch('task-status/:taskStatusId/skip')
    @Roles('CEO', 'HR_MANAGER')
    skipTask(
        @Param('taskStatusId') taskStatusId: string,
        @Body('reason') reason: string,
        @Request() req: any,
    ) {
        if (!reason) {
            throw new BadRequestException('Reason is required to skip a task');
        }
        return this.onboardingService.skipTask(
            taskStatusId,
            reason,
            req.user?.staff_id,
        );
    }

    // ==================== MY ONBOARDING ====================

    @Get('my')
    async getMyOnboarding(@Request() req: any) {
        const staffId = req.user?.staff_id;
        if (!staffId) {
            throw new BadRequestException('Staff ID not found');
        }
        return this.onboardingService.getStaffInstance(staffId);
    }

    @Patch('my/tasks/:taskStatusId/complete')
    async completeMyTask(
        @Param('taskStatusId') taskStatusId: string,
        @Body('notes') notes?: string,
        @Body('documentId') documentId?: string,
        @Request() req?: any,
    ) {
        const staffId = req?.user?.staff_id;
        if (!staffId) {
            throw new BadRequestException('Staff ID not found');
        }
        return this.onboardingService.completeTask(
            taskStatusId,
            staffId,
            notes,
            documentId,
        );
    }

    // ==================== STATS ====================

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    getStats() {
        return this.onboardingService.getOnboardingStats();
    }
}
