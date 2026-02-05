import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { Position } from '../org/entities/position.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Document } from '../staff/entities/document.entity';
import { StaffDocument } from '../staff/entities/staff-document.entity';
import { EmploymentHistory } from '../staff/entities/employment-history.entity';
import { LeaveType } from '../leave/entities/leave-type.entity';
import { LeaveBalance } from '../leave/entities/leave-balance.entity';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
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
        Staff, Document, StaffDocument, EmploymentHistory,
        LeaveType, LeaveBalance, LeaveRequest,
        ApprovalFlow, ApprovalFlowStep, ApprovalInstance, ApprovalAction,
        ClaimType, Claim, ClaimItem,
        StaffLoan, StaffLoanRepayment,
        JobPost, PipelineStage, Candidate, Application, Interview, Offer,
        BranchDailyReport,
    ],
    synchronize: true,
});

const PIPELINE_STAGES = [
    { code: 'APPLIED', name: 'Applied', position: 1, is_terminal: false, is_success: false },
    { code: 'SCREENING', name: 'Screening', position: 2, is_terminal: false, is_success: false },
    { code: 'INTERVIEW', name: 'Interview', position: 3, is_terminal: false, is_success: false },
    { code: 'OFFER', name: 'Offer', position: 4, is_terminal: false, is_success: false },
    { code: 'HIRED', name: 'Hired', position: 5, is_terminal: true, is_success: true },
    { code: 'REJECTED', name: 'Rejected', position: 6, is_terminal: true, is_success: false },
];

const CLAIM_TYPES = [
    { code: 'PER_DIEM', name: 'Per Diem' },
    { code: 'FUEL', name: 'Fuel Allowance' },
    { code: 'MEDICAL', name: 'Medical Expense' },
    { code: 'RELOCATION', name: 'Relocation Allowance' },
    { code: 'AIR_TICKET', name: 'Air Ticket' },
    { code: 'COMMUNICATION', name: 'Communication Allowance' },
];

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for seeding recruitment & claims...');

    try {
        const stageRepo = AppDataSource.getRepository(PipelineStage);
        const claimTypeRepo = AppDataSource.getRepository(ClaimType);

        // Seed Pipeline Stages
        for (const stageData of PIPELINE_STAGES) {
            const existing = await stageRepo.findOneBy({ code: stageData.code });
            if (!existing) {
                const stage = stageRepo.create(stageData);
                await stageRepo.save(stage);
                console.log(`Created pipeline stage: ${stageData.code}`);
            } else {
                console.log(`Pipeline stage exists: ${stageData.code}`);
            }
        }

        // Seed Claim Types
        for (const ctData of CLAIM_TYPES) {
            const existing = await claimTypeRepo.findOneBy({ code: ctData.code });
            if (!existing) {
                const ct = claimTypeRepo.create(ctData);
                await claimTypeRepo.save(ct);
                console.log(`Created claim type: ${ctData.code}`);
            } else {
                console.log(`Claim type exists: ${ctData.code}`);
            }
        }

        console.log('Seeding complete!');
    } catch (err) {
        console.error(err);
    } finally {
        await AppDataSource.destroy();
    }
}

seed();
