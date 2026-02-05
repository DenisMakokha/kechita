import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThanOrEqual, MoreThan } from 'typeorm';
import { OnboardingTemplate } from '../entities/onboarding-template.entity';
import { OnboardingTask, TaskCategory } from '../entities/onboarding-task.entity';
import { OnboardingInstance, OnboardingInstanceStatus } from '../entities/onboarding-instance.entity';
import { OnboardingTaskStatus, TaskCompletionStatus } from '../entities/onboarding-task-status.entity';
import { Staff } from '../entities/staff.entity';
import { CreateTemplateDto, CreateTaskDto } from '../dto/onboarding.dto';

// Re-export for convenience
export { CreateTemplateDto, CreateTaskDto } from '../dto/onboarding.dto';

@Injectable()
export class OnboardingService {
    constructor(
        @InjectRepository(OnboardingTemplate)
        private templateRepo: Repository<OnboardingTemplate>,
        @InjectRepository(OnboardingTask)
        private taskRepo: Repository<OnboardingTask>,
        @InjectRepository(OnboardingInstance)
        private instanceRepo: Repository<OnboardingInstance>,
        @InjectRepository(OnboardingTaskStatus)
        private taskStatusRepo: Repository<OnboardingTaskStatus>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
    ) { }

    // ==================== TEMPLATE MANAGEMENT ====================

    async createTemplate(data: CreateTemplateDto, createdBy?: string): Promise<OnboardingTemplate> {
        const template = this.templateRepo.create({
            name: data.name,
            description: data.description,
            is_default: data.isDefault || false,
            expected_days: data.expectedDays || 30,
            created_by: createdBy,
        });

        const savedTemplate = await this.templateRepo.save(template);

        // Create tasks
        if (data.tasks && data.tasks.length > 0) {
            for (let i = 0; i < data.tasks.length; i++) {
                const taskData = data.tasks[i];
                const task = this.taskRepo.create({
                    template: savedTemplate,
                    name: taskData.name,
                    description: taskData.description,
                    category: taskData.category || TaskCategory.OTHER,
                    sort_order: taskData.sortOrder ?? i,
                    is_required: taskData.isRequired ?? true,
                    responsible_party: taskData.responsibleParty || 'employee',
                    due_days_from_start: taskData.dueDaysFromStart ?? 7,
                    required_document_type_id: taskData.requiredDocumentTypeId,
                    instructions: taskData.instructions,
                    resource_url: taskData.resourceUrl,
                });
                await this.taskRepo.save(task);
            }
        }

        return this.getTemplate(savedTemplate.id);
    }

    async getTemplates(activeOnly = true): Promise<OnboardingTemplate[]> {
        const where = activeOnly ? { is_active: true } : {};
        return this.templateRepo.find({
            where,
            relations: ['tasks', 'position', 'department'],
            order: { name: 'ASC' },
        });
    }

    async getTemplate(id: string): Promise<OnboardingTemplate> {
        const template = await this.templateRepo.findOne({
            where: { id },
            relations: ['tasks', 'position', 'department'],
        });
        if (!template) throw new NotFoundException('Template not found');
        return template;
    }

    async updateTemplate(id: string, data: Partial<CreateTemplateDto>): Promise<OnboardingTemplate> {
        const template = await this.getTemplate(id);

        if (data.name) template.name = data.name;
        if (data.description !== undefined) template.description = data.description;
        if (data.isDefault !== undefined) template.is_default = data.isDefault;
        if (data.expectedDays !== undefined) template.expected_days = data.expectedDays;

        await this.templateRepo.save(template);
        return this.getTemplate(id);
    }

    async deleteTemplate(id: string): Promise<void> {
        await this.templateRepo.delete(id);
    }

    async addTaskToTemplate(templateId: string, taskData: CreateTaskDto): Promise<OnboardingTask> {
        const template = await this.getTemplate(templateId);
        const maxOrder = await this.taskRepo
            .createQueryBuilder('task')
            .where('task.template_id = :templateId', { templateId })
            .select('MAX(task.sort_order)', 'max')
            .getRawOne();

        const task = this.taskRepo.create({
            template,
            name: taskData.name,
            description: taskData.description,
            category: taskData.category || TaskCategory.OTHER,
            sort_order: taskData.sortOrder ?? (maxOrder?.max || 0) + 1,
            is_required: taskData.isRequired ?? true,
            responsible_party: taskData.responsibleParty || 'employee',
            due_days_from_start: taskData.dueDaysFromStart ?? 7,
            required_document_type_id: taskData.requiredDocumentTypeId,
            instructions: taskData.instructions,
            resource_url: taskData.resourceUrl,
        });

        return this.taskRepo.save(task);
    }

