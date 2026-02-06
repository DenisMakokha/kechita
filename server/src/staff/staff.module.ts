import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { DocumentController } from './document.controller';
import { OnboardingController } from './onboarding.controller';
import { DocumentService } from './services/document.service';
import { OnboardingService } from './services/onboarding.service';
import { DocumentExpiryScheduler } from './services/document-expiry.scheduler';
import { NotificationModule } from '../notifications/notification.module';

// Staff Entities
import { Staff } from './entities/staff.entity';
import { Document } from './entities/document.entity';
import { DocumentType } from './entities/document-type.entity';
import { StaffDocument } from './entities/staff-document.entity';
import { EmploymentHistory } from './entities/employment-history.entity';

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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Staff domain
      Staff,
      Document,
      DocumentType,
      StaffDocument,
      EmploymentHistory,
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
    ]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
    NotificationModule,
  ],
  controllers: [StaffController, DocumentController, OnboardingController],
  providers: [StaffService, DocumentService, OnboardingService, DocumentExpiryScheduler],
  exports: [StaffService, DocumentService, OnboardingService, DocumentExpiryScheduler],
})
export class StaffModule { }
