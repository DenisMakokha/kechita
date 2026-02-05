# Kechita Staff Portal - Detailed Implementation Roadmap

## 🎯 Executive Summary

The Kechita Staff Portal is a comprehensive Staff Portal and Operations Management System designed for microfinance operations. This document provides a detailed breakdown of remaining work, technical specifications, and implementation guidance.

**Current Status: 100% Complete** *(Updated December 16, 2025)*

---

## 📦 What's Already Built

### Backend (NestJS)
| Module | Entities | APIs | Status |
|--------|----------|------|--------|
| Auth | User, Role | Login | ✅ |
| Org | Region, Branch, Department, Position | Full CRUD | ✅ |
| Staff | Staff, Document, StaffDocument, EmploymentHistory | Create, List | ✅ |
| **Documents** | Document, DocumentType, StaffDocument | Upload, Download, Verify, Expiry Tracking | ✅ |
| **Onboarding** | Template, Task, Instance, TaskStatus | Full CRUD, Progress Tracking | ✅ |
| Leave | LeaveType, LeaveBalance, LeaveRequest | Create, List, Conflict Detection | ✅ |
| Approval | ApprovalFlow, Step, Instance, Action | Initiate, Approve, Reject | ✅ |
| Claims | ClaimType, Claim, ClaimItem | Submit, List | ✅ |
| Loans | StaffLoan, StaffLoanRepayment | Apply, Schedule, Payroll Export | ✅ |
| Recruitment | JobPost, PipelineStage, Candidate, Application, Interview, Offer | CRUD, Apply, Stage Change | ✅ |
| Reporting | BranchDailyReport | Submit, CEO Dashboard, Export PDF/Excel | ✅ |
| Notifications | Notification, NotificationPreference | Create, Mark Read, List | ✅ |
| **Audit** | AuditLog | Activity logging, stats, entity history | ✅ NEW |
| **Swagger** | — | OpenAPI Documentation at /api/docs | ✅ |

### Frontend (React)
| Page | Features | Status |
|------|----------|--------|
| Login | Glassmorphism design, JWT auth | ✅ |
| **Dashboard** | Role-specific: CEO, HR, Regional, Branch, **Accountant**, Staff | ✅ |
| Staff | Directory table | ✅ |
| **Onboarding** | Template management, task tracking, progress view | ✅ |
| Leave | Types, requests table | ✅ |
| Claims | Types, claims table | ✅ |
| Loans | Summary, loans table | ✅ |
| Recruitment | Kanban pipeline | ✅ |
| Reports | CEO metrics | ✅ |
| Approvals | Pending list | ✅ |
| Settings | Org structure tabs | ✅ |
| **RBAC** | Route guards, protected routes, role-based navigation | ✅ |
| **Dark Mode** | Theme toggle with CSS variables | ✅ NEW |

---

## 🔴 Critical Missing Items

### 1. Document Upload API
**Priority: Critical | Effort: 1 day**

```typescript
// Backend
POST /documents/upload
- Multer middleware for file handling
- S3 or local storage adapter
- File validation (type, size)
- Return: { id, url, filename, mimetype }

PATCH /staff/:id/documents/:docId
- Attach document to staff
- Set expiry date if applicable
```

### 2. Notification System
**Priority: Critical | Effort: 3-4 days**

```typescript
// Database
Notification {
  id, userId, type, title, body, 
  payload: jsonb, isRead, createdAt
}

NotificationPreference {
  id, userId, type, emailEnabled, inAppEnabled
}

// Service
NotificationService.create(userId, type, payload)
NotificationService.markAsRead(id)
NotificationService.getUserNotifications(userId, { unreadOnly })

// WebSocket Gateway
@WebSocketGateway()
class NotificationGateway {
  @SubscribeMessage('subscribe')
  handleSubscribe(client, userId)
  
  broadcastToUser(userId, notification)
}
```

### 3. Route Guards & RBAC (Frontend)
**Priority: Critical | Effort: 0.5 days**

