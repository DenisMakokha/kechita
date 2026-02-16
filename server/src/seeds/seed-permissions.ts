import { DataSource } from 'typeorm';
import { Permission } from '../auth/entities/permission.entity';
import { Role } from '../auth/entities/role.entity';

// All granular permissions grouped by module
const PERMISSIONS: Array<{ code: string; name: string; module: string; action: string; description: string }> = [
    // Staff
    { code: 'staff.create', name: 'Create Staff', module: 'staff', action: 'create', description: 'Add new staff members' },
    { code: 'staff.read', name: 'View Staff', module: 'staff', action: 'read', description: 'View staff profiles and list' },
    { code: 'staff.update', name: 'Update Staff', module: 'staff', action: 'update', description: 'Edit staff details' },
    { code: 'staff.delete', name: 'Delete Staff', module: 'staff', action: 'delete', description: 'Remove staff records' },
    { code: 'staff.deactivate', name: 'Deactivate Staff', module: 'staff', action: 'update', description: 'Suspend/reactivate staff' },
    { code: 'staff.transfer', name: 'Transfer Staff', module: 'staff', action: 'update', description: 'Transfer staff between branches' },
    { code: 'staff.documents', name: 'Manage Documents', module: 'staff', action: 'update', description: 'Upload/verify/delete staff documents' },
    { code: 'staff.export', name: 'Export Staff Data', module: 'staff', action: 'export', description: 'Export staff lists and reports' },

    // Leave
    { code: 'leave.request', name: 'Request Leave', module: 'leave', action: 'create', description: 'Submit leave requests' },
    { code: 'leave.read', name: 'View Leave', module: 'leave', action: 'read', description: 'View leave balances and requests' },
    { code: 'leave.approve', name: 'Approve Leave', module: 'leave', action: 'approve', description: 'Approve or reject leave requests' },
    { code: 'leave.recall', name: 'Recall Leave', module: 'leave', action: 'update', description: 'Recall approved leave' },
    { code: 'leave.admin', name: 'Administer Leave', module: 'leave', action: 'admin', description: 'Initialize balances, process accrual, carry forward' },
    { code: 'leave.types.manage', name: 'Manage Leave Types', module: 'leave', action: 'admin', description: 'Create/edit leave types' },

    // Claims
    { code: 'claims.create', name: 'Submit Claims', module: 'claims', action: 'create', description: 'Submit expense claims' },
    { code: 'claims.read', name: 'View Claims', module: 'claims', action: 'read', description: 'View claims list and details' },
    { code: 'claims.approve', name: 'Approve Claims', module: 'claims', action: 'approve', description: 'Approve or reject claims' },
    { code: 'claims.process', name: 'Process Claims', module: 'claims', action: 'update', description: 'Mark claims as paid/processed' },
    { code: 'claims.categories.manage', name: 'Manage Claim Categories', module: 'claims', action: 'admin', description: 'Create/edit claim categories' },

    // Loans
    { code: 'loans.apply', name: 'Apply for Loan', module: 'loans', action: 'create', description: 'Submit loan applications' },
    { code: 'loans.read', name: 'View Loans', module: 'loans', action: 'read', description: 'View loan details and list' },
    { code: 'loans.approve', name: 'Approve Loans', module: 'loans', action: 'approve', description: 'Approve or reject loan applications' },
    { code: 'loans.disburse', name: 'Disburse Loans', module: 'loans', action: 'update', description: 'Disburse approved loans' },
    { code: 'loans.repayment', name: 'Record Repayment', module: 'loans', action: 'update', description: 'Record loan repayments' },
    { code: 'loans.export', name: 'Export Loan Data', module: 'loans', action: 'export', description: 'Export loan reports and payroll deductions' },

    // Petty Cash
    { code: 'petty_cash.expense', name: 'Record Expense', module: 'petty_cash', action: 'create', description: 'Record petty cash expenses' },
    { code: 'petty_cash.read', name: 'View Petty Cash', module: 'petty_cash', action: 'read', description: 'View floats and transactions' },
    { code: 'petty_cash.replenish', name: 'Request Replenishment', module: 'petty_cash', action: 'create', description: 'Request float replenishment' },
    { code: 'petty_cash.approve', name: 'Approve Replenishment', module: 'petty_cash', action: 'approve', description: 'Approve/reject replenishment requests' },
    { code: 'petty_cash.disburse', name: 'Disburse Replenishment', module: 'petty_cash', action: 'update', description: 'Disburse approved replenishments' },
    { code: 'petty_cash.floats.manage', name: 'Manage Floats', module: 'petty_cash', action: 'admin', description: 'Create/activate/deactivate floats' },

    // Recruitment
    { code: 'recruitment.jobs.manage', name: 'Manage Job Posts', module: 'recruitment', action: 'admin', description: 'Create/edit/delete/publish job posts' },
    { code: 'recruitment.read', name: 'View Recruitment', module: 'recruitment', action: 'read', description: 'View job posts and applications' },
    { code: 'recruitment.applications.manage', name: 'Manage Applications', module: 'recruitment', action: 'update', description: 'Screen, shortlist, schedule interviews' },
    { code: 'recruitment.interviews.manage', name: 'Manage Interviews', module: 'recruitment', action: 'update', description: 'Schedule and score interviews' },
    { code: 'recruitment.offers.manage', name: 'Manage Offers', module: 'recruitment', action: 'update', description: 'Create/send/approve offers' },
    { code: 'recruitment.background_checks', name: 'Manage Background Checks', module: 'recruitment', action: 'update', description: 'Initiate and review background checks' },

    // Organization
    { code: 'org.read', name: 'View Organization', module: 'org', action: 'read', description: 'View org structure (regions, branches, departments)' },
    { code: 'org.manage', name: 'Manage Organization', module: 'org', action: 'admin', description: 'Create/edit/delete org units' },

    // Users & Roles
    { code: 'users.read', name: 'View Users', module: 'users', action: 'read', description: 'View user accounts' },
    { code: 'users.manage', name: 'Manage Users', module: 'users', action: 'admin', description: 'Create/edit/deactivate user accounts' },
    { code: 'users.reset_password', name: 'Reset User Passwords', module: 'users', action: 'update', description: 'Reset passwords for other users' },
    { code: 'roles.read', name: 'View Roles', module: 'roles', action: 'read', description: 'View roles and permissions' },
    { code: 'roles.manage', name: 'Manage Roles', module: 'roles', action: 'admin', description: 'Create/edit roles and assign permissions' },

    // Approvals
    { code: 'approvals.read', name: 'View Approvals', module: 'approvals', action: 'read', description: 'View approval workflows' },
    { code: 'approvals.manage', name: 'Manage Approvals', module: 'approvals', action: 'admin', description: 'Configure approval workflows' },

    // Announcements
    { code: 'announcements.read', name: 'View Announcements', module: 'announcements', action: 'read', description: 'View announcements' },
    { code: 'announcements.manage', name: 'Manage Announcements', module: 'announcements', action: 'admin', description: 'Create/edit/delete announcements' },

    // Reports
    { code: 'reports.read', name: 'View Reports', module: 'reports', action: 'read', description: 'View dashboards and reports' },
    { code: 'reports.export', name: 'Export Reports', module: 'reports', action: 'export', description: 'Export reports to Excel/PDF' },
    { code: 'reports.submit', name: 'Submit Reports', module: 'reports', action: 'create', description: 'Submit branch reports' },
    { code: 'reports.approve', name: 'Approve Reports', module: 'reports', action: 'approve', description: 'Approve submitted reports' },
    { code: 'reports.kpi.import', name: 'Import KPI Data', module: 'reports', action: 'create', description: 'Import KPI data from CSV/Excel' },

    // Audit
    { code: 'audit.read', name: 'View Audit Logs', module: 'audit', action: 'read', description: 'View audit trail' },
    { code: 'audit.export', name: 'Export Audit Logs', module: 'audit', action: 'export', description: 'Export audit logs' },
    { code: 'audit.cleanup', name: 'Cleanup Audit Logs', module: 'audit', action: 'delete', description: 'Delete old audit logs' },

    // Notifications
    { code: 'notifications.read', name: 'View Notifications', module: 'notifications', action: 'read', description: 'View and manage notifications' },

    // Settings
    { code: 'settings.read', name: 'View Settings', module: 'settings', action: 'read', description: 'View system settings' },
    { code: 'settings.manage', name: 'Manage Settings', module: 'settings', action: 'admin', description: 'Configure system settings' },

    // Security
    { code: 'security.sessions', name: 'Manage Sessions', module: 'security', action: 'read', description: 'View and manage active sessions' },
    { code: 'security.2fa', name: 'Manage 2FA', module: 'security', action: 'update', description: 'Enable/disable two-factor authentication' },
];

