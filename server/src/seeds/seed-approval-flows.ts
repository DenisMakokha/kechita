import { DataSource } from 'typeorm';
import { ApprovalFlow } from '../approval/entities/approval-flow.entity';
import { ApprovalFlowStep, ApproverType } from '../approval/entities/approval-flow-step.entity';

interface FlowSeed {
    code: string;
    name: string;
    target_type: string;
    description: string;
    priority: number;
    steps: Array<{
        step_order: number;
        name: string;
        approver_type: ApproverType;
        approver_role_code?: string;
        is_final: boolean;
        can_skip: boolean;
        auto_approve_hours: number;
        escalation_role_code?: string;
        escalation_hours: number;
        instructions?: string;
    }>;
}

const DEFAULT_FLOWS: FlowSeed[] = [
    // ==================== LEAVE ====================
    {
        code: 'LEAVE_DEFAULT',
        name: 'Default Leave Approval',
        target_type: 'leave',
        description: 'Standard leave approval: Branch Manager → HR Manager',
        priority: 0,
        steps: [
            {
                step_order: 1,
                name: 'Branch Manager Review',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_role_code: 'REGIONAL_MANAGER',
                escalation_hours: 48,
                instructions: 'Review leave dates and check team availability before approving.',
            },
            {
                step_order: 2,
                name: 'HR Final Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                is_final: true,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
                instructions: 'Verify leave balance and policy compliance.',
            },
        ],
    },
    {
        code: 'LEAVE_MANAGER',
        name: 'Manager Leave Approval',
        target_type: 'leave',
        description: 'For branch managers and above: Regional Manager → HR Manager',
        priority: 10,
        steps: [
            {
                step_order: 1,
                name: 'Regional Manager Review',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'REGIONAL_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_role_code: 'CEO',
                escalation_hours: 48,
            },
            {
                step_order: 2,
                name: 'HR Final Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                is_final: true,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
        ],
    },

    // ==================== CLAIMS ====================
    {
        code: 'CLAIM_DEFAULT',
        name: 'Default Expense Claim Approval',
        target_type: 'claim',
        description: 'Standard claim approval: Branch Manager → Accountant',
        priority: 0,
        steps: [
            {
                step_order: 1,
                name: 'Manager Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_role_code: 'REGIONAL_MANAGER',
                escalation_hours: 72,
                instructions: 'Verify the expense is legitimate and within budget.',
            },
            {
                step_order: 2,
                name: 'Finance Processing',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'ACCOUNTANT',
                is_final: true,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
                instructions: 'Verify receipts and process for payment.',
            },
        ],
    },
    {
        code: 'CLAIM_HIGH_VALUE',
        name: 'High-Value Claim Approval',
        target_type: 'claim',
        description: 'For claims above threshold: BM → RM → Accountant → HR',
        priority: 20,
        steps: [
            {
                step_order: 1,
                name: 'Manager Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
            {
                step_order: 2,
                name: 'Regional Manager Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'REGIONAL_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
            {
                step_order: 3,
                name: 'Finance Verification',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'ACCOUNTANT',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
            {
                step_order: 4,
                name: 'HR Final Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                is_final: true,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
        ],
    },

    // ==================== STAFF LOANS ====================
    {
        code: 'STAFF_LOAN_DEFAULT',
        name: 'Staff Loan Approval',
        target_type: 'staff_loan',
        description: 'Standard staff loan: BM → HR Manager → Accountant → CEO',
        priority: 0,
        steps: [
            {
                step_order: 1,
                name: 'Manager Recommendation',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
                instructions: 'Review employee performance and loan justification.',
            },
            {
                step_order: 2,
                name: 'HR Review',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
                instructions: 'Verify eligibility, existing loans, and payroll capacity.',
            },
            {
                step_order: 3,
                name: 'Finance Verification',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'ACCOUNTANT',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
                instructions: 'Verify available funds and deduction schedule.',
            },
            {
                step_order: 4,
                name: 'CEO Final Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'CEO',
                is_final: true,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
        ],
    },
    {
        code: 'SALARY_ADVANCE_DEFAULT',
        name: 'Salary Advance Approval',
        target_type: 'staff_loan',
        description: 'Salary advance: BM → HR → Accountant',
        priority: 10,
        steps: [
            {
                step_order: 1,
                name: 'Manager Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
            {
                step_order: 2,
                name: 'HR Review',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
            {
                step_order: 3,
                name: 'Finance Processing',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'ACCOUNTANT',
                is_final: true,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
            },
        ],
    },

    // ==================== PETTY CASH ====================
    {
        code: 'PETTY_CASH_REPLENISHMENT_DEFAULT',
        name: 'Petty Cash Replenishment Approval',
        target_type: 'petty_cash_replenishment',
        description: 'Replenishment request: Regional Manager → Accountant',
        priority: 0,
        steps: [
            {
                step_order: 1,
                name: 'Regional Manager Approval',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'REGIONAL_MANAGER',
                is_final: false,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_role_code: 'CEO',
                escalation_hours: 48,
            },
            {
                step_order: 2,
                name: 'Finance Processing',
                approver_type: ApproverType.ROLE,
                approver_role_code: 'ACCOUNTANT',
                is_final: true,
                can_skip: false,
                auto_approve_hours: 0,
                escalation_hours: 0,
                instructions: 'Verify float balance and process disbursement.',
            },
        ],
    },
];

export async function seedApprovalFlows(dataSource: DataSource) {
    const flowRepo = dataSource.getRepository(ApprovalFlow);
    const stepRepo = dataSource.getRepository(ApprovalFlowStep);

    console.log('📋 Seeding approval flows...');

    let created = 0;
    for (const flowSeed of DEFAULT_FLOWS) {
        const existing = await flowRepo.findOne({ where: { code: flowSeed.code } });
        if (existing) {
            console.log(`   ✅ Flow exists: ${flowSeed.code}`);
            continue;
        }

        const flow = flowRepo.create({
            code: flowSeed.code,
            name: flowSeed.name,
            target_type: flowSeed.target_type,
            description: flowSeed.description,
            priority: flowSeed.priority,
            is_active: true,
        });
        const savedFlow = await flowRepo.save(flow);

        for (const stepSeed of flowSeed.steps) {
            const step = stepRepo.create({
                ...stepSeed,
                flow: savedFlow,
            });
            await stepRepo.save(step);
        }

        created++;
        console.log(`   ✅ Created flow: ${flowSeed.code} (${flowSeed.steps.length} steps)`);
    }

    console.log(`📋 Approval flows seeded: ${created} new, ${DEFAULT_FLOWS.length} total defined`);
}
