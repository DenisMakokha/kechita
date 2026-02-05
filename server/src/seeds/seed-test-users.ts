import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { Position } from '../org/entities/position.entity';
import { Staff, StaffStatus, ProbationStatus } from '../staff/entities/staff.entity';
import { Document } from '../staff/entities/document.entity';
import { DocumentType } from '../staff/entities/document-type.entity';
import { StaffDocument } from '../staff/entities/staff-document.entity';
import { EmploymentHistory } from '../staff/entities/employment-history.entity';
import { OnboardingTemplate } from '../staff/entities/onboarding-template.entity';
import { OnboardingTask } from '../staff/entities/onboarding-task.entity';
import { OnboardingInstance } from '../staff/entities/onboarding-instance.entity';
import { OnboardingTaskStatus } from '../staff/entities/onboarding-task-status.entity';
import { LeaveType } from '../leave/entities/leave-type.entity';
import { LeaveBalance } from '../leave/entities/leave-balance.entity';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { PublicHoliday } from '../leave/entities/public-holiday.entity';
import { ApprovalFlow } from '../approval/entities/approval-flow.entity';
import { ApprovalFlowStep } from '../approval/entities/approval-flow-step.entity';
import { ApprovalInstance } from '../approval/entities/approval-instance.entity';
import { ApprovalAction } from '../approval/entities/approval-action.entity';
import { ClaimType } from '../claims/entities/claim-type.entity';
import { Claim } from '../claims/entities/claim.entity';
import { ClaimItem } from '../claims/entities/claim-item.entity';
import { StaffLoan } from '../loans/entities/staff-loan.entity';
import { StaffLoanRepayment } from '../loans/entities/staff-loan-repayment.entity';
import { JobPost } from '../recruitment/entities/job-post.entity';
import { PipelineStage } from '../recruitment/entities/pipeline-stage.entity';
import { Candidate } from '../recruitment/entities/candidate.entity';
import { Application } from '../recruitment/entities/application.entity';
import { Interview } from '../recruitment/entities/interview.entity';
import { Offer } from '../recruitment/entities/offer.entity';
import { BranchDailyReport } from '../reporting/entities/branch-daily-report.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationPreference } from '../notifications/entities/notification-preference.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [
        Role, User, Region, Branch, Department, Position,
        Staff, Document, DocumentType, StaffDocument, EmploymentHistory,
        OnboardingTemplate, OnboardingTask, OnboardingInstance, OnboardingTaskStatus,
        LeaveType, LeaveBalance, LeaveRequest, PublicHoliday,
        ApprovalFlow, ApprovalFlowStep, ApprovalInstance, ApprovalAction,
        ClaimType, Claim, ClaimItem,
        StaffLoan, StaffLoanRepayment,
        JobPost, PipelineStage, Candidate, Application, Interview, Offer,
        BranchDailyReport,
        Notification, NotificationPreference,
    ],
    synchronize: false,
});

interface TestUser {
    email: string;
    firstName: string;
    lastName: string;
    roleCode: string;
    positionCode: string;
    positionName: string;
    employeeNumber: string;
}

const testUsers: TestUser[] = [
    {
        email: 'hr@kechita.com',
        firstName: 'Jane',
        lastName: 'Njeri',
        roleCode: 'HR_MANAGER',
        positionCode: 'HRM',
        positionName: 'HR Manager',
        employeeNumber: 'KEC250002',
    },
    {
        email: 'regional@kechita.com',
        firstName: 'Peter',
        lastName: 'Ochieng',
        roleCode: 'REGIONAL_MANAGER',
        positionCode: 'RM',
        positionName: 'Regional Manager',
        employeeNumber: 'KEC250003',
    },
    {
        email: 'branch@kechita.com',
        firstName: 'Mary',
        lastName: 'Wanjiku',
        roleCode: 'BRANCH_MANAGER',
        positionCode: 'BM',
        positionName: 'Branch Manager',
        employeeNumber: 'KEC250004',
    },
    {
        email: 'accountant@kechita.com',
        firstName: 'David',
        lastName: 'Kipchoge',
        roleCode: 'ACCOUNTANT',
        positionCode: 'ACC',
        positionName: 'Accountant',
        employeeNumber: 'KEC250005',
    },
    {
        email: 'staff@kechita.com',
        firstName: 'Agnes',
        lastName: 'Mutua',
        roleCode: 'RELATIONSHIP_OFFICER',
        positionCode: 'RO',
        positionName: 'Relationship Officer',
        employeeNumber: 'KEC250006',
    },
];

async function seedTestUsers() {
    await AppDataSource.initialize();
    console.log('Database connected for test user seeding...');

    try {
        const userRepo = AppDataSource.getRepository(User);
        const roleRepo = AppDataSource.getRepository(Role);
        const staffRepo = AppDataSource.getRepository(Staff);
        const positionRepo = AppDataSource.getRepository(Position);
        const branchRepo = AppDataSource.getRepository(Branch);

        // Get a branch for staff
        const branch = await branchRepo.findOne({ where: {} });

        for (const testUser of testUsers) {
            // Check if user already exists
            const existingUser = await userRepo.findOneBy({ email: testUser.email });
            if (existingUser) {
                console.log(`User ${testUser.email} already exists, skipping...`);
                continue;
            }

            // Find role
            const role = await roleRepo.findOneBy({ code: testUser.roleCode });
            if (!role) {
                console.log(`Role ${testUser.roleCode} not found, skipping ${testUser.email}...`);
                continue;
            }

            // Get or create position
            let position = await positionRepo.findOneBy({ code: testUser.positionCode });
            if (!position) {
                position = positionRepo.create({
                    name: testUser.positionName,
                    code: testUser.positionCode,
                });
                await positionRepo.save(position);
            }

            // Create user
            const hashedPassword = await bcrypt.hash('password123', 10);
            const user = userRepo.create({
                email: testUser.email,
                password_hash: hashedPassword,
                is_active: true,
                roles: [role],
            });
            const savedUser = await userRepo.save(user);

            // Create staff profile
            const staff = staffRepo.create({
                user: savedUser,
                employee_number: testUser.employeeNumber,
                first_name: testUser.firstName,
                last_name: testUser.lastName,
                status: StaffStatus.ACTIVE,
                probation_status: ProbationStatus.NOT_APPLICABLE,
                position: position,
                branch: branch || undefined,
                hire_date: new Date(),
                confirmation_date: new Date(),
            });
            await staffRepo.save(staff);

            console.log(`Created: ${testUser.email} (${testUser.roleCode}) - password123`);
        }

        console.log('\n=== Test Users Summary ===');
        console.log('Email                     | Role              | Password');
        console.log('--------------------------|-------------------|----------');
        console.log('ceo@kechita.com           | CEO               | password123');
        testUsers.forEach(u => {
            console.log(`${u.email.padEnd(25)} | ${u.roleCode.padEnd(17)} | password123`);
        });

    } catch (err) {
        console.error('Error seeding test users:', err);
    } finally {
        await AppDataSource.destroy();
    }
}

seedTestUsers();