// Default role → permission mappings
const ROLE_PERMISSIONS: Record<string, string[]> = {
    CEO: PERMISSIONS.map(p => p.code), // CEO gets all permissions

    HR_MANAGER: [
        'staff.create', 'staff.read', 'staff.update', 'staff.delete', 'staff.deactivate', 'staff.transfer', 'staff.documents', 'staff.export',
        'leave.read', 'leave.approve', 'leave.recall', 'leave.admin', 'leave.types.manage',
        'claims.read', 'claims.approve', 'claims.process', 'claims.categories.manage',
        'loans.read', 'loans.approve',
        'petty_cash.read',
        'recruitment.jobs.manage', 'recruitment.read', 'recruitment.applications.manage', 'recruitment.interviews.manage', 'recruitment.offers.manage', 'recruitment.background_checks',
        'org.read', 'org.manage',
        'users.read', 'users.manage', 'users.reset_password',
        'roles.read',
        'approvals.read', 'approvals.manage',
        'announcements.read', 'announcements.manage',
        'reports.read', 'reports.export', 'reports.approve',
        'audit.read', 'audit.export',
        'notifications.read',
        'settings.read', 'settings.manage',
        'security.sessions', 'security.2fa',
    ],

    HR_ASSISTANT: [
        'staff.create', 'staff.read', 'staff.update', 'staff.documents', 'staff.export',
        'leave.read', 'leave.approve',
        'claims.read',
        'loans.read',
        'recruitment.read', 'recruitment.applications.manage', 'recruitment.interviews.manage',
        'org.read',
        'announcements.read', 'announcements.manage',
        'reports.read',
        'notifications.read',
        'security.sessions', 'security.2fa',
    ],

    REGIONAL_MANAGER: [
        'staff.read', 'staff.export',
        'leave.read', 'leave.approve', 'leave.recall',
        'claims.read', 'claims.approve',
        'loans.read', 'loans.approve',
        'petty_cash.read', 'petty_cash.approve', 'petty_cash.disburse',
        'recruitment.read', 'recruitment.interviews.manage',
        'org.read',
        'approvals.read',
        'announcements.read',
        'reports.read', 'reports.export', 'reports.approve',
        'audit.read',
        'notifications.read',
        'security.sessions', 'security.2fa',
    ],

    REGIONAL_ADMIN: [
        'staff.read',
        'leave.read',
        'claims.read',
        'loans.read',
        'petty_cash.read',
        'recruitment.read',
        'org.read',
        'announcements.read',
        'reports.read',
        'notifications.read',
        'security.sessions', 'security.2fa',
    ],

    BRANCH_MANAGER: [
        'staff.read',
        'leave.request', 'leave.read', 'leave.approve',
        'claims.create', 'claims.read',
        'loans.read',
        'petty_cash.expense', 'petty_cash.read', 'petty_cash.replenish',
        'recruitment.read',
        'org.read',
        'approvals.read',
        'announcements.read',
        'reports.read', 'reports.submit',
        'notifications.read',
        'security.sessions', 'security.2fa',
    ],

    ACCOUNTANT: [
        'staff.read',
        'claims.read', 'claims.process',
        'loans.read', 'loans.disburse', 'loans.repayment', 'loans.export',
        'petty_cash.read', 'petty_cash.approve', 'petty_cash.disburse', 'petty_cash.floats.manage',
        'org.read',
        'reports.read', 'reports.export', 'reports.kpi.import',
        'audit.read',
        'notifications.read',
        'security.sessions', 'security.2fa',
    ],

    RELATIONSHIP_OFFICER: [
        'staff.read',
        'leave.request', 'leave.read',
        'claims.create', 'claims.read',
        'loans.apply', 'loans.read',
        'petty_cash.read',
        'org.read',
        'announcements.read',
        'reports.read',
        'notifications.read',
        'security.sessions', 'security.2fa',
    ],

    BDM: [
        'staff.read',
        'leave.request', 'leave.read',
        'claims.create', 'claims.read',
        'loans.apply', 'loans.read',
        'org.read',
        'announcements.read',
        'reports.read',
        'notifications.read',
        'security.sessions', 'security.2fa',
    ],
};

