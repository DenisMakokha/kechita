import { Module, BadRequestException } from '@nestjs/common';
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
import { StaffContract } from './entities/staff-contract.entity';
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
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
      fileFilter: (req, file, callback) => {
        // Whitelist of allowed MIME types
        const allowedMimes = [
          // Images
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
          // Documents
          'application/pdf',
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/vnd.ms-excel', // .xls
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'text/plain', // .txt
          // Archives (optional, for bulk uploads)
          'application/zip',
          'application/x-zip-compressed',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `File type '${file.mimetype}' is not allowed. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, Word, Excel, and ZIP files.`
            ),
            false
          );
        }
      },
    }),
    NotificationModule,
  ],
  controllers: [StaffController, DocumentController, OnboardingController],
  providers: [StaffService, DocumentService, OnboardingService, ContractService, DocumentExpiryScheduler, BulkImportService],
  exports: [StaffService, DocumentService, OnboardingService, ContractService, DocumentExpiryScheduler, BulkImportService],
})
export class StaffModule { }
