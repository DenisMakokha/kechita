import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApprovalFlow } from './entities/approval-flow.entity';
import { ApprovalFlowStep, ApproverType } from './entities/approval-flow-step.entity';
import { ApprovalInstance, ApprovalInstanceStatus } from './entities/approval-instance.entity';
import { ApprovalAction, ApprovalActionType } from './entities/approval-action.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Role } from '../auth/entities/role.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

export interface PendingApproval {
    instance: ApprovalInstance;
    targetType: string;
    targetId: string;
    stepName: string;
    requesterName: string;
    createdAt: Date;
    isUrgent: boolean;
}

export interface ApprovalStats {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    avgApprovalTimeHours: number;
}

// Event payloads for approval callbacks
export class ApprovalCompletedEvent {
    constructor(
        public readonly targetType: string,
        public readonly targetId: string,
        public readonly status: 'approved' | 'rejected',
        public readonly approverId: string,
        public readonly comment?: string,
    ) { }
}

@Injectable()
export class ApprovalService {
    private readonly logger = new Logger(ApprovalService.name);

    constructor(
        @InjectRepository(ApprovalFlow)
        private flowRepo: Repository<ApprovalFlow>,
        @InjectRepository(ApprovalFlowStep)
        private stepRepo: Repository<ApprovalFlowStep>,
        @InjectRepository(ApprovalInstance)
        private instanceRepo: Repository<ApprovalInstance>,
        @InjectRepository(ApprovalAction)
        private actionRepo: Repository<ApprovalAction>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        private dataSource: DataSource,
        private eventEmitter: EventEmitter2,
        private auditService: AuditService,
    ) { }

    // ==================== APPROVAL FLOWS ====================

    async getFlows(targetType?: string): Promise<ApprovalFlow[]> {
        const where: any = { is_active: true };
        if (targetType) where.target_type = targetType;
        return this.flowRepo.find({
            where,
            relations: ['steps'],
            order: { priority: 'DESC', name: 'ASC' },
        });
    }

    async getFlow(id: string): Promise<ApprovalFlow> {
        const flow = await this.flowRepo.findOne({
            where: { id },
            relations: ['steps'],
        });
        if (!flow) throw new NotFoundException('Approval flow not found');
        return flow;
    }

    async createFlow(data: Partial<ApprovalFlow>): Promise<ApprovalFlow> {
        const flow = this.flowRepo.create(data);
        return this.flowRepo.save(flow);
    }

    async updateFlow(id: string, data: Partial<ApprovalFlow>): Promise<ApprovalFlow> {
        await this.flowRepo.update(id, data);
        return this.getFlow(id);
    }

    async addStepToFlow(flowId: string, stepData: Partial<ApprovalFlowStep>): Promise<ApprovalFlowStep> {
        const flow = await this.getFlow(flowId);
        const maxOrder = flow.steps.length > 0
            ? Math.max(...flow.steps.map(s => s.step_order))
            : 0;

        const step = this.stepRepo.create({
            ...stepData,
            flow,
            step_order: stepData.step_order ?? maxOrder + 1,
        });
        return this.stepRepo.save(step);
    }

    async removeStep(stepId: string): Promise<void> {
        await this.stepRepo.delete(stepId);
    }

    // ==================== FIND BEST FLOW ====================

    async findBestFlow(targetType: string, staff: Staff): Promise<ApprovalFlow | null> {
        // Find flows ordered by priority (most specific first)
        const flows = await this.flowRepo.find({
            where: { target_type: targetType, is_active: true },
            relations: ['steps'],
            order: { priority: 'DESC' },
        });

        for (const flow of flows) {
            // Check if flow matches staff's attributes
            if (flow.branch_id && flow.branch_id !== staff.branch?.id) continue;
            if (flow.region_id && flow.region_id !== staff.region?.id) continue;
            if (flow.department_id && flow.department_id !== staff.department?.id) continue;
            if (flow.position_id && flow.position_id !== staff.position?.id) continue;
            return flow; // First matching flow
        }

        return null;
    }

