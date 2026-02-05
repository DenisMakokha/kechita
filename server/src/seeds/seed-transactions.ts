import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../auth/entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';
import { LeaveRequest, LeaveRequestStatus } from '../leave/entities/leave-request.entity';
import { LeaveType } from '../leave/entities/leave-type.entity';
import { LeaveBalance } from '../leave/entities/leave-balance.entity';
import { Claim, ClaimStatus } from '../claims/entities/claim.entity';
import { ClaimType } from '../claims/entities/claim-type.entity';
import { ClaimItem, ClaimItemStatus } from '../claims/entities/claim-item.entity';
import { StaffLoan, LoanType, LoanStatus } from '../loans/entities/staff-loan.entity';
import { StaffLoanRepayment } from '../loans/entities/staff-loan-repayment.entity';
import { ApprovalFlow } from '../approval/entities/approval-flow.entity';
import { faker } from '@faker-js/faker';

// Import other required entities for TypeORM generic connection
import { Role } from '../auth/entities/role.entity';
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
import { PublicHoliday } from '../leave/entities/public-holiday.entity';
import { ApprovalFlowStep } from '../approval/entities/approval-flow-step.entity';
import { ApprovalInstance } from '../approval/entities/approval-instance.entity';
import { ApprovalAction } from '../approval/entities/approval-action.entity';
import { JobPost } from '../recruitment/entities/job-post.entity';
import { PipelineStage } from '../recruitment/entities/pipeline-stage.entity';
import { Candidate } from '../recruitment/entities/candidate.entity';
import { Application } from '../recruitment/entities/application.entity';
import { Interview } from '../recruitment/entities/interview.entity';
import { Offer } from '../recruitment/entities/offer.entity';
import { BranchDailyReport } from '../reporting/entities/branch-daily-report.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationPreference } from '../notifications/entities/notification-preference.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

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
        Staff, Document, DocumentType, StaffDocument, EmploymentHistory, OnboardingTemplate, OnboardingTask, OnboardingInstance, OnboardingTaskStatus,
        LeaveType, LeaveBalance, LeaveRequest, PublicHoliday,
        ApprovalFlow, ApprovalFlowStep, ApprovalInstance, ApprovalAction,
        ClaimType, Claim, ClaimItem,
        StaffLoan, StaffLoanRepayment,
        JobPost, PipelineStage, Candidate, Application, Interview, Offer,
        BranchDailyReport, Notification, NotificationPreference, AuditLog
    ],
    synchronize: false,
});

