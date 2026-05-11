import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { standardMulterOptions } from '../common/multer/multer.config';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { DocumentController } from './document.controller';
import { OnboardingController } from './onboarding.controller';
import { StaffPeopleController } from './staff-people.controller';
import { DocumentService } from './services/document.service';
import { OnboardingService } from './services/onboarding.service';
import { DocumentExpiryScheduler } from './services/document-expiry.scheduler';
import { StaffPeopleService } from './services/staff-people.service';
import { StaffProbationScheduler } from './services/staff-probation.scheduler';
import { NotificationModule } from '../notifications/notification.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

// Staff Entities
import { Staff } from './entities/staff.entity';
import { Document } from './entities/document.entity';
import { DocumentType } from './entities/document-type.entity';
import { StaffDocument } from './entities/staff-document.entity';
import { EmploymentHistory } from './entities/employment-history.entity';
import { StaffContract } from './entities/staff-contract.entity';
import { NextOfKin } from './entities/next-of-kin.entity';
import { Dependent } from './entities/dependent.entity';
import { ProbationReview } from './entities/probation-review.entity';
import { SalaryHistory } from './entities/salary-history.entity';
import { ContractService } from './services/contract.service';
import { BulkImportService } from './services/bulk-import.service';

// Onboarding Entities
import { OnboardingTemplate } from './entities/onboarding-template.entity';
import { OnboardingTask } from './entities/onboarding-task.entity';
import { OnboardingInstance } from './entities/onboarding-instance.entity';
import { OnboardingTaskStatus } from './entities/onboarding-task-status.entity';

// Auth Entities (for staff creation)
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';

// Org Entities (for relations)
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { Position } from '../org/entities/position.entity';

// Recruitment (for JD in contracts)
import { JobPost } from '../recruitment/entities/job-post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Staff domain
      Staff,
      Document,
      DocumentType,
      StaffDocument,
      EmploymentHistory,
      StaffContract,
      NextOfKin,
      Dependent,
      ProbationReview,
      SalaryHistory,
      // Onboarding domain
      OnboardingTemplate,
      OnboardingTask,
      OnboardingInstance,
      OnboardingTaskStatus,
      // Auth (for staff creation)
      User,
      Role,
      // Org
      Region,
      Branch,
      Department,
      Position,
      // Recruitment
      JobPost,
    ]),
    MulterModule.register(standardMulterOptions),
    NotificationModule,
    AuthModule,
    AuditModule,
  ],
  controllers: [StaffController, DocumentController, OnboardingController, StaffPeopleController],
  providers: [StaffService, DocumentService, OnboardingService, ContractService, DocumentExpiryScheduler, BulkImportService, StaffPeopleService, StaffProbationScheduler],
  exports: [StaffService, DocumentService, OnboardingService, ContractService, DocumentExpiryScheduler, BulkImportService, StaffPeopleService],
})
export class StaffModule { }