    // ==================== APPROVAL WORKFLOW ====================

    async initiateApproval(
        targetType: string,
        targetId: string,
        flowCode?: string,
        requesterId?: string,
        isUrgent = false,
    ): Promise<ApprovalInstance> {
        let flow: ApprovalFlow | null = null;

        // 1. Try explicit flow code first
        if (flowCode) {
            flow = await this.flowRepo.findOne({
                where: { code: flowCode, is_active: true },
                relations: ['steps'],
            });
        }

        // 2. If no flow yet and we have a requester, use smart scoping (findBestFlow)
        if (!flow && requesterId) {
            const staff = await this.staffRepo.findOne({
                where: { id: requesterId },
                relations: ['branch', 'region', 'department', 'position'],
            });
            if (staff) {
                flow = await this.findBestFlow(targetType, staff);
            }
        }

        // 3. Fallback: find any active flow for this target type
        if (!flow) {
            flow = await this.flowRepo.findOne({
                where: { target_type: targetType, is_active: true },
                relations: ['steps'],
                order: { priority: 'DESC' },
            });
        }

        if (!flow) {
            throw new BadRequestException(`No active approval flow found for '${targetType}'`);
        }

        if (!flow.steps || flow.steps.length === 0) {
            throw new BadRequestException('Approval flow has no steps configured');
        }

        const sortedSteps = flow.steps.sort((a, b) => a.step_order - b.step_order);
        const firstStep = sortedSteps[0];

        const instance = this.instanceRepo.create({
            flow,
            target_type: targetType,
            target_id: targetId,
            status: ApprovalInstanceStatus.PENDING,
            current_step_order: firstStep.step_order,
            current_approver_role: firstStep.approver_role_code,
            is_urgent: isUrgent,
        });

        if (requesterId) {
            const requester = await this.staffRepo.findOne({ where: { id: requesterId } });
            if (requester) instance.requester = requester;
        }

        const saved = await this.instanceRepo.save(instance);

        // Notify first step approver
        this.eventEmitter.emit('approval.step.pending', {
            instanceId: saved.id,
            targetType: targetType,
            targetId: targetId,
            approverRoleCode: firstStep.approver_role_code,
            approverUserId: firstStep.specific_approver_id || undefined,
            stepName: firstStep.name,
        });

        return saved;
    }

    async approveStep(
        instanceId: string,
        approverId: string,
        comment?: string,
        ipAddress?: string,
    ): Promise<ApprovalInstance> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const instance = await queryRunner.manager.findOne(ApprovalInstance, {
                where: { id: instanceId },
                relations: ['flow', 'flow.steps', 'requester'],
            });

            if (!instance) throw new NotFoundException('Approval instance not found');
            if (instance.status !== ApprovalInstanceStatus.PENDING) {
                throw new BadRequestException('Approval already processed');
            }

            const approver = await queryRunner.manager.findOne(Staff, {
                where: { id: approverId },
                relations: ['user', 'user.roles'],
            });
            if (!approver) throw new NotFoundException('Approver not found');

            const sortedSteps = instance.flow.steps.sort((a, b) => a.step_order - b.step_order);
            const currentStep = sortedSteps.find((s) => s.step_order === instance.current_step_order);
            if (!currentStep) throw new BadRequestException('Invalid approval step');

            // Validate approver has permission for this step
            await this.validateApprover(currentStep, approver, instance);

            // Record the action
            const action = queryRunner.manager.create(ApprovalAction, {
                instance,
                step: currentStep,
                step_order: currentStep.step_order,
                approver,
                action: ApprovalActionType.APPROVED,
                comment,
                ip_address: ipAddress,
            });
            await queryRunner.manager.save(action);

