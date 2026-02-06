# Kechita Staff Portal - Codebase Analysis

**Generated:** February 2026  
**Purpose:** Reference document before production implementation

---

## 1. Project Overview

The Kechita Staff Portal is a comprehensive HR management system for a microfinance organization. It handles recruitment, staff management, leave, claims, loans, approvals, and reporting.

### Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | NestJS 11, TypeORM, PostgreSQL |
| **Frontend** | React 18, TypeScript, TailwindCSS, React Query |
| **Auth** | JWT with Passport.js |
| **Email** | Nodemailer |
| **Reports** | ExcelJS, PDFKit |

---

## 2. Backend Architecture

### 2.1 Module Structure

```
server/src/
├── auth/           # Authentication, JWT, roles
├── org/            # Regions, branches, departments, positions
├── staff/          # Staff profiles, documents, onboarding
├── leave/          # Leave types, balances, requests, holidays
├── approval/       # Generic approval workflows
├── claims/         # Expense claims and reimbursements
├── loans/          # Staff loans and repayments
├── recruitment/    # ATS: jobs, candidates, interviews, offers
├── reporting/      # KPIs, branch reports, dashboards
├── notifications/  # In-app, email, SMS notifications
├── petty-cash/     # Float management, transactions
├── communications/ # Announcements
├── email/          # Email templates and sending
├── sms/            # SMS service
├── audit/          # Audit logging
├── common/         # Guards, decorators, utilities
└── seeds/          # Database seed scripts
```

### 2.2 Entity Relationships

```
User (1) ←→ (1) Staff
User (M) ←→ (M) Role

Staff (M) → (1) Region
Staff (M) → (1) Branch
Staff (M) → (1) Department
Staff (M) → (1) Position
Staff (M) → (1) Staff [manager]

LeaveRequest (M) → (1) Staff
LeaveRequest (M) → (1) LeaveType
LeaveBalance (M) → (1) Staff + LeaveType + Year

ApprovalInstance (M) → (1) ApprovalFlow
ApprovalInstance → target_type + target_id (polymorphic)
ApprovalAction (M) → (1) ApprovalInstance

Claim (M) → (1) Staff
ClaimItem (M) → (1) Claim

StaffLoan (M) → (1) Staff
StaffLoanRepayment (M) → (1) StaffLoan

Application (M) → (1) Candidate + JobPost
Interview (M) → (1) Application
Offer (M) → (1) Application
```

### 2.3 Defined Roles

| Code | Name | Permissions |
|------|------|-------------|
| `CEO` | Chief Executive Officer | Full access, final approvals |
| `HR_MANAGER` | HR Manager | Staff management, recruitment |
| `REGIONAL_ADMIN` | Regional Admin | Regional oversight |
| `HR_ASSISTANT` | HR Assistant | HR support tasks |
| `REGIONAL_MANAGER` | Regional Manager | Regional operations |
| `BRANCH_MANAGER` | Branch Manager | Branch operations |
| `RELATIONSHIP_OFFICER` | Relationship Officer | Field operations |
| `BDM` | Business Development Manager | Sales |
| `ACCOUNTANT` | Accountant | Finance, loans, claims |

---

## 3. Key Patterns & Conventions

### 3.1 Controller Pattern

```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourceController {
    constructor(private readonly service: ResourceService) {}

    @Get()
    @Roles('CEO', 'HR_MANAGER')
    findAll() { ... }

    @Post()
    create(@Body() dto: CreateDto, @Req() req: AuthenticatedRequest) { ... }
}
```

### 3.2 Service Pattern

- Uses constructor injection with `@InjectRepository`
- Transactions via `DataSource.createQueryRunner()`
- Event emission via `EventEmitter2`
- DTOs defined as interfaces within service files

### 3.3 Authentication Flow

1. `POST /auth/login` → validates credentials → returns JWT
2. JWT contains: `{ sub, email, roles[] }`
3. `JwtStrategy` validates and attaches user to request
4. `RolesGuard` checks `@Roles()` decorator

### 3.4 Approval Workflow Pattern