async function seedTransactions() {
    await AppDataSource.initialize();
    console.log('Database connected for transaction seeding...');

    try {
        const staffRepo = AppDataSource.getRepository(Staff);
        const leaveRequestRepo = AppDataSource.getRepository(LeaveRequest);
        const leaveTypeRepo = AppDataSource.getRepository(LeaveType);
        const claimRepo = AppDataSource.getRepository(Claim);
        const claimTypeRepo = AppDataSource.getRepository(ClaimType);
        const claimItemRepo = AppDataSource.getRepository(ClaimItem);
        const loanRepo = AppDataSource.getRepository(StaffLoan);

        // Fetch all staff
        const allStaff = await staffRepo.find({ relations: ['user'] });
        console.log(`Found ${allStaff.length} staff members.`);

        if (allStaff.length === 0) {
            console.log("No staff found! Run seed-test-users.ts first.");
            return;
        }

        const leaveTypes = await leaveTypeRepo.find();
        const claimTypes = await claimTypeRepo.find();

        if (leaveTypes.length === 0 || claimTypes.length === 0) {
            console.log("Missing leave/claim types. Run seed-claims-loans.ts first.");
        }

        // SEED LEAVE REQUESTS
        console.log("Seeding Leave Requests...");
        for (const staff of allStaff) {
            const numRequests = faker.number.int({ min: 1, max: 3 });

            for (let i = 0; i < numRequests; i++) {
                const leaveType = faker.helpers.arrayElement(leaveTypes);
                const startDate = faker.date.between({ from: '2025-01-01', to: '2025-12-31' });
                const days = faker.number.int({ min: 1, max: 5 });
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + days);

                const status = faker.helpers.arrayElement([
                    LeaveRequestStatus.APPROVED,
                    LeaveRequestStatus.PENDING,
                    LeaveRequestStatus.REJECTED
                ]);

                const request = leaveRequestRepo.create({
                    staff: staff,
                    leaveType: leaveType,
                    start_date: startDate,
                    end_date: endDate,
                    total_days: days,
                    reason: faker.lorem.sentence(),
                    status: status,
                } as any);
                await leaveRequestRepo.save(request);
            }
        }
        console.log("✅ Leave Requests seeded.");

        // SEED CLAIMS
        console.log("Seeding Claims...");
        for (const staff of allStaff) {
            const numClaims = faker.number.int({ min: 1, max: 4 });
            for (let i = 0; i < numClaims; i++) {
                const claimType = FakerClaimType(claimTypes);
                const amount = faker.number.int({ min: 1000, max: 20000 });
                const status = faker.helpers.arrayElement([
                    ClaimStatus.APPROVED,
                    ClaimStatus.SUBMITTED,
                    ClaimStatus.DRAFT
                ]);

                const claim = claimRepo.create({
                    staff: staff,
                    claim_number: `CLM-${faker.string.alphanumeric(8).toUpperCase()}`,
                    claim_date: faker.date.past(),
                    total_amount: amount,
                    approved_amount: status === ClaimStatus.APPROVED ? amount : 0,
                    paid_amount: 0,
                    purpose: faker.lorem.sentence(),
                    remarks: faker.lorem.sentence(),
                    status: status,
                    currency: 'KES',
                } as any);
                const savedClaim = await claimRepo.save(claim);

                // Add Item
                const item = claimItemRepo.create({
                    claim: savedClaim,
                    claimType: claimType, // Correct relation
                    description: claimType.name,
                    amount: amount,
                    approved_amount: status === ClaimStatus.APPROVED ? amount : 0,
                    quantity: 1,
                    status: status === ClaimStatus.APPROVED ? ClaimItemStatus.APPROVED : ClaimItemStatus.PENDING,
                } as any);
                await claimItemRepo.save(item);
            }
        }
        console.log("✅ Claims seeded.");

        // SEED LOANS
        console.log("Seeding Loans...");
        for (const staff of allStaff.slice(0, Math.floor(allStaff.length / 2))) {
            const amount = faker.number.int({ min: 50000, max: 500000 });
            const status = faker.helpers.arrayElement([
                LoanStatus.ACTIVE,
                LoanStatus.PENDING,
                LoanStatus.COMPLETED
            ]);

            const loan = loanRepo.create({
                staff: staff,
                loan_number: `LN-${faker.string.numeric(6)}`,
                loan_type: LoanType.STAFF_LOAN,
                principal: amount,
                total_payable: amount * 1.12, // Simple interest calc (approx)
                total_paid: status === LoanStatus.COMPLETED ? amount * 1.12 : (status === LoanStatus.ACTIVE ? amount * 0.2 : 0),
                outstanding_balance: status === LoanStatus.COMPLETED ? 0 : (status === LoanStatus.ACTIVE ? amount * 0.92 : amount * 1.12),
                interest_rate: 12,
                term_months: 12,
                purpose: 'Personal Development',
                status: status,
                application_date: faker.date.past(),
                disbursement_date: status === LoanStatus.ACTIVE || status === LoanStatus.COMPLETED ? faker.date.past() : null,
            } as any);
            await loanRepo.save(loan);
        }
        console.log("✅ Loans seeded.");

    } catch (err) {
        console.error("Error seeding transactions:", err);
    } finally {
        await AppDataSource.destroy();
    }
}

function FakerClaimType(types: any[]) {
    if (!types || types.length === 0) {
        return { name: 'General', id: 'uuid' } as any;
    }
    return faker.helpers.arrayElement(types);
}

seedTransactions();