            // Check if this is the final step
            let isFullyApproved = false;
            if (currentStep.is_final) {
                instance.status = ApprovalInstanceStatus.APPROVED;
                instance.resolvedBy = approver;
                instance.resolved_at = new Date();
                instance.final_comment = comment;
                isFullyApproved = true;
            } else {
                // Move to next step
                const nextStep = sortedSteps.find(s => s.step_order > currentStep.step_order);
                if (nextStep) {
                    instance.current_step_order = nextStep.step_order;
                    instance.current_approver_role = nextStep.approver_role_code;
                } else {
                    // No more steps, auto-approve
                    instance.status = ApprovalInstanceStatus.APPROVED;
                    instance.resolvedBy = approver;
                    instance.resolved_at = new Date();
                    isFullyApproved = true;
                }
            }

            const updatedInstance = await queryRunner.manager.save(instance);
            await queryRunner.commitTransaction();

            this.auditService.logAction(undefined, AuditAction.APPROVE, 'ApprovalInstance', instance.id, `Step approved for ${instance.target_type} ${instance.target_id}`, { targetType: instance.target_type, targetId: instance.target_id, approverId, stepOrder: instance.current_step_order }).catch(() => {});

            // Emit event if approval is fully completed
            if (isFullyApproved) {
                this.eventEmitter.emit(
                    'approval.completed',
                    new ApprovalCompletedEvent(
                        instance.target_type,
                        instance.target_id,
                        'approved',
                        approverId,
                        comment,
                    ),
                );
            } else {
                // Notify next step approver
                const nextStep = sortedSteps.find(s => s.step_order === instance.current_step_order);
                if (nextStep) {
                    this.eventEmitter.emit('approval.step.pending', {
                        instanceId: instance.id,
                        targetType: instance.target_type,
                        targetId: instance.target_id,
                        approverRoleCode: nextStep.approver_role_code,
                        approverUserId: nextStep.specific_approver_id || undefined,
                        stepName: nextStep.name,
                    });
                }
            }

            return updatedInstance;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async rejectStep(
        instanceId: string,
        approverId: string,
        comment: string,
        ipAddress?: string,
    ): Promise<ApprovalInstance> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const instance = await queryRunner.manager.findOne(ApprovalInstance, {
                where: { id: instanceId },
                relations: ['flow', 'flow.steps'],
            });

            if (!instance) throw new NotFoundException('Approval instance not found');
            if (instance.status !== ApprovalInstanceStatus.PENDING) {
                throw new BadRequestException('Approval already processed');
            }

            const approver = await queryRunner.manager.findOne(Staff, {
                where: { id: approverId },
                relations: ['user', 'user.roles'],
            });
            if (!approver) throw new NotFoundException('Approver not found');

            const currentStep = instance.flow.steps.find((s) => s.step_order === instance.current_step_order);
            if (!currentStep) throw new BadRequestException('Invalid approval step');

            // Validate approver
            await this.validateApprover(currentStep, approver, instance);

            const action = queryRunner.manager.create(ApprovalAction, {
                instance,
                step: currentStep,
                step_order: currentStep.step_order,
                approver,
                action: ApprovalActionType.REJECTED,
                comment,
                ip_address: ipAddress,
            });
            await queryRunner.manager.save(action);

            instance.status = ApprovalInstanceStatus.REJECTED;
            instance.resolvedBy = approver;
            instance.resolved_at = new Date();
            instance.final_comment = comment;

            const updatedInstance = await queryRunner.manager.save(instance);
            await queryRunner.commitTransaction();

            this.auditService.logAction(undefined, AuditAction.REJECT, 'ApprovalInstance', instance.id, `Rejected ${instance.target_type} ${instance.target_id}: ${comment}`, { targetType: instance.target_type, targetId: instance.target_id, approverId }).catch(() => {});

            // Emit rejection event
            this.eventEmitter.emit(
                'approval.completed',
                new ApprovalCompletedEvent(
                    instance.target_type,
                    instance.target_id,
                    'rejected',
                    approverId,
                    comment,
                ),
            );

