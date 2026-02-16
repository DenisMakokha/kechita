# Kechita Staff Portal - Production Readiness Audit v2

**Date:** 2026-02-11
**Scope:** Full-stack deep audit - frontend, backend, security, infrastructure, UX

---

## Executive Summary

The system is feature-rich with 14 backend modules (Auth, Org, Staff, Leave, Approval, Claims, Loans, Recruitment, Reporting, Notifications, Audit, Email, PettyCash, Communications) and 25+ frontend pages. Core functionality works. The previous audit (Phase 1-4) fixed broken API URLs, role gating, and hardcoded data. This audit focuses on **production hardening** - the gaps that would cause problems with real users at scale.

### Severity Legend
- CRITICAL - Will cause failures/security issues in production
- HIGH - Major UX/reliability problems
- MEDIUM - Should be fixed before launch
- LOW - Nice to have / polish

---

## 1. SECURITY (CRITICAL)

### 1.1 No Helmet middleware (HTTP security headers)
- **File:** server/src/main.ts
- **Issue:** No helmet package for security headers (X-Frame-Options, X-Content-Type-Options, HSTS, CSP, etc.)
- **Fix:** npm install helmet + app.use(helmet()) in main.ts

### 1.2 No file upload size/type validation on server
- **Files:** staff.controller.ts, document.controller.ts, reporting.controller.ts
- **Issue:** Multer file upload interceptors exist but no global max file size or MIME-type whitelist. Malicious files could be uploaded.
- **Fix:** Add MulterModule.register with limits and fileFilter with strict MIME checking

### 1.3 .env.example is incomplete
- **File:** server/.env.example
- **Issue:** Only has DB credentials + JWT_SECRET. Missing NODE_ENV, FRONTEND_URL, CORS_ORIGINS, SMTP vars, SMS vars, DB_SYNCHRONIZE, JWT_REFRESH_SECRET
- **Fix:** Add all env vars to .env.example with documentation

### 1.4 synchronize: true in production risk
- **File:** server/src/app.module.ts lines 89-94
- **Issue:** shouldSynchronize defaults to true unless NODE_ENV=production. If someone forgets NODE_ENV, TypeORM auto-alters tables.
- **Fix:** Default shouldSynchronize to false. Require explicit DB_SYNCHRONIZE=true.

### 1.5 In-memory rate limiter won't scale
- **File:** server/src/common/guards/throttle.guard.ts
- **Issue:** Rate limit uses in-process Map. In load-balanced deployment, limits are per-instance not per-user.
- **Fix:** Move to Redis-backed rate limiter before scaling.

### 1.6 JWT_SECRET not validated on startup
- **Issue:** If JWT_SECRET env var is missing, app starts but JWTs signed with undefined.
- **Fix:** Add startup validation - throw if JWT_SECRET is not set.

### 1.7 WebSocket CORS is hardcoded
- **File:** server/src/notifications/notification.gateway.ts line 19
- **Issue:** WebSocket gateway CORS origin hardcoded to http://localhost:5173. Production notifications will fail.
- **Fix:** Use same CORS_ORIGINS / FRONTEND_URL env var as main.ts.

### 1.8 prompt() used for destructive actions (20 instances)
- **Files:** ClaimsPage, LoansPage, LeaveManagementPage, PettyCashPage
- **Issue:** Browser prompt() used for reject reasons, payment amounts. Ugly, unstylable, blocked by some browsers.
- **Fix:** Replace all prompt() calls with proper modal dialogs.

---

## 2. RELIABILITY AND ERROR HANDLING (HIGH)

### 2.1 No global Error Boundary in React
- **File:** client/src/App.tsx
- **Issue:** No React Error Boundary. Component render errors crash entire app to white screen.
- **Fix:** Add ErrorBoundary wrapping the router with friendly fallback UI.

### 2.2 No 404 page
- **File:** client/src/App.tsx line 245
- **Issue:** Catch-all redirects unknown URLs to /login. Authenticated users hitting bad URL get sent to login.
- **Fix:** Add proper NotFoundPage with navigation back to dashboard.

### 2.3 No loading skeletons or spinners
- **Issue:** Pages show empty/blank content while data loads.
- **Fix:** Add shared LoadingSpinner and PageSkeleton components.

### 2.4 No shared toast system
- **Issue:** Every page implements its own toast state. No global toast provider.
- **Fix:** Create shared ToastProvider context or use react-hot-toast / sonner.

