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
import { Staff, StaffStatus, ProbationStatus } from '../staff/entities/staff.entity';
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
import { EmailTemplateEntity } from '../email/entities/email-template.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
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
    { code: 'MATERNITY', name: 'Maternity Leave', max_days_per_year: 90, color: '#EC4899', applicable_gender: 'female', requires_attachment: true },
    { code: 'PATERNITY', name: 'Paternity Leave', max_days_per_year: 14, color: '#8B5CF6', applicable_gender: 'male', requires_attachment: true },
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

const DOCUMENT_TYPES = [
    { code: 'ID_CARD', name: 'National ID Card', description: 'Copy of national identification card', is_required: true },
    { code: 'PASSPORT', name: 'Passport', description: 'International passport copy', is_required: false },
    { code: 'PIN_CERTIFICATE', name: 'KRA PIN Certificate', description: 'Tax identification certificate', is_required: true },
    { code: 'NHIF_CARD', name: 'NHIF Card', description: 'National Hospital Insurance Fund card', is_required: true },
    { code: 'NSSF_CARD', name: 'NSSF Card', description: 'National Social Security Fund card', is_required: true },
    { code: 'CERTIFICATE_GOOD_CONDUCT', name: 'Certificate of Good Conduct', description: 'Police clearance certificate', is_required: true, expiry_warning_days: 30 },
    { code: 'ACADEMIC_CERT', name: 'Academic Certificate', description: 'Degree, diploma, or certificate', is_required: true },
    { code: 'CV', name: 'Curriculum Vitae', description: 'Staff CV/Resume', is_required: true },
    { code: 'OFFER_LETTER', name: 'Offer Letter', description: 'Signed employment offer letter', is_required: true },
    { code: 'CONTRACT', name: 'Employment Contract', description: 'Signed employment contract', is_required: true },
    { code: 'REFERENCE_CHECK', name: 'Reference Check', description: 'Reference verification documents', is_required: false },
    { code: 'BANK_PROOF', name: 'Bank Account Proof', description: 'Bank statement or ATM card copy', is_required: true },
    { code: 'PHOTO', name: 'Passport Photo', description: 'Recent passport size photograph', is_required: true },
    { code: 'MEDICAL_CERT', name: 'Medical Certificate', description: 'Pre-employment medical clearance', is_required: true, expiry_warning_days: 90 },
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

export async function seedProductionDefaults() {
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

    // Seed Staff profile for admin user (required for petty cash, payroll, etc.)
    const staffRepo = AppDataSource.getRepository(Staff);
    const positionRepo = AppDataSource.getRepository(Position);
    const existingAdminStaff = await staffRepo.findOne({
        where: [
            { user: { id: adminUser.id } },
            { employee_number: 'KEC250001' }
        ]
    });
    if (!existingAdminStaff) {
        // Ensure CEO position exists
        let ceoPos = await positionRepo.findOneBy({ code: 'CEO' });
        if (!ceoPos) {
            ceoPos = positionRepo.create({ name: 'Chief Executive Officer', code: 'CEO' });
            await positionRepo.save(ceoPos);
            console.log('  Created CEO position');
        }
        const adminStaff = staffRepo.create({
            user: adminUser,
            employee_number: 'KEC250001',
            first_name: 'System',
            last_name: 'Admin',
            status: StaffStatus.ACTIVE,
            probation_status: ProbationStatus.NOT_APPLICABLE,
            position: ceoPos,
            hire_date: new Date(),
            confirmation_date: new Date(),
        });
        await staffRepo.save(adminStaff);
        console.log(`  Created staff profile for admin user: ${adminEmail}`);
    } else {
        if (!existingAdminStaff.user) {
            existingAdminStaff.user = adminUser;
            await staffRepo.save(existingAdminStaff);
            console.log(`  Linked existing staff profile KEC250001 to user: ${adminEmail}`);
        } else {
            console.log(`  Admin staff profile exists`);
        }
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

    // Seed Document Types
    console.log('📄 Seeding document types...');
    const docTypeRepo = AppDataSource.getRepository(DocumentType);
    for (const dt of DOCUMENT_TYPES) {
        const existing = await docTypeRepo.findOneBy({ code: dt.code });
        if (!existing) {
            await docTypeRepo.save(docTypeRepo.create(dt));
            console.log(`  📄 Created document type: ${dt.name}`);
        } else {
            console.log(`  📄 Document type exists: ${dt.name}`);
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
                    date: h.date,
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
        // Salary Advance
        { key: 'advance_max_per_month', value: 1, description: 'Maximum salary advances per month' },
        { key: 'advance_max_salary_percent', value: 20, description: 'Max % of gross salary for advance' },
        { key: 'advance_min_months_employed', value: 3, description: 'Min months employed before advance eligibility' },
        { key: 'advance_interest_rate', value: 0, description: 'Interest rate for salary advances (%)' },
        { key: 'advance_repayment_months', value: 1, description: 'Months to repay salary advance' },
        { key: 'advance_max_outstanding', value: 1, description: 'Max outstanding advances at a time' },
        { key: 'advance_confirmed_only', value: false, description: 'Only confirmed staff can apply for advances' },
        { key: 'advance_clear_before_loan', value: true, description: 'Advances must be cleared before loan' },
        { key: 'advance_min_salary_for_advance', value: 10000, description: 'Min gross salary to qualify for advance (KES)' },
        // Staff Loan
        { key: 'loan_max_amount', value: 500000, description: 'Maximum staff loan amount (KES)' },
        { key: 'loan_min_amount', value: 10000, description: 'Minimum staff loan amount (KES)' },
        { key: 'loan_max_term_months', value: 24, description: 'Maximum loan term in months' },
        { key: 'loan_min_term_months', value: 3, description: 'Minimum loan term in months' },
        { key: 'loan_interest_rate', value: 12, description: 'Annual interest rate for staff loans (%)' },
        { key: 'loan_max_deduction_percent', value: 33, description: 'Max salary deduction percentage for repayment' },
        { key: 'loan_min_months_employed', value: 6, description: 'Min months employed before loan eligibility' },
        { key: 'loan_guarantor_threshold', value: 100000, description: 'Loans above this amount require a guarantor (KES)' },
        // General policies
        { key: 'loan_require_guarantor', value: true, description: 'Require guarantor for loans above threshold' },
        { key: 'loan_confirmed_only', value: true, description: 'Only confirmed staff can apply for loans' },
        { key: 'loan_auto_deduct', value: true, description: 'Auto-deduct loan repayments from payroll' },
        { key: 'loan_allow_multiple', value: false, description: 'Allow multiple active loans per staff' },
        { key: 'loan_allow_top_up', value: false, description: 'Allow loan top-up after 50% repaid' },
        { key: 'loan_require_hod_approval', value: true, description: 'Require HOD approval for loans' },
        { key: 'loan_notify_hr_on_apply', value: true, description: 'Notify HR on loan application' },
        { key: 'loan_notify_staff_on_status', value: true, description: 'Notify staff on loan status change' },
        // Eligibility
        { key: 'loan_max_per_staff', value: 1, description: 'Max active loans per staff member' },
        { key: 'loan_min_salary_for_loan', value: 15000, description: 'Min gross salary to qualify for loan (KES)' },
        { key: 'loan_max_salary_multiple', value: 6, description: 'Max loan as multiple of gross monthly salary' },
        { key: 'loan_penalty_rate', value: 2, description: 'Monthly penalty rate for overdue repayments (%)' },
        { key: 'loan_grace_days', value: 5, description: 'Grace period days before repayment is overdue' },
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

    // Helper to bulk-seed a category
    const seedCategory = async (category: string, label: string, defs: { key: string; value: any; description: string }[]) => {
        console.log(`⚙️  Seeding ${label} settings...`);
        let created = 0;
        for (const def of defs) {
            const existing = await settingRepo.findOne({ where: { key: def.key } });
            if (!existing) {
                await settingRepo.save(settingRepo.create({ key: def.key, value: def.value, category, description: def.description }));
                created++;
            }
        }
        console.log(`⚙️  ${label}: ${created} new, ${defs.length} total defined`);
    };

    await seedCategory('leave', 'Leave', [
        { key: 'leave_min_days_notice', value: 3, description: 'Min days notice before leave start' },
        { key: 'leave_max_consecutive_days', value: 21, description: 'Max consecutive leave days per request' },
        { key: 'leave_min_days_per_request', value: 1, description: 'Min days per leave request' },
        { key: 'leave_cancel_days_before', value: 1, description: 'Days before start staff can cancel' },
        { key: 'leave_auto_approve_hours', value: 72, description: 'Auto-approve leave after N hours if not actioned' },
        { key: 'leave_carry_forward_max', value: 10, description: 'Max carry-forward days per year' },
        { key: 'leave_accrual_frequency', value: 'monthly', description: 'Leave accrual frequency' },
        { key: 'leave_accrual_start_month', value: 1, description: 'Month accrual starts for new staff' },
        { key: 'leave_fiscal_year_start', value: 1, description: 'Leave year reset month (1=Jan)' },
        { key: 'leave_require_reliever', value: true, description: 'Require reliever assignment' },
        { key: 'leave_allow_half_days', value: false, description: 'Allow half-day requests' },
        { key: 'leave_probation_eligible', value: false, description: 'Probationary staff can apply for leave' },
        { key: 'leave_blackout_december', value: false, description: 'Block leave in December' },
        { key: 'leave_notify_manager_on_apply', value: true, description: 'Notify line manager on leave apply' },
        { key: 'leave_notify_hr_on_apply', value: false, description: 'Notify HR on leave apply' },
        { key: 'leave_notify_staff_on_action', value: true, description: 'Notify staff on leave approval/rejection' },
        { key: 'leave_allow_negative_balance', value: false, description: 'Allow leave with zero balance' },
    ]);

    await seedCategory('claims', 'Claims', [
        { key: 'claims_max_per_month', value: 10, description: 'Max claim submissions per staff per month' },
        { key: 'claims_max_single_amount', value: 200000, description: 'Max amount for a single claim (KES)' },
        { key: 'claims_max_item_amount', value: 50000, description: 'Max amount per claim line item (KES)' },
        { key: 'claims_high_value_threshold', value: 50000, description: 'High-value approval threshold (KES)' },
        { key: 'claims_require_receipt_above', value: 1000, description: 'Receipt required above this amount (KES)' },
        { key: 'claims_retroactive_days', value: 30, description: 'Max days in the past a claim can be for' },
        { key: 'claims_auto_approve_hours', value: 48, description: 'Auto-approve claims after N hours' },
        { key: 'claims_payment_days_sla', value: 7, description: 'Target days to pay after approval' },
        { key: 'claims_require_pre_approval', value: false, description: 'Require pre-approval before expense' },
        { key: 'claims_allow_draft_save', value: true, description: 'Allow draft claims before submission' },
        { key: 'claims_notify_finance_on_submit', value: true, description: 'Notify finance on claim submission' },
        { key: 'claims_notify_staff_on_action', value: true, description: 'Notify staff on claim status change' },
        { key: 'claims_require_manager_approval', value: true, description: 'Require manager approval for claims' },
        { key: 'claims_allow_resubmission', value: true, description: 'Allow resubmission after rejection' },
    ]);

    await seedCategory('petty_cash', 'Petty Cash', [
        { key: 'petty_cash_small_tier_limit', value: 5000, description: 'Max balance for small tier (KES)' },
        { key: 'petty_cash_medium_tier_limit', value: 20000, description: 'Max balance for medium tier (KES)' },
        { key: 'petty_cash_large_tier_limit', value: 50000, description: 'Max balance for large tier (KES)' },
        { key: 'petty_cash_max_single_expense', value: 5000, description: 'Max single petty cash expense (KES)' },
        { key: 'petty_cash_require_receipt_above', value: 500, description: 'Receipt required above this amount (KES)' },
        { key: 'petty_cash_replenishment_trigger', value: 25, description: 'Replenishment trigger % of limit' },
        { key: 'petty_cash_auto_deactivate_days', value: 90, description: 'Auto-deactivate float after N inactive days' },
        { key: 'petty_cash_replenishment_approval_required', value: true, description: 'Approval required for replenishment' },
        { key: 'petty_cash_notify_custodian_low', value: true, description: 'Notify custodian on low balance' },
        { key: 'petty_cash_allow_float_transfer', value: false, description: 'Allow balance transfer between floats' },
        { key: 'petty_cash_require_witness', value: false, description: 'Witness required for large expenses' },
        { key: 'petty_cash_notify_finance_on_replenishment', value: true, description: 'Notify finance on replenishment' },
        { key: 'petty_cash_allow_staff_expenses', value: false, description: 'Allow direct staff petty cash expenses' },
    ]);

    await seedCategory('recruitment', 'Recruitment', [
        { key: 'recruitment_max_active_jobs', value: 20, description: 'Max simultaneous active job postings' },
        { key: 'recruitment_shortlist_quota', value: 10, description: 'Max candidates to shortlist per role' },
        { key: 'recruitment_interview_rounds', value: 2, description: 'Default interview rounds' },
        { key: 'recruitment_offer_expiry_days', value: 5, description: 'Days for candidate to accept offer' },
        { key: 'recruitment_probation_months', value: 3, description: 'Default probation period for new hires (months)' },
        { key: 'recruitment_require_background_check', value: true, description: 'Background check required before offer' },
        { key: 'recruitment_allow_internal_applications', value: true, description: 'Staff can apply for internal postings' },
        { key: 'recruitment_pipeline_auto_advance', value: false, description: 'Auto-advance candidates in pipeline' },
        { key: 'recruitment_notify_hr_on_application', value: true, description: 'Notify HR on each application' },
        { key: 'recruitment_notify_applicant_on_status', value: true, description: 'Email applicants on status change' },
        { key: 'recruitment_require_panel_interview', value: false, description: 'Require panel interview' },
        { key: 'recruitment_approval_before_posting', value: true, description: 'Approval required before posting' },
        { key: 'recruitment_allow_reapplication', value: true, description: 'Allow candidates to re-apply' },
    ]);

    await seedCategory('onboarding', 'Onboarding', [
        { key: 'onboarding_deadline_days', value: 30, description: 'Days to complete onboarding tasks' },
        { key: 'onboarding_reminder_days_before', value: 5, description: 'Days before deadline to send reminder' },
        { key: 'onboarding_probation_months', value: 3, description: 'Default probation period (months)' },
        { key: 'onboarding_probation_extension_months', value: 3, description: 'Max probation extension (months)' },
        { key: 'onboarding_auto_assign_template', value: true, description: 'Auto-assign template on staff creation' },
        { key: 'onboarding_require_all_docs', value: true, description: 'Require all docs for confirmation' },
        { key: 'onboarding_require_all_tasks', value: true, description: 'Require all tasks before confirmation' },
        { key: 'onboarding_notify_hr_on_complete', value: true, description: 'Notify HR on onboarding completion' },
        { key: 'onboarding_notify_manager_on_complete', value: true, description: 'Notify manager on onboarding completion' },
        { key: 'onboarding_block_payroll_until_complete', value: false, description: 'Block payroll until onboarding complete' },
        { key: 'onboarding_send_welcome_email', value: true, description: 'Send welcome email on first day' },
        { key: 'onboarding_require_bank_details', value: true, description: 'Require bank details before payroll' },
    ]);

    await seedCategory('reports', 'Reports', [
        { key: 'reports_data_retention_months', value: 24, description: 'Data retention period (months)' },
        { key: 'reports_archive_after_months', value: 12, description: 'Archive reports after N months' },
        { key: 'reports_kpi_target_headcount', value: 100, description: 'Target headcount' },
        { key: 'reports_kpi_target_turnover_percent', value: 15, description: 'Acceptable turnover rate (%)' },
        { key: 'reports_kpi_target_leave_utilization', value: 70, description: 'Target leave utilization (%)' },
        { key: 'reports_kpi_target_claims_processed_days', value: 7, description: 'Claims processing SLA (days)' },
        { key: 'reports_auto_generate_monthly', value: true, description: 'Auto-generate monthly summary' },
        { key: 'reports_notify_ceo_monthly', value: true, description: 'Email CEO monthly summary' },
        { key: 'reports_allow_pdf_export', value: true, description: 'Allow PDF export' },
        { key: 'reports_allow_excel_export', value: true, description: 'Allow Excel export' },
        { key: 'reports_allow_csv_export', value: true, description: 'Allow CSV export' },
        { key: 'reports_require_approval_to_view', value: false, description: 'Require approval to view sensitive reports' },
    ]);

    await seedCategory('org', 'Organisation', [
        { key: 'org_name', value: 'Kechita Capital', description: 'Organisation full legal name' },
        { key: 'org_country', value: 'Kenya', description: 'Country of registration' },
        { key: 'org_currency', value: 'KES', description: 'Default currency' },
        { key: 'org_timezone', value: 'Africa/Nairobi', description: 'System timezone' },
        { key: 'org_working_days_per_week', value: '5', description: 'Working days per week (5 or 6)' },
        { key: 'org_working_hours_start', value: '08:00', description: 'Office start time (24h)' },
        { key: 'org_working_hours_end', value: '17:00', description: 'Office end time (24h)' },
        { key: 'org_fiscal_year_start_month', value: 1, description: 'Fiscal year start month (1=Jan)' },
        { key: 'org_max_branches', value: 50, description: 'Max branches allowed' },
        { key: 'org_max_departments_per_branch', value: 10, description: 'Max departments per branch' },
        { key: 'org_require_hod', value: false, description: 'Every dept must have HOD' },
        { key: 'org_allow_cross_branch_transfers', value: true, description: 'Allow cross-branch transfers' },
    ]);

    await seedCategory('hr', 'HR', [
        { key: 'hr_probation_default_months', value: 3, description: 'Default probation period (months)' },
        { key: 'hr_notice_period_months', value: 1, description: 'Default notice period (months)' },
        { key: 'hr_salary_review_frequency', value: 'annual', description: 'Salary review frequency' },
        { key: 'hr_document_expiry_warning_days', value: 30, description: 'Days before doc expiry to warn' },
        { key: 'hr_staff_number_prefix', value: 'KEC', description: 'Staff number prefix' },
        { key: 'hr_staff_number_padding', value: 4, description: 'Staff number zero-padding digits' },
        { key: 'hr_enable_staff_numbering', value: true, description: 'Auto-generate staff numbers' },
        { key: 'hr_nok_required', value: true, description: 'Next of kin required' },
        { key: 'hr_allow_self_service_profile', value: false, description: 'Staff can self-edit profile' },
        { key: 'hr_confirm_auto_notify', value: true, description: 'Auto-notify on staff confirmation' },
        { key: 'hr_require_exit_interview', value: true, description: 'Exit interview required' },
        { key: 'hr_notify_on_contract_expiry', value: true, description: 'Notify on contract expiry' },
        { key: 'hr_allow_multiple_positions', value: false, description: 'Staff can hold multiple positions' },
        { key: 'hr_require_medical_on_join', value: false, description: 'Medical certificate required on joining' },
        { key: 'hr_salary_confidential', value: true, description: 'Keep salaries confidential' },
    ]);

    await seedCategory('approvals', 'Approvals', [
        { key: 'approval_default_sla_hours', value: 48, description: 'Default approval SLA (hours)' },
        { key: 'approval_escalation_hours', value: 72, description: 'Escalate after N hours of inaction' },
        { key: 'approval_delegation_max_days', value: 14, description: 'Max delegation period (days)' },
        { key: 'approval_auto_approve_leave_hours', value: 72, description: 'Auto-approve leave after N hours' },
        { key: 'approval_allow_delegation', value: true, description: 'Allow approval delegation' },
        { key: 'approval_require_comment_on_reject', value: true, description: 'Comment required on rejection' },
        { key: 'approval_require_comment_on_approve', value: false, description: 'Comment required on approval' },
        { key: 'approval_allow_self_approval', value: false, description: 'Allow self-approval' },
        { key: 'approval_notify_on_pending', value: true, description: 'Notify approver on assignment' },
        { key: 'approval_notify_requester_on_action', value: true, description: 'Notify requester on each step' },
        { key: 'approval_allow_parallel_steps', value: false, description: 'Allow parallel approval steps' },
        { key: 'approval_retain_history', value: true, description: 'Retain full approval history' },
    ]);

    console.log('\nProduction defaults seeded successfully!');
    await AppDataSource.destroy();
}

// Function is exported and called by run-seed.ts