            return updatedInstance;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async cancelApproval(instanceId: string, reason?: string): Promise<ApprovalInstance> {
        const instance = await this.instanceRepo.findOneBy({ id: instanceId });
        if (!instance) throw new NotFoundException('Approval instance not found');

        instance.status = ApprovalInstanceStatus.CANCELLED;
        instance.final_comment = reason;
        instance.resolved_at = new Date();

        return this.instanceRepo.save(instance);
    }

    // ==================== QUERIES ====================

    async getInstanceByTarget(targetType: string, targetId: string): Promise<ApprovalInstance | null> {
        return this.instanceRepo.findOne({
            where: { target_type: targetType, target_id: targetId },
            relations: ['flow', 'flow.steps', 'actions', 'actions.approver', 'actions.step', 'requester'],
            order: { created_at: 'DESC' },
        });
    }

    async getInstance(id: string): Promise<ApprovalInstance> {
        const instance = await this.instanceRepo.findOne({
            where: { id },
            relations: ['flow', 'flow.steps', 'actions', 'actions.approver', 'actions.step', 'requester', 'resolvedBy'],
        });
        if (!instance) throw new NotFoundException('Approval instance not found');
        return instance;
    }

    async getPendingApprovalsForStaff(staffId: string): Promise<PendingApproval[]> {
        const staff = await this.staffRepo.findOne({
            where: { id: staffId },
            relations: ['user', 'user.roles', 'branch', 'region', 'department'],
        });
        if (!staff) throw new NotFoundException('Staff not found');

        const roleCodes = staff.user?.roles?.map(r => r.code) || [];

        // Find instances where current step matches staff's roles
        const instances = await this.instanceRepo
            .createQueryBuilder('instance')
            .leftJoinAndSelect('instance.flow', 'flow')
            .leftJoinAndSelect('flow.steps', 'step')
            .leftJoinAndSelect('instance.requester', 'requester')
            .where('instance.status = :status', { status: ApprovalInstanceStatus.PENDING })
            .andWhere('step.step_order = instance.current_step_order')
            .andWhere('step.approver_role_code IN (:...roles)', { roles: roleCodes.length > 0 ? roleCodes : ['NONE'] })
            .orderBy('instance.is_urgent', 'DESC')
            .addOrderBy('instance.created_at', 'ASC')
            .getMany();

        return instances.map(inst => {
            const currentStep = inst.flow.steps.find(s => s.step_order === inst.current_step_order);
            return {
                instance: inst,
                targetType: inst.target_type,
                targetId: inst.target_id,
                stepName: currentStep?.name || `Step ${inst.current_step_order}`,
                requesterName: inst.requester?.full_name || 'Unknown',
                createdAt: inst.created_at,
                isUrgent: inst.is_urgent,
            };
        });
    }

    async getPendingApprovalsForRole(roleCode: string): Promise<ApprovalInstance[]> {
        return this.instanceRepo
            .createQueryBuilder('instance')
            .leftJoinAndSelect('instance.flow', 'flow')
            .leftJoinAndSelect('flow.steps', 'step')
            .leftJoinAndSelect('instance.requester', 'requester')
            .where('instance.status = :status', { status: ApprovalInstanceStatus.PENDING })
            .andWhere('step.step_order = instance.current_step_order')
            .andWhere('step.approver_role_code = :roleCode', { roleCode })
            .orderBy('instance.created_at', 'ASC')
            .getMany();
    }

    async getMySubmittedApprovals(requesterId: string): Promise<ApprovalInstance[]> {
        return this.instanceRepo.find({
            where: { requester: { id: requesterId } },
            relations: ['flow', 'flow.steps', 'actions', 'actions.approver'],
            order: { created_at: 'DESC' },
        });
    }

    async getApprovalHistory(instanceId: string): Promise<ApprovalAction[]> {
        return this.actionRepo.find({
            where: { instance: { id: instanceId } },
            relations: ['approver', 'step', 'delegatedTo'],
            order: { acted_at: 'ASC' },
        });
    }

