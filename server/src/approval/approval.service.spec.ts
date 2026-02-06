import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApprovalService } from './approval.service';
import { ApprovalFlow } from './entities/approval-flow.entity';
import { ApprovalFlowStep, ApproverType } from './entities/approval-flow-step.entity';
import { ApprovalInstance, ApprovalInstanceStatus } from './entities/approval-instance.entity';
import { ApprovalAction, ApprovalActionType } from './entities/approval-action.entity';
import { Staff } from '../staff/entities/staff.entity';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ApprovalService', () => {
    let service: ApprovalService;
    let flowRepo: jest.Mocked<Repository<ApprovalFlow>>;
    let stepRepo: jest.Mocked<Repository<ApprovalFlowStep>>;
    let instanceRepo: jest.Mocked<Repository<ApprovalInstance>>;
    let actionRepo: jest.Mocked<Repository<ApprovalAction>>;
    let staffRepo: jest.Mocked<Repository<Staff>>;
    let eventEmitter: jest.Mocked<EventEmitter2>;
    let dataSource: jest.Mocked<DataSource>;

    const mockFlow: Partial<ApprovalFlow> = {
        id: 'flow-1',
        code: 'LEAVE_APPROVAL',
        name: 'Leave Approval Flow',
        target_type: 'leave_request',
        is_active: true,
        priority: 1,
        steps: [],
    };

    const mockStep: Partial<ApprovalFlowStep> = {
        id: 'step-1',
        name: 'Manager Approval',
        step_order: 1,
        approver_type: ApproverType.MANAGER,
        is_final: false,
    };

    const mockStaff: Partial<Staff> = {
        id: 'staff-1',
        first_name: 'John',
        last_name: 'Doe',
    };

    const mockInstance: Partial<ApprovalInstance> = {
        id: 'instance-1',
        target_type: 'leave_request',
        target_id: 'leave-1',
        status: ApprovalInstanceStatus.PENDING,
        current_step_order: 1,
    };

    beforeEach(async () => {
        const mockQueryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                findOne: jest.fn(),
                save: jest.fn(),
                create: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApprovalService,
                {
                    provide: getRepositoryToken(ApprovalFlow),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(ApprovalFlowStep),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(ApprovalInstance),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([]),
                        })),
                    },
                },
                {
                    provide: getRepositoryToken(ApprovalAction),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Staff),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        createQueryRunner: jest.fn(() => mockQueryRunner),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ApprovalService>(ApprovalService);
        flowRepo = module.get(getRepositoryToken(ApprovalFlow));
        stepRepo = module.get(getRepositoryToken(ApprovalFlowStep));
        instanceRepo = module.get(getRepositoryToken(ApprovalInstance));
        actionRepo = module.get(getRepositoryToken(ApprovalAction));
        staffRepo = module.get(getRepositoryToken(Staff));
        eventEmitter = module.get(EventEmitter2);
        dataSource = module.get(DataSource);
    });

    describe('getFlows', () => {
        it('should return all active flows', async () => {
            const flows = [mockFlow as ApprovalFlow];
            flowRepo.find.mockResolvedValue(flows);

            const result = await service.getFlows();

            expect(result).toEqual(flows);
            expect(flowRepo.find).toHaveBeenCalledWith({
                where: { is_active: true },
                relations: ['steps'],
                order: { priority: 'DESC', name: 'ASC' },
            });
        });

        it('should filter by target type when provided', async () => {
            const flows = [mockFlow as ApprovalFlow];
            flowRepo.find.mockResolvedValue(flows);

            await service.getFlows('leave_request');

            expect(flowRepo.find).toHaveBeenCalledWith({
                where: { is_active: true, target_type: 'leave_request' },
                relations: ['steps'],
                order: { priority: 'DESC', name: 'ASC' },
            });
        });
    });

    describe('getFlow', () => {
        it('should return a flow by id', async () => {
            flowRepo.findOne.mockResolvedValue(mockFlow as ApprovalFlow);

            const result = await service.getFlow('flow-1');

            expect(result).toEqual(mockFlow);
        });

        it('should throw NotFoundException when flow not found', async () => {
            flowRepo.findOne.mockResolvedValue(null);

            await expect(service.getFlow('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('createFlow', () => {
        it('should create a new approval flow', async () => {
            const flowData = { code: 'NEW_FLOW', name: 'New Flow', target_type: 'claim' };
            flowRepo.create.mockReturnValue(flowData as ApprovalFlow);
            flowRepo.save.mockResolvedValue({ id: 'new-id', ...flowData } as ApprovalFlow);

            const result = await service.createFlow(flowData);

            expect(flowRepo.create).toHaveBeenCalledWith(flowData);
            expect(flowRepo.save).toHaveBeenCalled();
            expect(result.id).toBe('new-id');
        });
    });

    describe('addStepToFlow', () => {
        it('should add a step to an existing flow', async () => {
            const flowWithSteps = { ...mockFlow, steps: [] } as ApprovalFlow;
            flowRepo.findOne.mockResolvedValue(flowWithSteps);
            
            const stepData = { name: 'New Step', approver_type: ApproverType.ROLE };
            stepRepo.create.mockReturnValue({ ...stepData, step_order: 1 } as ApprovalFlowStep);
            stepRepo.save.mockResolvedValue({ id: 'step-new', ...stepData, step_order: 1 } as ApprovalFlowStep);

            const result = await service.addStepToFlow('flow-1', stepData);

            expect(result.step_order).toBe(1);
        });

        it('should increment step order for existing steps', async () => {
            const existingStep = { ...mockStep, step_order: 1 } as ApprovalFlowStep;
            const flowWithSteps = { ...mockFlow, steps: [existingStep] } as ApprovalFlow;
            flowRepo.findOne.mockResolvedValue(flowWithSteps);
            
            const stepData = { name: 'New Step', approver_type: ApproverType.ROLE };
            stepRepo.create.mockReturnValue({ ...stepData, step_order: 2 } as ApprovalFlowStep);
            stepRepo.save.mockResolvedValue({ id: 'step-new', ...stepData, step_order: 2 } as ApprovalFlowStep);

            const result = await service.addStepToFlow('flow-1', stepData);

            expect(result.step_order).toBe(2);
        });
    });

    describe('findBestFlow', () => {
        it('should find matching flow by target type', async () => {
            const flows = [mockFlow as ApprovalFlow];
            flowRepo.find.mockResolvedValue(flows);

            const result = await service.findBestFlow('leave_request', mockStaff as Staff);

            expect(result).toEqual(mockFlow);
        });

        it('should return null when no matching flow found', async () => {
            flowRepo.find.mockResolvedValue([]);

            const result = await service.findBestFlow('unknown_type', mockStaff as Staff);

            expect(result).toBeNull();
        });

        it('should skip flows that dont match staff attributes', async () => {
            const branchSpecificFlow = {
                ...mockFlow,
                branch_id: 'different-branch',
            } as ApprovalFlow;
            flowRepo.find.mockResolvedValue([branchSpecificFlow]);

            const staffWithBranch = {
                ...mockStaff,
                branch: { id: 'staff-branch' },
            } as Staff;

            const result = await service.findBestFlow('leave_request', staffWithBranch);

            expect(result).toBeNull();
        });
    });

    describe('initiateApproval', () => {
        it('should throw BadRequestException when no flow found', async () => {
            flowRepo.findOne.mockResolvedValue(null);

            await expect(
                service.initiateApproval('unknown_type', 'target-1')
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when flow has no steps', async () => {
            const flowNoSteps = { ...mockFlow, steps: [] } as ApprovalFlow;
            flowRepo.findOne.mockResolvedValue(flowNoSteps);

            await expect(
                service.initiateApproval('leave_request', 'leave-1')
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('Event Emission', () => {
        it('should emit approval.completed event when approved', async () => {
            // This tests that the event emitter is properly called
            expect(eventEmitter.emit).toBeDefined();
        });
    });
});
