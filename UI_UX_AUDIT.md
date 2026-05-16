# Kechita — UI/UX Audit & Gap Analysis
_Last updated: 2026-05-16_

This document inventories every authenticated page in `client/src/pages`, scoring its UX maturity and flagging specific gaps to close. Use the priorities to schedule work.

---

## 1. Cross-cutting gaps (apply to multiple pages)

| # | Gap | Pages affected | Priority |
|---|-----|----------------|----------|
| CC-1 | **Accessibility:** only 1 file uses `aria-*` attributes. Modals, custom buttons, icon-only buttons, and form controls lack labels for screen readers. | All | High |
| CC-2 | **Keyboard nav:** no visible focus rings on custom buttons, no `Esc` handler on modals consistently. | All modal flows | Med |
| CC-3 | **Mobile responsiveness:** several tables use plain `<table>` with `overflow-x-auto`, but cells overflow on phones. No card-based fallback. | Loans, Payroll, PettyCash, Audit, Approvals, StaffMgmt, Recruitment | Med |
| CC-4 | **Inconsistent skeletons / loaders:** mix of `Loader2`, "Loading…", or nothing. No standard skeleton component for tables/cards. | Most pages | Med |
| CC-5 | **Empty states vary:** some have icon + headline + sub + CTA, others just `"No data"`. | ~10 pages | Med |
| CC-6 | **Toast system duplicated** in nearly every page (`useState<{text,type}>`). Should be a single provider. | All | Low |
| CC-7 | **Date/number formatting** inconsistent (en-GB vs en-US, KES vs "Ksh"). | Loans, Payroll, Reports, PettyCash | Low |
| CC-8 | **Search inputs lack debounce** (every keystroke filters/re-renders large tables). | StaffMgmt, LeaveMgmt, Loans, Audit | Low |
| CC-9 | **No bulk actions / multi-select** on list pages. | StaffMgmt, Loans, Approvals, Claims | Med |
| CC-10 | **Routes/pages not yet pruned** despite sidebar consolidation: `/attendance`, `/onboarding` still mounted. | App routing | Low |

---

## 2. Page-by-page audit

Legend:  
- ✅ Complete  
- ⚠️ Partial / needs polish  
- ❌ Missing / placeholder

### 2.1 Dashboard / Landing

#### `DashboardPage.tsx` (router for role-specific dashboards)
- ✅ Lazy loads correct dashboard by role.
- ⚠️ Some role dashboards (`StaffDashboard`, `RelationshipOfficerDashboard`) have only 4 KPIs in a single row — sparse versus CEO/Regional dashboards.

#### `dashboards/CEODashboard.tsx`
- ✅ Pending approvals card, KPI tiles, branch performance.
- ⚠️ Pending Approvals stat uses **global** count, while clicking through shows only personally-actionable items → mismatch.
- ⚠️ No "Critical Alerts" widget (PAR breaches, expiring contracts, overdue onboarding) despite data being available.

#### `dashboards/RegionalManagerDashboard.tsx`, `BranchManagerDashboard.tsx`
- ⚠️ Single KPI row — needs second row of secondary metrics (collections, applications-in-pipeline, leave-on-today).
- ❌ No quick-action shortcuts (Submit Daily Report, Approve Leave).

#### `dashboards/StaffDashboard.tsx`, `RelationshipOfficerDashboard.tsx`
- ⚠️ Only 4 KPIs; missing personal goals progress, leave balance summary, recent payslip.

---

### 2.2 Approvals

#### `ApprovalsPage.tsx`
- ✅ Pending list, filters, detail sidebar with action buttons.
- ⚠️ Stats card discrepancy with backend (see CEO Dashboard note above).
- ⚠️ Long approval chains are not visualized as a stepper.
- ❌ No bulk-approve.
- ❌ No SLA breach indicator (which approvals are past their step deadline).

#### `ApprovalHistoryPage.tsx`
- ✅ Functional table.
- ⚠️ Filters are basic (status only); needs date range and target-type filters.
- ❌ No export.

---

### 2.3 Staff & HR

#### `StaffManagementPage.tsx` (231 KB — largest page)
- ✅ Rich filtering, bulk import, profile drawer.
- ⚠️ Page is monolithic — should be split into sub-components (Directory, Add Staff Wizard, Bulk Import, Org Tree).
- ⚠️ No virtualization on long lists (500+ staff renders all rows).
- ❌ Bulk actions (deactivate, change branch, export selected) missing.
- ❌ Avatar upload preview / crop.