    async getApprovalStats(staffId?: string): Promise<ApprovalStats> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pendingQuery = this.instanceRepo.createQueryBuilder('instance')
            .where('instance.status = :status', { status: ApprovalInstanceStatus.PENDING });

        const approvedTodayQuery = this.actionRepo.createQueryBuilder('action')
            .where('action.action = :action', { action: ApprovalActionType.APPROVED })
            .andWhere('action.acted_at >= :today', { today });

        const rejectedTodayQuery = this.actionRepo.createQueryBuilder('action')
            .where('action.action = :action', { action: ApprovalActionType.REJECTED })
            .andWhere('action.acted_at >= :today', { today });

        if (staffId) {
            approvedTodayQuery.andWhere('action.approver_staff_id = :staffId', { staffId });
            rejectedTodayQuery.andWhere('action.approver_staff_id = :staffId', { staffId });
        }

        const [pending, approvedToday, rejectedToday] = await Promise.all([
            pendingQuery.getCount(),
            approvedTodayQuery.getCount(),
            rejectedTodayQuery.getCount(),
        ]);

        // Calculate average approval time (simplified)
        const avgTimeResult = await this.instanceRepo
            .createQueryBuilder('instance')
            .select('AVG(EXTRACT(EPOCH FROM (instance.resolved_at - instance.created_at)) / 3600)', 'avgHours')
            .where('instance.status = :status', { status: ApprovalInstanceStatus.APPROVED })
            .andWhere('instance.resolved_at IS NOT NULL')
            .getRawOne();

