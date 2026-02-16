import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { Permission } from '../auth/entities/permission.entity';
import { LeaveType } from '../leave/entities/leave-type.entity';
import { ClaimType } from '../claims/entities/claim-type.entity';
import { seedPermissions } from './seed-permissions';
import { seedApprovalFlows } from './seed-approval-flows';
import { ApprovalFlow } from '../approval/entities/approval-flow.entity';
import { ApprovalFlowStep } from '../approval/entities/approval-flow-step.entity';
import { SystemSetting } from '../auth/entities/system-setting.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { Position } from '../org/entities/position.entity';
import { Document } from '../staff/entities/document.entity';
import { DocumentType } from '../staff/entities/document-type.entity';
import { StaffDocument } from '../staff/entities/staff-document.entity';
import { EmploymentHistory } from '../staff/entities/employment-history.entity';
import { OnboardingTemplate } from '../staff/entities/onboarding-template.entity';
import { OnboardingTask } from '../staff/entities/onboarding-task.entity';
import { OnboardingInstance } from '../staff/entities/onboarding-instance.entity';
import { OnboardingTaskStatus } from '../staff/entities/onboarding-task-status.entity';
import { StaffContract } from '../staff/entities/staff-contract.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [
        Role, User, Permission, LeaveType, ClaimType, ApprovalFlow, ApprovalFlowStep, SystemSetting,
        Staff, Region, Branch, Department, Position, Document, DocumentType, StaffDocument,
        EmploymentHistory, OnboardingTemplate, OnboardingTask, OnboardingInstance, OnboardingTaskStatus, StaffContract,
    ],
    synchronize: false,
});

const ROLES = [
    { code: 'CEO', name: 'Chief Executive Officer' },
    { code: 'HR_MANAGER', name: 'HR Manager' },
    { code: 'REGIONAL_ADMIN', name: 'Regional Admin' },
    { code: 'HR_ASSISTANT', name: 'HR Assistant' },
    { code: 'REGIONAL_MANAGER', name: 'Regional Manager' },
    { code: 'BRANCH_MANAGER', name: 'Branch Manager' },
    { code: 'RELATIONSHIP_OFFICER', name: 'Relationship Officer' },
    { code: 'BDM', name: 'Business Development Manager' },
    { code: 'ACCOUNTANT', name: 'Accountant' },
    { code: 'STAFF', name: 'Staff' },
];

const LEAVE_TYPES = [
    { code: 'ANNUAL', name: 'Annual Leave', max_days_per_year: 21, color: '#0066B3' },
    { code: 'SICK', name: 'Sick Leave', max_days_per_year: 14, requires_attachment: true, color: '#DC2626' },
    { code: 'MATERNITY', name: 'Maternity Leave', max_days_per_year: 90, color: '#EC4899' },
    { code: 'PATERNITY', name: 'Paternity Leave', max_days_per_year: 14, color: '#8B5CF6' },
    { code: 'COMPASSIONATE', name: 'Compassionate Leave', max_days_per_year: 5, is_emergency: true, color: '#6B7280' },
    { code: 'STUDY', name: 'Study Leave', max_days_per_year: 10, color: '#F59E0B' },
    { code: 'UNPAID', name: 'Unpaid Leave', max_days_per_year: 30, color: '#94A3B8' },
];

const CLAIM_TYPES = [
    { code: 'TRANSPORT', name: 'Transport Allowance' },
    { code: 'MEALS', name: 'Meals & Accommodation' },
    { code: 'OFFICE', name: 'Office Supplies' },
    { code: 'COMMUNICATION', name: 'Communication' },
    { code: 'TRAINING', name: 'Training & Development' },
    { code: 'MEDICAL', name: 'Medical Reimbursement' },
    { code: 'OTHER', name: 'Other' },
];