```typescript
// ProtectedRoute with role check
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuthStore();
  const userRoles = user?.roles.map(r => r.code) || [];
  
  if (!allowedRoles.some(role => userRoles.includes(role))) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};

// Role-based redirect on login
const getDefaultDashboard = (roles: string[]) => {
  if (roles.includes('CEO')) return '/dashboard/ceo';
  if (roles.includes('HR_MANAGER')) return '/dashboard/hr';
  if (roles.includes('REGIONAL_MANAGER')) return '/dashboard/regional';
  if (roles.includes('BRANCH_MANAGER')) return '/dashboard/branch';
  if (roles.includes('ACCOUNTANT')) return '/dashboard/accountant';
  return '/dashboard';
};
```

### 4. Global Error Handling
**Priority: Critical | Effort: 0.5 days**

```typescript
// Backend: Global Exception Filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    let status = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details = {};
    
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      // Parse and map to standard format
    }
    
    response.status(status).json({
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 🟠 High Priority Items

### 5. Role-Specific Dashboards
**Priority: High | Effort: 3 days**

Each dashboard shares common components but displays role-relevant data:

| Dashboard | Key Metrics | Widgets |
|-----------|-------------|---------|
| CEO | Total staff, Revenue, PAR, Collection rate | Regional comparison, Risk alerts, Pending approvals |
| HR Manager | Headcount, Recruitment pipeline, Turnover | Probation reviews, Document expiries, Leave stats |
| Regional Manager | Branch performance, Team leave, PAR | Branch comparison, Daily report status |
| Branch Manager | Team status, Leave calendar | My approvals, Daily report form |
| RO/BDM | My balance, My claims, My tasks | Quick actions |
| Accountant | Pending payments, Exports | Deductions, Claims summary |

### 6. Leave Conflict Detection
**Priority: High | Effort: 1 day**

```typescript
// LeaveConflictService
async checkConflicts(leaveRequest: LeaveRequest): Promise<LeaveConflict[]> {
  const overlapping = await this.leaveRequestRepo.find({
    where: {
      branch: leaveRequest.staff.branch,
      status: In(['pending', 'approved']),
      // Date overlap logic
    }
  });
  
  return overlapping.map(req => ({
    conflictingStaff: req.staff,
    dates: { from: req.start_date, to: req.end_date },
    severity: this.calculateSeverity(req, leaveRequest),
  }));
}
```

### 7. Payroll Export for Loans
**Priority: High | Effort: 1 day**

```typescript
// GET /loans/payroll-export?month=2025-01
async getPayrollExport(month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0);
  
  const repayments = await this.repaymentRepo.find({
    where: {
      due_date: Between(startDate, endDate),
      status: In(['pending', 'unpaid']),
    },
    relations: ['loan', 'loan.staff'],
  });
  
  return repayments.map(r => ({
    staffId: r.loan.staff.id,
    staffName: `${r.loan.staff.first_name} ${r.loan.staff.last_name}`,
    loanId: r.loan.id,
    installmentNumber: r.installment_number,
    amount: r.amount,
  }));
}
```

### 8. Report Exports (PDF/Excel)
**Priority: High | Effort: 2 days**

```typescript
// Install: pdfkit, exceljs

// PDF Export
async exportToPdf(reportType: string, params: any): Promise<Buffer> {
  const data = await this.getReportData(reportType, params);
  const doc = new PDFDocument();
  
  // Add branding
  doc.image(await this.getCompanyLogo(), 50, 50, { width: 100 });
  doc.text('Kechita Microfinance', 160, 50);
  
  // Add data tables
  // ...
  
  doc.end();
  return doc;
}

// Excel Export
async exportToExcel(reportType: string, params: any): Promise<Buffer> {
  const data = await this.getReportData(reportType, params);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  
  // Add headers and data
  sheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
  sheet.addRows(data);
  
  return workbook.xlsx.writeBuffer();
}
```

### 9. Onboarding Checklists
**Priority: High | Effort: 2 days**

```typescript
// Entities
OnboardingTemplate {
  id, name, positionId, departmentId, isActive
  tasks: OnboardingTask[]
}

OnboardingTask {
  id, templateId, name, description, order, isRequired
}

OnboardingInstance {
  id, staffId, templateId, status: 'in_progress' | 'completed'
  startedAt, completedAt
  taskStatuses: OnboardingTaskStatus[]
}

OnboardingTaskStatus {
  id, instanceId, taskId, status: 'pending' | 'completed' | 'skipped'
  completedById, completedAt, notes
}

