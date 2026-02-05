import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { LeaveType } from '../leave/entities/leave-type.entity';
import { PublicHoliday } from '../leave/entities/public-holiday.entity';
import { ApprovalFlow } from '../approval/entities/approval-flow.entity';
import { ApprovalFlowStep, ApproverType } from '../approval/entities/approval-flow-step.entity';
import { assertSeedingEnabled } from './seed-utils';

dotenv.config();

assertSeedingEnabled('seed-leave-approval');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [LeaveType, PublicHoliday, ApprovalFlow, ApprovalFlowStep],
    synchronize: true,
});

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for leave approval seeding...');

    try {
        const leaveTypeRepo = AppDataSource.getRepository(LeaveType);
        const holidayRepo = AppDataSource.getRepository(PublicHoliday);
        const flowRepo = AppDataSource.getRepository(ApprovalFlow);
        const stepRepo = AppDataSource.getRepository(ApprovalFlowStep);

        // ==================== LEAVE TYPES ====================
        console.log('Seeding leave types...');

        const leaveTypes = [
            {
                code: 'ANNUAL',
                name: 'Annual Leave',
                description: 'Regular annual leave for all confirmed staff',
                max_days_per_year: 21,
                is_accrued: true,
                monthly_accrual_rate: 1.75,
                allow_carry_forward: true,
                max_carry_forward_days: 5,
                carry_forward_expiry_months: 3,
                requires_confirmation: true,
                min_days_before_request: 7,
                color: '#4F46E5',
                sort_order: 1,
            },
            {
                code: 'SICK',
                name: 'Sick Leave',
                description: 'Leave for illness or medical appointments',
                max_days_per_year: 14,
                is_emergency: true,
                requires_attachment: true,
                allow_negative: true,
                color: '#EF4444',
                sort_order: 2,
            },
            {
                code: 'MATERNITY',
                name: 'Maternity Leave',
                description: 'Leave for mothers around childbirth',
                max_days_per_year: 90,
                applicable_gender: 'female',
                requires_confirmation: true,
                requires_attachment: true,
                min_days_before_request: 30,
                color: '#EC4899',
                sort_order: 3,
            },
            {
                code: 'PATERNITY',
                name: 'Paternity Leave',
                description: 'Leave for fathers around childbirth',
                max_days_per_year: 14,
                applicable_gender: 'male',
                requires_confirmation: true,
                requires_attachment: true,
                color: '#8B5CF6',
                sort_order: 4,
            },
            {
                code: 'COMPASSIONATE',
                name: 'Compassionate Leave',
                description: 'Leave for bereavement or family emergencies',
                max_days_per_year: 5,
                is_emergency: true,
                allow_negative: true,
                color: '#6B7280',
                sort_order: 5,
            },
            {
                code: 'STUDY',
                name: 'Study Leave',
                description: 'Leave for examinations or study',
                max_days_per_year: 10,
                requires_confirmation: true,
                requires_attachment: true,
                min_days_before_request: 14,
                color: '#10B981',
                sort_order: 6,
            },
            {
                code: 'UNPAID',
                name: 'Unpaid Leave',
                description: 'Leave without pay for personal reasons',
                max_days_per_year: 30,
                allow_negative: true,
                min_days_before_request: 7,
                color: '#F59E0B',
                sort_order: 7,
            },
        ];

        for (const lt of leaveTypes) {
            const existing = await leaveTypeRepo.findOneBy({ code: lt.code });
            if (!existing) {
                await leaveTypeRepo.save(leaveTypeRepo.create(lt));
                console.log(`  Created leave type: ${lt.name}`);
            }
        }

        // ==================== PUBLIC HOLIDAYS 2025 ====================
        console.log('\nSeeding public holidays for 2025...');

        const holidays2025 = [
            { name: "New Year's Day", date: '2025-01-01', is_recurring: true },
            { name: 'Good Friday', date: '2025-04-18', is_recurring: false },
            { name: 'Easter Monday', date: '2025-04-21', is_recurring: false },
            { name: 'Labour Day', date: '2025-05-01', is_recurring: true },
            { name: 'Madaraka Day', date: '2025-06-01', is_recurring: true },
            { name: 'Eid ul-Fitr', date: '2025-03-31', is_recurring: false },
            { name: 'Eid ul-Adha', date: '2025-06-07', is_recurring: false },
            { name: 'Utamaduni Day', date: '2025-10-10', is_recurring: true },
            { name: 'Mashujaa Day', date: '2025-10-20', is_recurring: true },
            { name: 'Jamhuri Day', date: '2025-12-12', is_recurring: true },
            { name: 'Christmas Day', date: '2025-12-25', is_recurring: true },
            { name: 'Boxing Day', date: '2025-12-26', is_recurring: true },
        ];

        for (const h of holidays2025) {
            const existing = await holidayRepo.findOneBy({
                name: h.name,
                year: 2025
            });
            if (!existing) {
                await holidayRepo.save(holidayRepo.create({
                    ...h,
                    year: 2025,
                    date: new Date(h.date),
                }));
                console.log(`  Created holiday: ${h.name}`);
            }
        }

        // ==================== APPROVAL FLOWS ====================
        console.log('\nSeeding approval flows...');

        // Leave Default Flow: Manager -> HR
        let leaveFlow = await flowRepo.findOne({
            where: { code: 'LEAVE_DEFAULT' },
            relations: ['steps'],
        });

        if (!leaveFlow) {
            leaveFlow = flowRepo.create({
                code: 'LEAVE_DEFAULT',
                name: 'Default Leave Approval',
                description: 'Standard leave approval flow: Direct Manager → HR Manager',
                target_type: 'leave',
                priority: 0,
            });
            await flowRepo.save(leaveFlow);
            console.log('  Created LEAVE_DEFAULT flow');

            // Step 1: Direct Manager
            await stepRepo.save(stepRepo.create({
                flow: leaveFlow,
                name: 'Manager Approval',
                step_order: 1,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                instructions: 'Review leave request and check team coverage',
                escalation_hours: 48,
                escalation_role_code: 'REGIONAL_MANAGER',
            }));

            // Step 2: HR Review
            await stepRepo.save(stepRepo.create({
                flow: leaveFlow,
                name: 'HR Approval',
                step_order: 2,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                is_final: true,
                instructions: 'Verify leave balance and approve',
            }));

            console.log('  Created 2 steps for LEAVE_DEFAULT');
        }

        // Leave Executive Flow (for managers): RM -> HR -> CEO
        let leaveExecFlow = await flowRepo.findOne({
            where: { code: 'LEAVE_EXECUTIVE' },
            relations: ['steps'],
        });

        if (!leaveExecFlow) {
            leaveExecFlow = flowRepo.create({
                code: 'LEAVE_EXECUTIVE',
                name: 'Executive Leave Approval',
                description: 'Leave approval for managers: Regional Manager → HR → CEO',
                target_type: 'leave',
                priority: 10,
            });
            await flowRepo.save(leaveExecFlow);
            console.log('  Created LEAVE_EXECUTIVE flow');

            await stepRepo.save(stepRepo.create({
                flow: leaveExecFlow,
                name: 'Regional Manager Approval',
                step_order: 1,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'REGIONAL_MANAGER',
            }));

            await stepRepo.save(stepRepo.create({
                flow: leaveExecFlow,
                name: 'HR Review',
                step_order: 2,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
            }));

            await stepRepo.save(stepRepo.create({
                flow: leaveExecFlow,
                name: 'CEO Approval',
                step_order: 3,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'CEO',
                is_final: true,
            }));

            console.log('  Created 3 steps for LEAVE_EXECUTIVE');
        }

        // Claims Flow: Manager -> Finance -> HR
        let claimFlow = await flowRepo.findOne({
            where: { code: 'CLAIM_DEFAULT' },
            relations: ['steps'],
        });

        if (!claimFlow) {
            claimFlow = flowRepo.create({
                code: 'CLAIM_DEFAULT',
                name: 'Default Claim Approval',
                description: 'Standard claim approval: Manager → Finance → HR',
                target_type: 'claim',
                priority: 0,
            });
            await flowRepo.save(claimFlow);
            console.log('  Created CLAIM_DEFAULT flow');

            await stepRepo.save(stepRepo.create({
                flow: claimFlow,
                name: 'Manager Approval',
                step_order: 1,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                instructions: 'Verify claim is work-related and amounts are reasonable',
            }));

            await stepRepo.save(stepRepo.create({
                flow: claimFlow,
                name: 'Finance Review',
                step_order: 2,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'FINANCE_OFFICER',
                instructions: 'Verify receipts and approve for payment',
            }));

            await stepRepo.save(stepRepo.create({
                flow: claimFlow,
                name: 'HR Final Approval',
                step_order: 3,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                is_final: true,
            }));

            console.log('  Created 3 steps for CLAIM_DEFAULT');
        }

        // Staff Loan Flow: Manager -> HR -> CEO
        let loanFlow = await flowRepo.findOne({
            where: { code: 'LOAN_DEFAULT' },
            relations: ['steps'],
        });

        if (!loanFlow) {
            loanFlow = flowRepo.create({
                code: 'LOAN_DEFAULT',
                name: 'Staff Loan Approval',
                description: 'Staff loan approval: Manager → HR → CEO',
                target_type: 'staff_loan',
                priority: 0,
            });
            await flowRepo.save(loanFlow);
            console.log('  Created LOAN_DEFAULT flow');

            await stepRepo.save(stepRepo.create({
                flow: loanFlow,
                name: 'Manager Recommendation',
                step_order: 1,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'BRANCH_MANAGER',
                instructions: 'Recommend based on staff performance and tenure',
            }));

            await stepRepo.save(stepRepo.create({
                flow: loanFlow,
                name: 'HR Review',
                step_order: 2,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'HR_MANAGER',
                instructions: 'Review eligibility and existing loans',
            }));

            await stepRepo.save(stepRepo.create({
                flow: loanFlow,
                name: 'CEO Approval',
                step_order: 3,
                approver_type: ApproverType.ROLE,
                approver_role_code: 'CEO',
                is_final: true,
                instructions: 'Final approval for loan disbursement',
            }));

            console.log('  Created 3 steps for LOAN_DEFAULT');
        }

        console.log('\nLeave & Approval seeding complete!');

    } catch (err) {
        console.error('Error seeding leave approval data:', err);
    } finally {
        await AppDataSource.destroy();
    }
}

seed();