export async function seedPermissions(dataSource: DataSource) {
    const permRepo = dataSource.getRepository(Permission);
    const roleRepo = dataSource.getRepository(Role);

    console.log('🔐 Seeding permissions...');

    // Upsert all permissions
    let created = 0;
    for (const p of PERMISSIONS) {
        const existing = await permRepo.findOne({ where: { code: p.code } });
        if (!existing) {
            await permRepo.save(permRepo.create(p));
            created++;
        } else {
            await permRepo.update(existing.id, { name: p.name, module: p.module, action: p.action, description: p.description });
        }
    }
    console.log(`   ✅ ${created} new permissions created (${PERMISSIONS.length} total defined)`);

    // Assign permissions to roles
    let rolesUpdated = 0;
    for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
        const role = await roleRepo.findOne({ where: { code: roleCode }, relations: ['permissions'] });
        if (!role) {
            console.log(`   ⚠️  Role ${roleCode} not found, skipping`);
            continue;
        }

        const permissions = await permRepo.find();
        const rolePerms = permissions.filter(p => permCodes.includes(p.code));

        role.permissions = rolePerms;
        await roleRepo.save(role);
        rolesUpdated++;
        console.log(`   ✅ ${roleCode}: ${rolePerms.length} permissions assigned`);
    }

    console.log(`🔐 Permissions seeded: ${rolesUpdated} roles updated`);
}