        return {
            pending,
            approvedToday,
            rejectedToday,
            avgApprovalTimeHours: Math.round(avgTimeResult?.avgHours || 0),
        };
    }

    // ==================== ACTIVATE/DEACTIVATE FLOW ====================

    async activateFlow(id: string): Promise<ApprovalFlow> {
        const flow = await this.getFlow(id);
        flow.is_active = true;
        return this.flowRepo.save(flow);
    }

    async deactivateFlow(id: string): Promise<ApprovalFlow> {
        const flow = await this.getFlow(id);
        flow.is_active = false;
        return this.flowRepo.save(flow);
    }

    // ==================== UPDATE/REORDER STEPS ====================

    async updateStep(stepId: string, data: Partial<ApprovalFlowStep>): Promise<ApprovalFlowStep> {
        const step = await this.stepRepo.findOne({ where: { id: stepId } });
        if (!step) throw new NotFoundException('Approval step not found');
        
        Object.assign(step, data);
        return this.stepRepo.save(step);
    }

    async reorderSteps(flowId: string, stepOrders: { stepId: string; order: number }[]): Promise<ApprovalFlow> {
        const flow = await this.getFlow(flowId);
        
        for (const { stepId, order } of stepOrders) {
            await this.stepRepo.update(stepId, { step_order: order });
        }

        return this.getFlow(flowId);
    }

    // ==================== DELEGATE APPROVAL ====================

    async delegateApproval(
        instanceId: string,
        delegatorStaffId: string,
        delegateToStaffId: string,
        reason: string,
        ipAddress?: string,
    ): Promise<ApprovalInstance> {
        const instance = await this.instanceRepo.findOne({
            where: { id: instanceId },
            relations: ['flow', 'flow.steps', 'requester', 'currentApprover'],
        });

        if (!instance) throw new NotFoundException('Approval instance not found');
        if (instance.status !== ApprovalInstanceStatus.PENDING) {
            throw new BadRequestException('Only pending approvals can be delegated');
        }

        const delegator = await this.staffRepo.findOne({
            where: { id: delegatorStaffId },
            relations: ['user', 'user.roles'],
        });
        if (!delegator) throw new NotFoundException('Delegator not found');

        const delegateTo = await this.staffRepo.findOne({
            where: { id: delegateToStaffId },
            relations: ['user', 'user.roles'],
        });
        if (!delegateTo) throw new NotFoundException('Delegate target not found');

        // Record delegation action
        const action = this.actionRepo.create({
            instance,
            step_order: instance.current_step_order,
            approver: delegator,
            action: ApprovalActionType.DELEGATED,
            comment: reason,
            delegatedTo: delegateTo,
            delegation_reason: reason,
            ip_address: ipAddress,
        });
        await this.actionRepo.save(action);

        // Update current approver
        instance.currentApprover = delegateTo;
        return this.instanceRepo.save(instance);
    }

    // ==================== RETURN FOR MORE INFO ====================

    async returnForMoreInfo(
        instanceId: string,
        approverStaffId: string,
        comment: string,
        ipAddress?: string,
    ): Promise<ApprovalInstance> {
        const instance = await this.instanceRepo.findOne({
            where: { id: instanceId },
            relations: ['flow', 'flow.steps', 'requester'],
        });

        if (!instance) throw new NotFoundException('Approval instance not found');
        if (instance.status !== ApprovalInstanceStatus.PENDING) {
            throw new BadRequestException('Only pending approvals can be returned');
        }

        const approver = await this.staffRepo.findOne({
            where: { id: approverStaffId },
            relations: ['user', 'user.roles'],
        });
        if (!approver) throw new NotFoundException('Approver not found');

        // Record return action
        const action = this.actionRepo.create({
            instance,
            step_order: instance.current_step_order,
            approver,
            action: ApprovalActionType.RETURNED,
            comment,
            ip_address: ipAddress,
        });
        await this.actionRepo.save(action);

        // Emit event for the target module to handle
        this.eventEmitter.emit('approval.returned', {
            targetType: instance.target_type,
            targetId: instance.target_id,
            comment,
            returnedById: approverStaffId,
        });

        return instance;
    }

    // ==================== DELETE FLOW ====================

    async deleteFlow(id: string): Promise<{ message: string }> {
        const flow = await this.flowRepo.findOne({
            where: { id },
            relations: ['steps'],
        });
        if (!flow) throw new NotFoundException('Approval flow not found');

        // Check if flow has active instances
        const activeInstances = await this.instanceRepo.count({
            where: { flow: { id }, status: ApprovalInstanceStatus.PENDING },
        });

        if (activeInstances > 0) {
            throw new BadRequestException(
                `Cannot delete flow with ${activeInstances} active approval(s). Deactivate it instead.`
            );
        }

        await this.flowRepo.remove(flow);
        return { message: 'Approval flow deleted successfully' };
    }

    // ==================== HELPERS ====================

    private async validateApprover(
        step: ApprovalFlowStep,
        approver: Staff,
        instance: ApprovalInstance,
    ): Promise<void> {
        const approverRoles = approver.user?.roles?.map(r => r.code) || [];

        switch (step.approver_type) {
            case ApproverType.ROLE:
                if (!step.approver_role_code || !approverRoles.includes(step.approver_role_code)) {
                    throw new ForbiddenException('You are not authorized to approve this request');
                }
                break;

            case ApproverType.MANAGER:
                if (!instance.requester?.manager || instance.requester.manager.id !== approver.id) {
                    throw new ForbiddenException('Only the direct manager can approve this request');
                }
                break;

            case ApproverType.SPECIFIC_USER:
                if (step.specific_approver_id !== approver.id) {
                    throw new ForbiddenException('Only the designated approver can process this request');
                }
                break;

            // For other types, check if role matches
            default:
                if (step.approver_role_code && !approverRoles.includes(step.approver_role_code)) {
                    throw new ForbiddenException('You are not authorized to approve this request');
                }
        }
    }

    // ==================== SCHEDULED: AUTO-APPROVE & ESCALATION ====================

    @Cron(CronExpression.EVERY_30_MINUTES)
    async processAutoApprovalsAndEscalations() {
        const pendingInstances = await this.instanceRepo.find({
            where: { status: ApprovalInstanceStatus.PENDING },
            relations: ['flow', 'flow.steps', 'actions'],
        });

        for (const instance of pendingInstances) {
            try {
                const sortedSteps = (instance.flow?.steps || []).sort((a, b) => a.step_order - b.step_order);
                const currentStep = sortedSteps.find(s => s.step_order === instance.current_step_order);
                if (!currentStep) continue;

                // Determine how long this step has been pending
                const lastAction = (instance.actions || [])
                    .filter(a => a.step_order === currentStep.step_order - 1 || a.step_order === 0)
                    .sort((a, b) => new Date(b.acted_at).getTime() - new Date(a.acted_at).getTime())[0];
                const stepStartTime = lastAction ? new Date(lastAction.acted_at) : new Date(instance.created_at);
                const hoursPending = (Date.now() - stepStartTime.getTime()) / (1000 * 60 * 60);

                // Auto-approve if configured
                if (currentStep.auto_approve_hours > 0 && hoursPending >= currentStep.auto_approve_hours) {
                    this.logger.log(`Auto-approving instance ${instance.id} at step ${currentStep.step_order} (${hoursPending.toFixed(1)}h elapsed)`);

                    const action = this.actionRepo.create({
                        instance,
                        step: currentStep,
                        step_order: currentStep.step_order,
                        action: ApprovalActionType.AUTO_APPROVED,
                        comment: `Auto-approved after ${currentStep.auto_approve_hours} hours without action`,
                    });
                    await this.actionRepo.save(action);

                    if (currentStep.is_final) {
                        instance.status = ApprovalInstanceStatus.APPROVED;
                        instance.resolved_at = new Date();
                        instance.final_comment = `Auto-approved at step ${currentStep.step_order}`;
                        await this.instanceRepo.save(instance);
                        this.eventEmitter.emit('approval.completed', new ApprovalCompletedEvent(
                            instance.target_type, instance.target_id, 'approved', 'system',
                            `Auto-approved after ${currentStep.auto_approve_hours}h timeout`,
                        ));
                    } else {
                        const nextStep = sortedSteps.find(s => s.step_order > currentStep.step_order);
                        if (nextStep) {
                            instance.current_step_order = nextStep.step_order;
                            instance.current_approver_role = nextStep.approver_role_code;
                        } else {
                            instance.status = ApprovalInstanceStatus.APPROVED;
                            instance.resolved_at = new Date();
                            this.eventEmitter.emit('approval.completed', new ApprovalCompletedEvent(
                                instance.target_type, instance.target_id, 'approved', 'system',
                            ));
                        }
                        await this.instanceRepo.save(instance);
                    }
                    continue;
                }

                // Escalation if configured
                if (currentStep.escalation_hours > 0 && currentStep.escalation_role_code && hoursPending >= currentStep.escalation_hours) {
                    // Check if already escalated for this step
                    const alreadyEscalated = (instance.actions || []).some(
                        a => a.step_order === currentStep.step_order && a.action === ApprovalActionType.ESCALATED,
                    );
                    if (alreadyEscalated) continue;

                    this.logger.log(`Escalating instance ${instance.id} at step ${currentStep.step_order} to ${currentStep.escalation_role_code}`);

                    const action = this.actionRepo.create({
                        instance,
                        step: currentStep,
                        step_order: currentStep.step_order,
                        action: ApprovalActionType.ESCALATED,
                        comment: `Escalated to ${currentStep.escalation_role_code} after ${currentStep.escalation_hours} hours without action`,
                    });
                    await this.actionRepo.save(action);

                    // Update current approver role to escalation target
                    instance.current_approver_role = currentStep.escalation_role_code;
                    await this.instanceRepo.save(instance);

                    this.eventEmitter.emit('approval.escalated', {
                        instanceId: instance.id,
                        targetType: instance.target_type,
                        targetId: instance.target_id,
                        escalatedToRole: currentStep.escalation_role_code,
                        hoursPending: Math.round(hoursPending),
                    });
                }
            } catch (err) {
                this.logger.error(`Error processing auto-approve/escalation for instance ${instance.id}: ${err.message}`);
            }
        }
    }
}