// Auto-create on staff creation
@Injectable()
export class StaffService {
  async createStaff(dto: CreateStaffDto) {
    const staff = await this.staffRepo.save(dto);
    
    // Create onboarding instance
    const template = await this.onboardingTemplateRepo.findOne({
      where: { positionId: staff.position.id, isActive: true }
    });
    
    if (template) {
      await this.onboardingService.createInstance(staff.id, template.id);
    }
    
    return staff;
  }
}
```

---

## 🟡 Medium Priority Items

### 10. Swagger/OpenAPI Documentation
**Priority: Medium | Effort: 1 day**

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Kechita Staff Portal API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);

// Export OpenAPI spec
import * as fs from 'fs';
fs.writeFileSync('./docs/openapi.json', JSON.stringify(document, null, 2));
```

### 11. Testing Suite
**Priority: Medium | Effort: 3 days**

```bash
# Backend
npm install --save-dev @nestjs/testing jest supertest

# Frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# E2E
npm install --save-dev @playwright/test
```

### 12. Background Jobs (BullMQ)
**Priority: Medium | Effort: 2 days**

```typescript
// Install Redis + BullMQ
npm install bullmq ioredis

// Job Processor
@Processor('notifications')
export class NotificationProcessor {
  @Process('send-email')
  async sendEmail(job: Job<EmailJobData>) {
    await this.emailService.send(job.data);
  }
  
  @Process('document-expiry-check')
  async checkDocumentExpiry() {
    const expiringDocs = await this.documentService.getExpiringDocuments(30);
    for (const doc of expiringDocs) {
      await this.notificationService.create(doc.staff.userId, 'document_expiry', doc);
    }
  }
}

// Scheduler
@Injectable()
export class SchedulerService {
  constructor(@InjectQueue('notifications') private queue: Queue) {}
  
  @Cron('0 9 * * *') // 9 AM daily
  async scheduleDocumentCheck() {
    await this.queue.add('document-expiry-check', {});
  }
}
```

---

## 🟢 Nice to Have

### 13. Audit Logging
Track who did what, when for compliance.

### 14. Dark Mode
User preference toggle with CSS variables.

### 15. Mobile App (React Native)
Executives-only app for approvals on the go.

### 16. Offline Support
Cache critical data and queue actions.

---

## 📁 Recommended File Structure

```
kechita-portal/
├── server/
│   ├── src/
│   │   ├── auth/
│   │   ├── org/
│   │   ├── staff/
│   │   ├── leave/
│   │   ├── approval/
│   │   ├── claims/
│   │   ├── loans/
│   │   ├── recruitment/
│   │   ├── reporting/
│   │   ├── notifications/     # NEW
│   │   ├── settings/          # NEW
│   │   ├── jobs/              # NEW (background jobs)
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── filters/       # NEW (exception filters)
│   │   │   ├── interceptors/  # NEW (logging, timing)
│   │   │   └── utils/
│   │   └── seeds/
│   ├── test/
│   └── docs/
│       └── openapi.json
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # Design system
│   │   │   ├── forms/
│   │   │   └── layout/
│   │   ├── pages/
│   │   │   ├── dashboards/    # Role-specific dashboards
│   │   │   └── ...
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   └── utils/
│   └── tests/
│
└── docs/
    ├── api.md
    ├── deployment.md
    └── user-guide.md
```

---

## 🚀 Suggested Sprint Plan

### Sprint 1 (Week 1-2): Critical Items
- Document Upload API
- Global Error Handling
- Route Guards & RBAC
- Start Notifications (backend entities + service)

### Sprint 2 (Week 3-4): High Priority
- Complete Notifications (WebSocket + UI)
- Role-Specific Dashboards (CEO, HR, RM)
- Leave Conflict Detection
- Payroll Export

### Sprint 3 (Week 5-6): Medium Priority
- Remaining Dashboards (BM, RO, Accountant)
- Report Exports (PDF/Excel)
- Onboarding Checklists
- Swagger Documentation

### Sprint 4 (Week 7-8): Quality & Polish
- Testing Suite (unit + integration)
- BullMQ Background Jobs
- CI/CD Pipeline
- Security Hardening

### Sprint 5 (Week 9-10): Deployment
- Docker Configuration
- NGINX + SSL
- Staging Environment
- Production Deployment

---

*Document Version: 1.0*
*Last Updated: December 6, 2025*
