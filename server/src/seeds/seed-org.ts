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
import { assertSeedingEnabled } from './seed-utils';

dotenv.config();

assertSeedingEnabled('seed-org');

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

const REGIONS = [
    { name: 'Central Region', code: 'CENTRAL' },
    { name: 'Western Region', code: 'WESTERN' },
    { name: 'Eastern Region', code: 'EASTERN' },
    { name: 'Northern Region', code: 'NORTHERN' },
    { name: 'Southern Region', code: 'SOUTHERN' },
];

const BRANCHES = [
    { name: 'Nairobi CBD', code: 'NBO-CBD', region: 'CENTRAL' },
    { name: 'Westlands', code: 'NBO-WST', region: 'CENTRAL' },
    { name: 'Mombasa', code: 'MSA-001', region: 'EASTERN' },
    { name: 'Kisumu', code: 'KSM-001', region: 'WESTERN' },
    { name: 'Nakuru', code: 'NKR-001', region: 'CENTRAL' },
    { name: 'Eldoret', code: 'ELD-001', region: 'NORTHERN' },
    { name: 'Thika', code: 'THK-001', region: 'CENTRAL' },
];

const DEPARTMENTS = [
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Operations', code: 'OPS' },
    { name: 'Credit', code: 'CRD' },
    { name: 'IT', code: 'IT' },
    { name: 'Marketing', code: 'MKT' },
    { name: 'Risk & Compliance', code: 'RISK' },
];

const POSITIONS = [
    { name: 'Chief Executive Officer', code: 'CEO' },
    { name: 'HR Manager', code: 'HR_MGR' },
    { name: 'Regional Manager', code: 'REG_MGR' },
    { name: 'Branch Manager', code: 'BR_MGR' },
    { name: 'Relationship Officer', code: 'RO' },
    { name: 'Accountant', code: 'ACC' },
    { name: 'IT Administrator', code: 'IT_ADMIN' },
    { name: 'Credit Officer', code: 'CRD_OFF' },
    { name: 'Cashier', code: 'CASH' },
    { name: 'Driver', code: 'DRV' },
];

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for seeding org structure...');

    try {
        const regionRepo = AppDataSource.getRepository(Region);
        const branchRepo = AppDataSource.getRepository(Branch);
        const departmentRepo = AppDataSource.getRepository(Department);
        const positionRepo = AppDataSource.getRepository(Position);

        // Seed Regions
        const regionMap: Record<string, Region> = {};
        for (const regData of REGIONS) {
            let region = await regionRepo.findOneBy({ code: regData.code });
            if (!region) {
                region = regionRepo.create(regData);
                region = await regionRepo.save(region);
                console.log(`Created region: ${regData.name}`);
            } else {
                console.log(`Region exists: ${regData.name}`);
            }
            regionMap[regData.code] = region;
        }

        // Seed Branches
        for (const brData of BRANCHES) {
            let branch = await branchRepo.findOneBy({ code: brData.code });
            if (!branch) {
                branch = branchRepo.create({
                    name: brData.name,
                    code: brData.code,
                    region: regionMap[brData.region],
                });
                await branchRepo.save(branch);
                console.log(`Created branch: ${brData.name}`);
            } else {
                console.log(`Branch exists: ${brData.name}`);
            }
        }

        // Seed Departments
        for (const deptData of DEPARTMENTS) {
            let dept = await departmentRepo.findOneBy({ code: deptData.code });
            if (!dept) {
                dept = departmentRepo.create(deptData);
                await departmentRepo.save(dept);
                console.log(`Created department: ${deptData.name}`);
            } else {
                console.log(`Department exists: ${deptData.name}`);
            }
        }

        // Seed Positions
        for (const posData of POSITIONS) {
            let pos = await positionRepo.findOneBy({ code: posData.code });
            if (!pos) {
                pos = positionRepo.create(posData);
                await positionRepo.save(pos);
                console.log(`Created position: ${posData.name}`);
            } else {
                console.log(`Position exists: ${posData.name}`);
            }
        }

        console.log('Org structure seeding complete!');
    } catch (err) {
        console.error(err);
    } finally {
        await AppDataSource.destroy();
    }
}

seed();