    async updateTask(taskId: string, data: Partial<CreateTaskDto>): Promise<OnboardingTask> {
        await this.taskRepo.update(taskId, {
            ...(data.name && { name: data.name }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.category && { category: data.category }),
            ...(data.sortOrder !== undefined && { sort_order: data.sortOrder }),
            ...(data.isRequired !== undefined && { is_required: data.isRequired }),
            ...(data.responsibleParty && { responsible_party: data.responsibleParty }),
            ...(data.dueDaysFromStart !== undefined && { due_days_from_start: data.dueDaysFromStart }),
            ...(data.instructions !== undefined && { instructions: data.instructions }),
            ...(data.resourceUrl !== undefined && { resource_url: data.resourceUrl }),
        });
        const task = await this.taskRepo.findOneBy({ id: taskId });
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.taskRepo.delete(taskId);
    }

    // ==================== TEMPLATE SELECTION ====================

    async findBestTemplate(positionId?: string, departmentId?: string): Promise<OnboardingTemplate | null> {
        // Try position-specific first
        if (positionId) {
            const posTemplate = await this.templateRepo.findOne({
                where: { position: { id: positionId }, is_active: true },
                relations: ['tasks'],
            });
            if (posTemplate) return posTemplate;
        }

        // Try department-specific
        if (departmentId) {
            const deptTemplate = await this.templateRepo.findOne({
                where: { department: { id: departmentId }, is_active: true },
                relations: ['tasks'],
            });
            if (deptTemplate) return deptTemplate;
        }

        // Fall back to default
        const defaultTemplate = await this.templateRepo.findOne({
            where: { is_default: true, is_active: true },
            relations: ['tasks'],
        });

        return defaultTemplate || null;
    }

    // ==================== INSTANCE MANAGEMENT ====================

    async createInstance(staffId: string, templateId?: string, createdBy?: string): Promise<OnboardingInstance> {
        const staff = await this.staffRepo.findOne({
            where: { id: staffId },
            relations: ['position', 'department'],
        });
        if (!staff) throw new NotFoundException('Staff not found');

        // Get template
        let template: OnboardingTemplate | null = null;
        if (templateId) {
            template = await this.getTemplate(templateId);
        } else {
            template = await this.findBestTemplate(staff.position?.id, staff.department?.id);
        }

        if (!template) {
            throw new NotFoundException('No onboarding template found');
        }

        const startDate = staff.hire_date || new Date();
        const expectedCompletionDate = new Date(startDate);
        expectedCompletionDate.setDate(expectedCompletionDate.getDate() + template.expected_days);

        const instance = this.instanceRepo.create({
            staff,
            template,
            status: OnboardingInstanceStatus.IN_PROGRESS,
            start_date: startDate,
            expected_completion_date: expectedCompletionDate,
            tasks_total: template.tasks?.length || 0,
            created_by: createdBy,
        });

        const savedInstance = await this.instanceRepo.save(instance);

        // Create task statuses for each task in template
        for (const task of template.tasks || []) {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + task.due_days_from_start);

            const taskStatus = this.taskStatusRepo.create({
                instance: savedInstance,
                task,
                status: TaskCompletionStatus.PENDING,
                due_date: dueDate,
            });
            await this.taskStatusRepo.save(taskStatus);
        }

