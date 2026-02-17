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
import { PublicHoliday } from '../leave/entities/public-holiday.entity';

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
        EmploymentHistory, OnboardingTemplate, OnboardingTask, OnboardingInstance, OnboardingTaskStatus, StaffContract, PublicHoliday,
    ],
    synchronize: true,
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

const CLAIM_TYPES: Partial<ClaimType>[] = [
    {
        code: 'PER_DIEM', name: 'Per Diem',
        description: 'Daily allowance for official travel',
        max_amount_per_claim: 10000, max_amount_per_month: 50000,
        requires_receipt: false, requires_approval: true, is_taxable: false,
        icon: 'calendar', color: '#3B82F6', display_order: 1,
    },
    {
        code: 'FUEL', name: 'Fuel Allowance',
        description: 'Fuel reimbursement for official travel',
        max_amount_per_claim: 20000, max_amount_per_month: 80000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'fuel', color: '#F59E0B', display_order: 2,
    },
    {
        code: 'TRANSPORT', name: 'Transport',
        description: 'Transport costs (taxi, bus, etc.)',
        max_amount_per_claim: 5000, max_amount_per_month: 20000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'car', color: '#10B981', display_order: 3,
    },
    {
        code: 'MEALS', name: 'Meals & Entertainment',
        description: 'Meals during official duties or client entertainment',
        max_amount_per_claim: 5000, max_amount_per_month: 25000,
        requires_receipt: true, requires_approval: true, is_taxable: true,
        icon: 'utensils', color: '#EC4899', display_order: 4,
    },
    {
        code: 'ACCOMMODATION', name: 'Accommodation',
        description: 'Hotel/lodging during official travel',
        max_amount_per_claim: 15000, max_amount_per_month: 60000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'building', color: '#8B5CF6', display_order: 5,
    },
    {
        code: 'MEDICAL', name: 'Medical Expense',
        description: 'Medical expenses not covered by insurance',
        max_amount_per_claim: 50000, max_amount_per_year: 200000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'heart-pulse', color: '#EF4444', display_order: 6,
    },
    {
        code: 'AIRFARE', name: 'Air Travel',
        description: 'Flight tickets for official travel',
        max_amount_per_claim: 100000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'plane', color: '#06B6D4', display_order: 7,
    },
    {
        code: 'COMMUNICATION', name: 'Communication',
        description: 'Phone, internet, and other communication costs',
        max_amount_per_claim: 3000, max_amount_per_month: 10000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'phone', color: '#14B8A6', display_order: 8,
    },
    {
        code: 'TRAINING', name: 'Training & Development',
        description: 'Training courses, certifications, seminars',
        max_amount_per_claim: 100000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'book-open', color: '#6366F1', display_order: 9,
    },
    {
        code: 'RELOCATION', name: 'Relocation Allowance',
        description: 'Moving expenses for staff transfers',
        max_amount_per_claim: 200000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        eligible_role_codes: ['BRANCH_MANAGER', 'REGIONAL_MANAGER', 'HR_MANAGER', 'CEO'],
        icon: 'truck', color: '#64748B', display_order: 10,
    },
    {
        code: 'AIRTIME', name: 'Airtime',
        description: 'Monthly airtime allowance for staff communication',
        max_amount_per_claim: 2000, max_amount_per_month: 2000,
        requires_receipt: false, requires_approval: true, is_taxable: false,
        once_per_month: true,
        icon: 'smartphone', color: '#0EA5E9', display_order: 11,
    },
    {
        code: 'MISC', name: 'Miscellaneous',
        description: 'Other approved expenses',
        max_amount_per_claim: 10000,
        requires_receipt: true, requires_approval: true, is_taxable: false,
        icon: 'receipt', color: '#94A3B8', display_order: 99,
    },
];

// Kenyan Public Holidays
const HOLIDAYS_2025 = [
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

const HOLIDAYS_2026 = [
    { name: "New Year's Day", date: '2026-01-01', is_recurring: true },
    { name: 'Good Friday', date: '2026-04-03', is_recurring: false },
    { name: 'Easter Monday', date: '2026-04-06', is_recurring: false },
    { name: 'Labour Day', date: '2026-05-01', is_recurring: true },
    { name: 'Madaraka Day', date: '2026-06-01', is_recurring: true },
    { name: 'Eid ul-Fitr', date: '2026-03-20', is_recurring: false },
    { name: 'Eid ul-Adha', date: '2026-05-27', is_recurring: false },
    { name: 'Utamaduni Day', date: '2026-10-10', is_recurring: true },
    { name: 'Mashujaa Day', date: '2026-10-20', is_recurring: true },
    { name: 'Jamhuri Day', date: '2026-12-12', is_recurring: true },
    { name: 'Christmas Day', date: '2026-12-25', is_recurring: true },
    { name: 'Boxing Day', date: '2026-12-26', is_recurring: true },
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
    console.log('📋 Seeding claim types...');
    const claimTypeRepo = AppDataSource.getRepository(ClaimType);
    for (const ct of CLAIM_TYPES) {
        const existing = await claimTypeRepo.findOneBy({ code: ct.code });
        if (!existing) {
            const claimType = claimTypeRepo.create(ct);
            await claimTypeRepo.save(claimType);
            console.log(`  ✅ Created claim type: ${ct.name}${ct.once_per_month ? ' (once per month)' : ''}`);
        } else {
            // Update existing claim type with new fields if missing
            let updated = false;
            if (ct.once_per_month !== undefined && existing.once_per_month !== ct.once_per_month) {
                existing.once_per_month = ct.once_per_month;
                updated = true;
            }
            if (ct.max_amount_per_claim && !existing.max_amount_per_claim) {
                existing.max_amount_per_claim = ct.max_amount_per_claim;
                updated = true;
            }
            if (ct.max_amount_per_month && !existing.max_amount_per_month) {
                existing.max_amount_per_month = ct.max_amount_per_month;
                updated = true;
            }
            if (ct.description && !existing.description) {
                existing.description = ct.description;
                updated = true;
            }
            if (ct.icon && !existing.icon) {
                existing.icon = ct.icon;
                updated = true;
            }
            if (ct.color && !existing.color) {
                existing.color = ct.color;
                updated = true;
            }
            if (updated) {
                await claimTypeRepo.save(existing);
                console.log(`  🔄 Updated claim type: ${ct.name}`);
            } else {
                console.log(`  ⏭️  Claim type exists: ${ct.name}`);
            }
        }
    }

    // Seed Public Holidays
    console.log('📅 Seeding public holidays...');
    const holidayRepo = AppDataSource.getRepository(PublicHoliday);
    for (const [year, holidays] of [[2025, HOLIDAYS_2025], [2026, HOLIDAYS_2026]] as const) {
        let created = 0;
        for (const h of holidays) {
            const existing = await holidayRepo.findOneBy({ name: h.name, year: year as number });
            if (!existing) {
                await holidayRepo.save(holidayRepo.create({
                    ...h,
                    year: year as number,
                    date: new Date(h.date),
                }));
                created++;
            }
        }
        console.log(`  📅 ${year}: ${created} new holidays seeded (${holidays.length} total defined)`);
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