### 2.5 Duplicate leave page routes
- **File:** client/src/App.tsx lines 120-121
- **Issue:** Both /leave-management and /leave routes exist pointing to different components.
- **Fix:** Remove old LeavePage route, redirect /leave to /leave-management.

### 2.6 Auth store + localStorage duplication
- **File:** client/src/store/auth.store.ts
- **Issue:** Token stored in both Zustand persist AND manual localStorage. Interceptor reads from localStorage directly. Can go out of sync.
- **Fix:** Single source of truth - remove duplication.

### 2.7 Login page doesn't sync refresh token properly
- **File:** client/src/pages/LoginPage.tsx line 29
- **Issue:** refresh_token in localStorage only. Zustand store only tracks access token. clearAuthAndRedirect doesn't call store logout().
- **Fix:** Store refresh_token in Zustand. Call logout() in clearAuthAndRedirect.

### 2.8 SmsModule not imported in AppModule
- **File:** server/src/app.module.ts
- **Issue:** SmsModule is @Global() but never imported. SMS silently won't work.
- **Fix:** Add SmsModule to AppModule imports.

---

## 3. DATABASE AND MIGRATIONS (HIGH)

### 3.1 No migration system
- **Issue:** Uses synchronize: true for schema management. No TypeORM migration files.
- **Fix:** Generate initial migration, add migration scripts to package.json.

### 3.2 No database indexes
- **Issue:** Only PKs and unique constraints create indexes. Common query columns lack indexes.
- **Fix:** Add @Index() on frequently queried columns (staff.branch_id, leave_request.staff_id, etc.)

### 3.3 No production seed for defaults
- **Issue:** Seed scripts use faker (devDep). Need separate seed for required data: roles, leave types, admin user.
- **Fix:** Create seed-defaults.ts for idempotent reference data insertion.

---

## 4. FRONTEND UX GAPS (MEDIUM)

### 4.1 Reports page not accessible to BM/RO
- **Files:** App.tsx lines 148-155, DashboardLayout.tsx line 46
- **Issue:** Reports route/sidebar only for CEO, HR, RM, Accountant. BM and RO submit daily reports but can't view their submissions.
- **Fix:** Add BM and RO to Reports access. Show My Reports tab for submitters.

### 4.2 WebSocket notifications not connected
- **File:** client/src/layouts/DashboardLayout.tsx
- **Issue:** useNotifications hook exists but isn't called in the layout. Bell only uses REST polling.
- **Fix:** Call useNotifications() in DashboardLayout.

### 4.3 No frontend form validation
- **Issue:** Forms rely entirely on backend validation. No inline errors or required field indicators.
- **Fix:** Add client-side validation with inline error messages.

### 4.4 No confirmation dialogs for destructive actions
- **Issue:** Cancel/reject/delete use prompt() or fire immediately.
- **Fix:** Create shared ConfirmDialog component.

### 4.5 No pagination on list pages
- **Issue:** All records fetched at once. Will be slow with thousands of records.
- **Fix:** Add server-side pagination and frontend pagination controls.

### 4.6 Calendar has no leave data overlay
- **File:** LeaveManagementPage.tsx lines 85-97
- **Issue:** Calendar days created with empty leaves arrays. No actual leave data shown.
- **Fix:** Cross-reference requests with calendar days.

### 4.7 Duplicate staff pages
- **File:** App.tsx lines 94-116
- **Issue:** Both /staff-management and /staff exist. Duplicate functionality.
- **Fix:** Consolidate to one page.

---

## 5. BACKEND COMPLETENESS (MEDIUM)

### 5.1 BDM not in report submit roles
- **File:** server/src/reporting/reporting.controller.ts line 23
- **Issue:** Daily report @Roles only has BM and RO. BDM missing.
- **Fix:** Add BDM to submit roles.

### 5.2 Leave approve/reject uses POST instead of PATCH
- **Issue:** State-change endpoints use POST. Should be PATCH semantically.
- **Fix:** Change backend to @Patch(). Update frontend.

### 5.3 No health check endpoint
- **Issue:** No /health for load balancer checks or monitoring.
- **Fix:** Add @Get('health') returning status, uptime, version, db status.

### 5.4 No API versioning
- **Issue:** All APIs unversioned. Breaking changes affect all clients.
- **Fix:** Add /api/v1/ prefix via app.setGlobalPrefix.

### 5.5 org/branches response lacks staff count
- **Issue:** RegionalManagerDashboard expects staffCount on branch data. Not returned.
- **Fix:** Add staffCount to branches query.

---

## 6. DEPLOYMENT AND INFRASTRUCTURE (MEDIUM)