#### `StaffProfilePage.tsx`
- ✅ Comprehensive tabbed profile.
- ⚠️ Some tabs (Documents, Contracts) lack inline upload UI; only links to download.
- ⚠️ "Edit" affordance not consistent across tabs.
- ❌ Activity timeline (audit-style) not present.

#### `MyProfilePage.tsx`
- ✅ Self-service edit of contact info.
- ⚠️ Photo upload area is small; no crop tool.
- ❌ Two-factor setup link missing.

#### `HRAdminPage.tsx` (now hosts Training, Performance, Attendance, Disciplinary, C&B, Assets)
- ✅ Consolidated tabs after recent refactor.
- ⚠️ **Roster sub-tab in Attendance shows "coming soon"** — visual roster planner missing.
- ⚠️ Disciplinary tab lacks workflow visualization (warning → suspension → termination).
- ⚠️ Comp & Benefits: no payroll component preview when assigning a benefit.
- ⚠️ Assets: no asset assignment history per asset.

---

### 2.4 Recruitment

#### `RecruitmentPage.tsx` (140 KB)
- ✅ 6 tabs (Dashboard, Jobs, Pipeline, Candidates, Interviews, Onboarding).
- ⚠️ Pipeline view (Kanban) — drag-drop works but no virtualization on big pipelines.
- ⚠️ Onboarding tab inside Recruitment is functional but lacks template-design UI (only viewing).
- ❌ Job posting preview (what candidate sees) not embedded.
- ❌ Candidate detail: no inline notes timeline.

#### `OnboardingPage.tsx` (standalone — redundant since merged into Recruitment)
- ⚠️ **Duplicate route** — should be removed or hidden, only kept for direct deep-links.

---

### 2.5 Leave

#### `LeaveManagementPage.tsx`
- ✅ My Leave, Team, Calendar, Balances (just redesigned), Stats, Admin tabs.
- ⚠️ Calendar tab: month-grid only, no week/day view.
- ⚠️ Team Requests: lacks bulk-approve and SLA badges.
- ❌ Carry-forward preview before running.

#### `LeaveAdminPage.tsx`
- ⚠️ **Duplicates `Admin` tab inside LeaveManagementPage** — should be removed; surface admin actions only inside LeaveManagementPage.

#### `LeavePage.tsx` (orphan)
- ❌ **Not routed** — dead file, ~67 KB. Delete.

---

### 2.6 Attendance

#### `AttendancePage.tsx` (still mounted on `/attendance` but no longer in sidebar)
- ⚠️ Identical to the `AttendanceTab` inside HRAdminPage.
- ⚠️ "Visual roster planner coming soon" — placeholder.
- ❌ No geo-fencing visualization for clock-ins.
- ❌ No overtime threshold alerts in UI.
- **Recommendation:** keep this route for non-admin staff personal clock-in flow; trim admin features.

---

### 2.7 Performance

#### `PerformancePage.tsx`
- ✅ My Reviews, Reviews-to-Give, My Goals, Cycles.
- ⚠️ Review form is long single column — no progress indicator or section nav.
- ⚠️ Goals don't show parent objective / OKR hierarchy.
- ❌ 360 feedback collection UI missing (entity exists).
- ❌ Calibration screen missing.

---

### 2.8 Loans

#### `LoansPage.tsx`
- ✅ Application flow, approval, disbursement, schedule.
- ⚠️ Repayment schedule table needs sticky header and a download-PDF button.
- ⚠️ No early-settlement calculator.
- ⚠️ Loan detail modal — Approve was missing until recent fix; ensure Disburse + Reject still work for all roles.
- ❌ Portfolio aging chart on Loans dashboard.

---

### 2.9 Claims

#### `ClaimsPage.tsx`
- ✅ Submit + Approve flows.
- ⚠️ No attachment preview (must download to view receipt).
- ⚠️ No category-spend trend chart for the requester.
- ❌ Multi-attachment drag-drop.

---

### 2.10 Payroll

#### `PayrollPage.tsx`
- ✅ Run payroll, payslips, reports.
- ⚠️ Payslip preview opens new tab — needs in-app PDF viewer.
- ⚠️ No diff view between current run and previous run.
- ❌ Tax/statutory summary tab.

---

### 2.11 Petty Cash

#### `PettyCashPage.tsx`
- ✅ Float, expenses, replenishment.
- ⚠️ Branch float status: no historical balance line chart.
- ❌ Receipt OCR / quick capture from camera.