1. Request created (leave, claim, loan)
2. `ApprovalService.initiateApproval()` creates instance
3. Instance tracks `current_step_order` and `current_approver_role`
4. `approveStep()` / `rejectStep()` progress workflow
5. `approval.completed` event emitted on resolution
6. Domain service listens via `@OnEvent('approval.completed')`

### 3.5 Type Safety Pattern (Recently Fixed)

```typescript
// AuthenticatedRequest type for typed JWT access
export type AuthenticatedRequest = Request & { user: JwtPayload };

// Usage in controllers
@Get('me')
getMe(@Req() req: AuthenticatedRequest) {
    return req.user.id; // Typed!
}
```

---

## 4. Frontend Architecture

### 4.1 Structure

```
client/src/
├── components/
│   ├── auth/        # ProtectedRoute, role checks
│   ├── notifications/
│   ├── recruitment/
│   ├── reporting/
│   └── ui/          # Reusable components
├── layouts/
│   ├── DashboardLayout.tsx
│   └── PublicLayout.tsx
├── lib/
│   └── api.ts       # Axios instance with interceptors
├── pages/
│   ├── dashboards/  # Role-specific dashboards
│   └── public/      # Careers, job applications
└── store/
    └── auth.store.ts # Zustand auth state
```

### 4.2 State Management

- **Auth**: Zustand with persist middleware
- **Data**: React Query (TanStack Query)
- **Forms**: Local state with controlled components

### 4.3 API Integration

```typescript
// api.ts pattern
const api = axios.create({ baseURL: VITE_API_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
```

### 4.4 Route Protection

```typescript
<ProtectedRoute allowedRoles={ROLE_GROUPS.HR}>
    <StaffPage />
</ProtectedRoute>
```

---

## 5. Database Schema Summary

### 5.1 Core Tables (46 entities)

**Auth & Org:**
- `users`, `roles`, `user_roles`
- `regions`, `branches`, `departments`, `positions`

**Staff:**
- `staff`, `documents`, `document_types`, `staff_documents`
- `employment_history`
- `onboarding_templates`, `onboarding_tasks`, `onboarding_instances`, `onboarding_task_statuses`

**Leave:**
- `leave_types`, `leave_balances`, `leave_requests`, `public_holidays`

**Approvals:**
- `approval_flows`, `approval_flow_steps`, `approval_instances`, `approval_actions`

**Claims:**
- `claim_types`, `claims`, `claim_items`

**Loans:**
- `staff_loans`, `staff_loan_repayments`

**Recruitment:**
- `job_posts`, `pipeline_stages`, `candidates`, `applications`
- `interviews`, `offers`, `offer_signatures`
- `candidate_notes`, `background_checks`, `reference_checks`

**Reporting:**
- `branch_daily_reports`

**Notifications:**
- `notifications`, `notification_preferences`

**Petty Cash:**
- `petty_cash_floats`, `petty_cash_transactions`
- `petty_cash_replenishments`, `petty_cash_reconciliations`

**Communications:**
- `announcements`, `announcement_reads`

**Audit:**
- `audit_logs`

---

## 6. Current Implementation Status

### 6.1 Backend (✅ ~85% Complete)

| Module | Status | Notes |
|--------|--------|-------|
| Auth | ✅ Complete | Missing: password reset, 2FA |
| Org | ✅ Complete | - |
| Staff | ✅ Complete | Missing: document expiry automation |
| Leave | ✅ Complete | Calendar endpoint exists |
| Approvals | ✅ Complete | Generic workflow engine |
| Claims | ✅ Complete | - |
| Loans | ✅ Complete | Payroll integration done |
| Recruitment | ✅ Complete | Full ATS pipeline |
| Reporting | ✅ Complete | KPI service, exports |
| Notifications | ✅ Complete | Missing: WebSocket real-time |
| Petty Cash | ✅ Complete | - |
| Communications | ✅ Complete | - |

### 6.2 Frontend (✅ ~75% Complete)

| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ Complete | - |
| Dashboards | ✅ Complete | 6 role-specific dashboards |
| Staff | ✅ Complete | - |
| Leave | ✅ Complete | Has calendar view |
| Claims | ✅ Complete | - |
| Loans | ✅ Complete | - |
| Recruitment | ⚠️ Partial | Missing: Kanban board |
| Reports | ✅ Complete | - |
| Approvals | ✅ Complete | - |
| Onboarding | ✅ Complete | - |
| Petty Cash | ✅ Complete | - |
| Announcements | ✅ Complete | - |
| Settings | ⚠️ Partial | Basic config |

### 6.3 Testing (~10% Complete)

- Basic spec files exist for: auth, org, staff
- No integration tests
- No E2E tests

---

## 7. Critical Integration Points

### 7.1 Leave ↔ Approval

```typescript
// leave.service.ts
@OnEvent('approval.completed')
async handleApprovalCompleted(event: ApprovalCompletedEvent) {
    if (event.targetType !== 'leave') return;
    if (event.status === 'approved') {
        await this.onLeaveApproved(event.targetId, event.approverId);
    }
}
```

### 7.2 Claims ↔ Approval

Same pattern - listens for `approval.completed` event.

### 7.3 Loans ↔ Approval

Same pattern - approval triggers disbursement flow.

### 7.4 Recruitment ↔ Staff

Offer acceptance creates Staff record via `convertCandidateToStaff()`.

### 7.5 Staff ↔ Onboarding

Staff creation triggers onboarding instance from template.

---

## 8. Environment Variables

```env
# Database
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_SYNCHRONIZE=false  # NEVER true in production

# JWT
JWT_SECRET=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=

# SMS
AFRICASTALKING_USERNAME=
AFRICASTALKING_API_KEY=
AFRICASTALKING_FROM=

# App
NODE_ENV=
FRONTEND_URL=
ALLOW_SEEDING=false  # Protect production
```

---

## 9. Known Gaps for Production

### 9.1 Security (Priority: CRITICAL)

- [x] Password reset flow ✅ IMPLEMENTED
- [x] Session management / refresh tokens ✅ IMPLEMENTED
- [x] Rate limiting on auth endpoints ✅ IMPLEMENTED
- [ ] CORS configuration hardening
- [ ] Input sanitization review

### 9.2 Reliability (Priority: HIGH)

- [x] Health check endpoint ✅ IMPLEMENTED
- [ ] Structured logging with correlation IDs
- [ ] Error tracking (Sentry)
- [ ] Database connection pooling config
- [ ] Graceful shutdown handling

### 9.3 Features (Priority: MEDIUM)

- [x] Real-time notifications (WebSocket) ✅ IMPLEMENTED
- [x] Document expiry reminders (scheduler) ✅ IMPLEMENTED
- [x] Recruitment Kanban board UI ✅ IMPLEMENTED
- [ ] Enhanced CEO dashboard

### 9.4 Testing (Priority: HIGH)

- [ ] Unit tests for approval workflow
- [ ] Unit tests for leave balance calculations
- [ ] Integration tests for critical flows
- [ ] E2E tests for login, leave request

---

## 10. Safe Implementation Rules

### DO:
1. Always use transactions for multi-table operations
2. Emit events for cross-module communication
3. Use `AuthenticatedRequest` type for request handlers
4. Follow existing DTO patterns
5. Add proper error handling with NestJS exceptions
6. Test with existing seed data

### DON'T:
1. Modify entity relationships without migration plan
2. Change existing API contracts without versioning
3. Add `as any` casts - use proper typing
4. Hard-code localhost or credentials
5. Use `synchronize: true` in production
6. Skip approval workflow for protected operations

---

## 11. Recommended Implementation Order

1. **Phase 1: Security Hardening**
   - Password reset flow
   - Rate limiting
   - Health checks

2. **Phase 2: Core Feature Completion**
   - Document expiry scheduler
   - Enhanced dashboards
   - Recruitment Kanban UI

3. **Phase 3: Real-time & Polish**
   - WebSocket notifications
   - UI/UX improvements
   - Loading states

4. **Phase 4: Testing & Deployment**
   - Critical path tests
   - Performance optimization
   - Deployment documentation

---

*This document should be updated as implementation progresses.*
