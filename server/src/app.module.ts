import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
// Modules
import { AuthModule } from './auth/auth.module';
import { OrgModule } from './org/org.module';
import { StaffModule } from './staff/staff.module';
import { LeaveModule } from './leave/leave.module';
import { ApprovalModule } from './approval/approval.module';
import { ClaimsModule } from './claims/claims.module';
import { LoansModule } from './loans/loans.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { ReportingModule } from './reporting/reporting.module';
import { NotificationModule } from './notifications/notification.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { PettyCashModule } from './petty-cash/petty-cash.module';
import { CommunicationsModule } from './communications/communications.module';
// Auth Entities
import { User } from './auth/entities/user.entity';
import { Role } from './auth/entities/role.entity';
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
// Org Entities
import { Region } from './org/entities/region.entity';
import { Branch } from './org/entities/branch.entity';
import { Department } from './org/entities/department.entity';
import { Position } from './org/entities/position.entity';
// Staff Entities
import { Staff } from './staff/entities/staff.entity';
import { Document } from './staff/entities/document.entity';
import { DocumentType } from './staff/entities/document-type.entity';
import { StaffDocument } from './staff/entities/staff-document.entity';
import { EmploymentHistory } from './staff/entities/employment-history.entity';
// Onboarding Entities
import { OnboardingTemplate } from './staff/entities/onboarding-template.entity';
import { OnboardingTask } from './staff/entities/onboarding-task.entity';
import { OnboardingInstance } from './staff/entities/onboarding-instance.entity';
import { OnboardingTaskStatus } from './staff/entities/onboarding-task-status.entity';
// Leave Entities
import { LeaveType } from './leave/entities/leave-type.entity';
import { LeaveBalance } from './leave/entities/leave-balance.entity';
import { LeaveRequest } from './leave/entities/leave-request.entity';
import { PublicHoliday } from './leave/entities/public-holiday.entity';
// Approval Entities
import { ApprovalFlow } from './approval/entities/approval-flow.entity';
import { ApprovalFlowStep } from './approval/entities/approval-flow-step.entity';
import { ApprovalInstance } from './approval/entities/approval-instance.entity';
import { ApprovalAction } from './approval/entities/approval-action.entity';
// Claims Entities
import { ClaimType } from './claims/entities/claim-type.entity';
import { Claim } from './claims/entities/claim.entity';
import { ClaimItem } from './claims/entities/claim-item.entity';
// Loans Entities
import { StaffLoan } from './loans/entities/staff-loan.entity';
import { StaffLoanRepayment } from './loans/entities/staff-loan-repayment.entity';
// Recruitment Entities
import { JobPost } from './recruitment/entities/job-post.entity';
import { PipelineStage } from './recruitment/entities/pipeline-stage.entity';
import { Candidate } from './recruitment/entities/candidate.entity';
import { Application } from './recruitment/entities/application.entity';
import { Interview } from './recruitment/entities/interview.entity';
import { Offer } from './recruitment/entities/offer.entity';
import { CandidateNote } from './recruitment/entities/candidate-note.entity';
import { BackgroundCheck } from './recruitment/entities/background-check.entity';
import { ReferenceCheck } from './recruitment/entities/reference-check.entity';
import { OfferSignature } from './recruitment/entities/offer-signature.entity';
// Reporting Entities
import { BranchDailyReport } from './reporting/entities/branch-daily-report.entity';
// Notification Entities
import { Notification } from './notifications/entities/notification.entity';
import { NotificationPreference } from './notifications/entities/notification-preference.entity';
// Audit Entities
import { AuditLog } from './audit/entities/audit-log.entity';
// Petty Cash Entities
import { PettyCashFloat } from './petty-cash/entities/petty-cash-float.entity';
import { PettyCashTransaction } from './petty-cash/entities/petty-cash-transaction.entity';
import { PettyCashReplenishment } from './petty-cash/entities/petty-cash-replenishment.entity';
import { PettyCashReconciliation } from './petty-cash/entities/petty-cash-reconciliation.entity';
// Communications Entities
import { Announcement, AnnouncementRead } from './communications/entities/announcement.entity';

const shouldSynchronize = (() => {
  const fromEnv = process.env.DB_SYNCHRONIZE;
  if (fromEnv === 'true') return true;
  if (fromEnv === 'false') return false;
  return process.env.NODE_ENV !== 'production';
})();

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [
        // Auth
        User, Role, PasswordResetToken, RefreshToken,
        // Org
        Region, Branch, Department, Position,
        // Staff
        Staff, Document, DocumentType, StaffDocument, EmploymentHistory,
        // Onboarding
        OnboardingTemplate, OnboardingTask, OnboardingInstance, OnboardingTaskStatus,
        // Leave
        LeaveType, LeaveBalance, LeaveRequest, PublicHoliday,
        // Approval
        ApprovalFlow, ApprovalFlowStep, ApprovalInstance, ApprovalAction,
        // Claims
        ClaimType, Claim, ClaimItem,
        // Loans
        StaffLoan, StaffLoanRepayment,
        // Recruitment
        JobPost, PipelineStage, Candidate, Application, Interview, Offer, CandidateNote,
        BackgroundCheck, ReferenceCheck, OfferSignature,
        // Reporting
        BranchDailyReport,
        // Notifications
        Notification, NotificationPreference,
        // Audit
        AuditLog,
        // Petty Cash
        PettyCashFloat, PettyCashTransaction, PettyCashReplenishment, PettyCashReconciliation,
        // Communications
        Announcement, AnnouncementRead,
      ],
      synchronize: shouldSynchronize,
    }),
    AuthModule,
    OrgModule,
    StaffModule,
    LeaveModule,
    ApprovalModule,
    ClaimsModule,
    LoansModule,
    RecruitmentModule,
    ReportingModule,
    NotificationModule,
    AuditModule,
    EmailModule,
    PettyCashModule,
    CommunicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