### 6.1 No Docker configuration
- **Issue:** No containerization. Manual deployment is error-prone.
- **Fix:** Add Dockerfiles and docker-compose.yml.

### 6.2 No production build serving strategy
- **Issue:** No nginx config or clear static file serving plan for client build.
- **Fix:** Configure ServeStaticModule for client build or add nginx config.

### 6.3 No .env.production template
- **Issue:** No production environment template.
- **Fix:** Create .env.production.example with all vars documented.

### 6.4 Uploads not persistent
- **File:** server/src/app.module.ts lines 98-101
- **Issue:** Files served from cwd/uploads. Ephemeral in containers.
- **Fix:** Use persistent volume or cloud storage (S3/GCS).

### 6.5 No structured logging
- **Issue:** All logs to stdout. No JSON format, rotation, or aggregation.
- **Fix:** Add winston or pino with JSON format.

---

## 7. TESTING (LOW)

### 7.1 Minimal backend test coverage
- **Issue:** Only spec stubs exist. No meaningful tests.
- **Fix:** Priority: auth, approval workflow, leave balance, loan repayment tests.

### 7.2 No frontend tests
- **Issue:** No test framework for React components.
- **Fix:** Add Vitest + React Testing Library for critical flows.

---

## 8. CODE QUALITY (LOW)

### 8.1 Monolithic page files
- **Issue:** RecruitmentPage (98KB), SettingsPage (93KB), LoansPage (67KB). Hard to maintain.
- **Fix:** Break into sub-components per tab/section.

### 8.2 No shared form components
- **Issue:** Every page builds its own inputs, modals, selects.
- **Fix:** Extract shared components to client/src/components/ui/.

### 8.3 StatCard duplicated across dashboards
- **Issue:** StatCard defined locally in multiple dashboard files.
- **Fix:** Extract to shared component.

---

## Implementation Priority

### Phase 1 - CRITICAL (Before any real users) ~2.5 hours
- 1.1 Add Helmet security headers (5 min)
- 1.4 Fix synchronize default to false (5 min)
- 1.6 Validate JWT_SECRET on startup (10 min)
- 1.7 Fix WebSocket CORS from env (5 min)
- 2.1 Add React Error Boundary (30 min)
- 2.2 Add proper 404 page (20 min)
- 2.5 Remove duplicate leave route (5 min)
- 2.6 Fix auth store/localStorage sync (30 min)
- 2.7 Fix login refresh token handling (15 min)
- 2.8 Import SmsModule in AppModule (2 min)
- 5.3 Add /health endpoint (10 min)

### Phase 2 - HIGH (Before beta) ~12 hours
- 1.2 File upload validation (1 hr)
- 1.3 Complete .env.example (20 min)
- 1.8 Replace all prompt() with modals (3 hr)
- 2.3 Add loading spinners/skeletons (2 hr)
- 2.4 Shared toast provider (1 hr)
- 3.1 Set up migration system (2 hr)
- 4.1 Reports access for BM/RO (30 min)
- 4.2 Connect WebSocket notifications (1 hr)
- 4.4 Shared ConfirmDialog component (1 hr)
- 5.1 Add BDM to report submit roles (5 min)
- 5.5 Add staff count to branches API (30 min)

### Phase 3 - MEDIUM (Before GA) ~25 hours
- 1.5 Redis-backed rate limiter (2 hr)
- 3.2 Add database indexes (2 hr)
- 3.3 Production seed script (1 hr)
- 4.3 Frontend form validation (4 hr)
- 4.5 Server-side pagination (4 hr)
- 4.6 Calendar leave data overlay (2 hr)
- 4.7 Consolidate staff pages (1 hr)
- 5.2 Fix approve/reject HTTP methods (1 hr)
- 5.4 API versioning prefix (30 min)
- 6.1 Docker setup (2 hr)
- 6.3 Production env template (20 min)
- 6.4 Cloud storage for uploads (3 hr)
- 6.5 Structured logging (2 hr)

### Phase 4 - LOW (Post-launch polish) ~25 hours
- 6.2 Production static file serving (1 hr)
- 7.1 Backend test coverage (8+ hr)
- 7.2 Frontend test coverage (8+ hr)
- 8.1 Break up large page files (4+ hr)
- 8.2 Shared form components (3 hr)
- 8.3 Extract shared StatCard (30 min)

---

Total estimated effort: ~65 hours across all phases
Phase 1 alone: ~2.5 hours (most impactful, lowest effort)