async function seedProductionDefaults() {
    await AppDataSource.initialize();
    console.log('Connected to database for production seeding...');

    // Seed Roles
    const roleRepo = AppDataSource.getRepository(Role);
    const createdRoles: Role[] = [];
    for (const roleData of ROLES) {
        let role = await roleRepo.findOneBy({ code: roleData.code });
        if (!role) {
            role = roleRepo.create(roleData);
            await roleRepo.save(role);
            console.log(`  Created role: ${roleData.code}`);
        } else {
            console.log(`  Role exists: ${roleData.code}`);
        }
        createdRoles.push(role);
    }

    // Seed default admin user
    const userRepo = AppDataSource.getRepository(User);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@kechita.com';
    let adminUser = await userRepo.findOneBy({ email: adminEmail });
    if (!adminUser) {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123!', 10);
        const ceoRole = createdRoles.find(r => r.code === 'CEO');
        adminUser = userRepo.create({
            email: adminEmail,
            password_hash: hashedPassword,
            is_active: true,
            roles: ceoRole ? [ceoRole] : [],
        });
        await userRepo.save(adminUser);
        console.log(`  Created admin user: ${adminEmail}`);
    } else {
        console.log(`  Admin user exists: ${adminEmail}`);
    }

    // Seed Leave Types
    const leaveTypeRepo = AppDataSource.getRepository(LeaveType);
    for (const lt of LEAVE_TYPES) {
        const existing = await leaveTypeRepo.findOneBy({ code: lt.code });
        if (!existing) {
            const leaveType = leaveTypeRepo.create(lt);
            await leaveTypeRepo.save(leaveType);
            console.log(`  Created leave type: ${lt.name}`);
        } else {
            console.log(`  Leave type exists: ${lt.name}`);
        }
    }

    // Seed Claim Types
    const claimTypeRepo = AppDataSource.getRepository(ClaimType);
    for (const ct of CLAIM_TYPES) {
        const existing = await claimTypeRepo.findOneBy({ code: ct.code });
        if (!existing) {
            const claimType = claimTypeRepo.create(ct);
            await claimTypeRepo.save(claimType);
            console.log(`  Created claim type: ${ct.name}`);
        } else {
            console.log(`  Claim type exists: ${ct.name}`);
        }
    }

    // Seed Permissions (after roles exist)
    await seedPermissions(AppDataSource);

    // Seed Approval Flows
    await seedApprovalFlows(AppDataSource);

    // Seed Default Loan Settings
    const settingRepo = AppDataSource.getRepository(SystemSetting);
    const loanDefaults: { key: string; value: any; description: string }[] = [
        { key: 'advance_max_per_month', value: 1, description: 'Maximum salary advances per month' },
        { key: 'advance_max_salary_percent', value: 50, description: 'Max % of salary for advance' },
        { key: 'advance_interest_rate', value: 0, description: 'Interest rate for salary advances (%)' },
        { key: 'loan_max_amount', value: 500000, description: 'Maximum staff loan amount (KES)' },
        { key: 'loan_max_term_months', value: 24, description: 'Maximum loan term in months' },
        { key: 'loan_interest_rate', value: 12, description: 'Annual interest rate for staff loans (%)' },
        { key: 'loan_max_deduction_percent', value: 33, description: 'Max salary deduction percentage for repayment' },
        { key: 'loan_require_guarantor', value: true, description: 'Require guarantor for loans > KES 100,000' },
        { key: 'loan_confirmed_only', value: true, description: 'Only confirmed staff can apply for loans' },
        { key: 'loan_auto_deduct', value: true, description: 'Auto-deduct loan repayments from payroll' },
        { key: 'loan_allow_multiple', value: false, description: 'Allow multiple active loans per staff' },
    ];
    console.log('💰 Seeding loan settings...');
    let settingsCreated = 0;
    for (const def of loanDefaults) {
        const existing = await settingRepo.findOne({ where: { key: def.key } });
        if (!existing) {
            await settingRepo.save(settingRepo.create({ key: def.key, value: def.value, category: 'loans', description: def.description }));
            settingsCreated++;
        }
    }
    console.log(`💰 Loan settings: ${settingsCreated} new, ${loanDefaults.length} total defined`);

    console.log('\nProduction defaults seeded successfully!');
    await AppDataSource.destroy();
}

seedProductionDefaults().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});