        return this.getInstance(savedInstance.id);
    }

    async getInstance(id: string): Promise<OnboardingInstance> {
        const instance = await this.instanceRepo.findOne({
            where: { id },
            relations: ['staff', 'template', 'taskStatuses', 'taskStatuses.task', 'assignedMentor'],
        });
        if (!instance) throw new NotFoundException('Onboarding instance not found');
        return instance;
    }

    async getStaffInstance(staffId: string): Promise<OnboardingInstance | null> {
        return this.instanceRepo.findOne({
            where: { staff: { id: staffId } },
            relations: ['template', 'taskStatuses', 'taskStatuses.task'],
            order: { created_at: 'DESC' },
        });
    }

    async getInProgressInstances(): Promise<OnboardingInstance[]> {
        return this.instanceRepo.find({
            where: { status: OnboardingInstanceStatus.IN_PROGRESS },
            relations: ['staff', 'template', 'taskStatuses', 'taskStatuses.task'],
            order: { start_date: 'DESC' },
        });
    }

    async getOverdueInstances(): Promise<OnboardingInstance[]> {
        return this.instanceRepo.find({
            where: {
                status: OnboardingInstanceStatus.IN_PROGRESS,
                expected_completion_date: LessThanOrEqual(new Date()),
            },
            relations: ['staff', 'template'],
        });
    }

    // ==================== TASK COMPLETION ====================

    async completeTask(
        taskStatusId: string,
        completedById: string,
        notes?: string,
        documentId?: string,
    ): Promise<OnboardingTaskStatus> {
        const taskStatus = await this.taskStatusRepo.findOne({
            where: { id: taskStatusId },
            relations: ['instance'],
        });
        if (!taskStatus) throw new NotFoundException('Task status not found');

        const completedBy = await this.staffRepo.findOneBy({ id: completedById }) ?? undefined;

        taskStatus.status = TaskCompletionStatus.COMPLETED;
        taskStatus.completed_at = new Date();
        taskStatus.completedBy = completedBy;
        taskStatus.notes = notes;
        if (documentId) {
            taskStatus.document = { id: documentId } as any;
        }

        await this.taskStatusRepo.save(taskStatus);

        // Update instance progress
        await this.updateInstanceProgress(taskStatus.instance.id);

        return taskStatus;
    }

    async skipTask(
        taskStatusId: string,
        reason: string,
        approvedBy: string,
    ): Promise<OnboardingTaskStatus> {
        const taskStatus = await this.taskStatusRepo.findOne({
            where: { id: taskStatusId },
            relations: ['instance', 'task'],
        });
        if (!taskStatus) throw new NotFoundException('Task status not found');

        if (taskStatus.task.is_required) {
            throw new NotFoundException('Cannot skip required task');
        }

        taskStatus.status = TaskCompletionStatus.SKIPPED;
        taskStatus.skip_reason = reason;
        taskStatus.skip_approved_by = approvedBy;

        await this.taskStatusRepo.save(taskStatus);
        await this.updateInstanceProgress(taskStatus.instance.id);

        return taskStatus;
    }

    async updateInstanceProgress(instanceId: string): Promise<OnboardingInstance> {
        const instance = await this.getInstance(instanceId);

        const completedTasks = instance.taskStatuses.filter(ts =>
            ts.status === TaskCompletionStatus.COMPLETED ||
            ts.status === TaskCompletionStatus.SKIPPED ||
            ts.status === TaskCompletionStatus.NOT_APPLICABLE
        ).length;

        const totalTasks = instance.taskStatuses.length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        instance.tasks_completed = completedTasks;
        instance.tasks_total = totalTasks;
        instance.progress_percentage = percentage;

        // Check if all required tasks are complete
        const requiredTasksComplete = instance.taskStatuses
            .filter(ts => ts.task.is_required)
            .every(ts => ts.status === TaskCompletionStatus.COMPLETED);

        if (requiredTasksComplete && percentage === 100) {
            instance.status = OnboardingInstanceStatus.COMPLETED;
            instance.completed_date = new Date();
        }

        return this.instanceRepo.save(instance);
    }

    // ==================== ANALYTICS ====================

    async getOnboardingStats(): Promise<{
        total: number;
        inProgress: number;
        completed: number;
        overdue: number;
        averageCompletionDays: number;
    }> {
        const total = await this.instanceRepo.count();
        const inProgress = await this.instanceRepo.count({
            where: { status: OnboardingInstanceStatus.IN_PROGRESS }
        });
        const completed = await this.instanceRepo.count({
            where: { status: OnboardingInstanceStatus.COMPLETED }
        });
        const overdue = await this.instanceRepo.count({
            where: {
                status: OnboardingInstanceStatus.IN_PROGRESS,
                expected_completion_date: LessThanOrEqual(new Date()),
            },
        });

        // Calculate average completion time
        const completedInstances = await this.instanceRepo.find({
            where: {
                status: OnboardingInstanceStatus.COMPLETED,
                completed_date: Not(IsNull()),
            },
        });

        let averageCompletionDays = 0;
        if (completedInstances.length > 0) {
            const totalDays = completedInstances.reduce((sum, instance) => {
                const start = new Date(instance.start_date);
                const end = new Date(instance.completed_date);
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0);
            averageCompletionDays = Math.round(totalDays / completedInstances.length);
        }

        return {
            total,
            inProgress,
            completed,
            overdue,
            averageCompletionDays,
        };
    }
}