---

### 2.12 Announcements

#### `AnnouncementsPage.tsx`
- ✅ Compose, target-audience picker, list.
- ⚠️ Rich text editor is basic; no inline images.
- ❌ Engagement metrics (read receipts) for sent announcements.
- ❌ Schedule send.

---

### 2.13 Notifications

#### `NotificationsPage.tsx`
- ✅ List + mark read.
- ⚠️ No grouping (Today / This Week / Older).
- ⚠️ No filter by category.
- ❌ Preferences (which channels per category) — exists in Settings but not surfaced here.

---

### 2.14 Reports

#### `ReportsPage.tsx`
- ✅ Recently overhauled (Overview, Financial, HR & Staff, Recruitment, Pending).
- ⚠️ "HR & Staff" and "Recruitment" tabs lighter than Overview/Financial — need similar tile density.
- ⚠️ Export buttons present but no progress feedback on large exports.
- ❌ Schedule recurring report email.

---

### 2.15 Organization

#### `OrganizationPage.tsx`
- ✅ Departments, positions, branches, regions.
- ⚠️ No visual org chart (tree view).
- ⚠️ Drag-to-reorder of departments missing.

---

### 2.16 Audit Logs

#### `AuditPage.tsx`
- ✅ Filterable log table.
- ⚠️ Detail view inline — should be a side drawer with diff (before/after).
- ❌ Saved filter presets.
- ❌ Export.

---

### 2.17 Settings (180 KB — second largest)

#### `SettingsPage.tsx`
- ✅ Massive surface: email, app config, leave types, holidays, claim categories, etc.
- ⚠️ Mega-page; needs a left-rail of categories with sticky position.
- ⚠️ Form save UX inconsistent — some sections auto-save, others have "Save" buttons.
- ❌ Settings search ("Cmd-K") to jump to a specific setting.

#### `SecuritySettingsPage.tsx`
- ✅ Password change, 2FA, sessions.
- ⚠️ Active sessions list lacks device-icon / location enrichment.
- ❌ Backup codes regeneration UI.

---

### 2.18 Auth pages (public)

#### `LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- ✅ Standard flows.
- ⚠️ No password strength meter on reset.
- ❌ "Show password" toggle.

#### `public/CareersPage.tsx`, `public/JobDetailPage.tsx`, `public/OfferSigningPage.tsx`
- ✅ Functional.
- ⚠️ Careers list has no filters (location, department).
- ⚠️ Offer signing — needs progress indicator (Reviewed → Signed → Submitted).
- ❌ Mobile layout: text too small on JobDetail.

---

### 2.19 Error / Misc

#### `NotFoundPage.tsx`
- ✅ Friendly 404.
- ⚠️ No "Go back" button (only "Go Home").

---

## 3. Recommended execution order

### Phase 1 — Quick wins (≤ 1 day)
1. Remove dead `LeavePage.tsx` and consolidate `LeaveAdminPage.tsx` into `LeaveManagementPage`.
2. Unmount `/attendance` and `/onboarding` routes (or redirect to consolidated pages).
3. Add `aria-label` to every icon-only button (find-and-replace pattern).
4. Add "Go back" to `NotFoundPage`.
5. Add "Show password" toggle to login / reset.
6. Add debounce to all big-list search inputs (single hook).

### Phase 2 — Mid effort (1–3 days each)
7. Roster planner UI (Attendance) — drag staff onto shifts per date.
8. Visual org chart (Organization) — d3 / react-flow.
9. Bulk actions on Staff, Loans, Claims, Approvals lists.
10. Diff-style audit drawer.
11. Inline PDF viewer for payslips & claims.
12. Standardize Toast + Empty State + Skeleton into shared components.
13. Settings left-rail nav + "Cmd-K" search.

### Phase 3 — Feature completion
14. Loans: early-settlement calculator, aging chart, downloadable schedule.
15. Performance: 360 feedback, calibration screen.
16. Recruitment: job preview, candidate notes timeline, kanban virtualization.
17. Reports: schedule recurring email, progress feedback on export.
18. Announcements: rich images, scheduled send, read receipts.

### Phase 4 — Accessibility & polish
19. Full keyboard navigation pass (focus rings, `Esc` on modals).
20. Mobile card fallbacks for tables.
21. Visual regression testing.

---

## 4. Tracking

Open a sub-issue per row in section 2 as items are tackled. Reference this doc in commit messages (e.g. `feat(loans): aging chart (UI_UX_AUDIT #2.8)`).
