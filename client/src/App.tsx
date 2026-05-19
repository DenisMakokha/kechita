import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { ProtectedRoute, UnauthorizedPage, ROLES, ROLE_GROUPS } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy-loaded pages — each becomes its own chunk
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const RoleBasedDashboard = React.lazy(() => import('./pages/dashboards'));
const ClaimsPage = React.lazy(() => import('./pages/ClaimsPage'));
const LoansPage = React.lazy(() => import('./pages/LoansPage'));
const RecruitmentPage = React.lazy(() => import('./pages/RecruitmentPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ApprovalsPage = React.lazy(() => import('./pages/ApprovalsPage'));
const ApprovalHistoryPage = React.lazy(() => import('./pages/ApprovalHistoryPage'));
// OnboardingPage removed: features moved into RecruitmentPage
const PettyCashPage = React.lazy(() => import('./pages/PettyCashPage'));
const PayrollPage = React.lazy(() => import('./pages/PayrollPage'));
const AttendancePage = React.lazy(() => import('./pages/AttendancePage'));
const PerformancePage = React.lazy(() => import('./pages/PerformancePage'));
const HRAdminPage = React.lazy(() => import('./pages/HRAdminPage'));
const DocumentTemplatesPage = React.lazy(() => import('./pages/DocumentTemplatesPage'));
const AnnouncementsPage = React.lazy(() => import('./pages/AnnouncementsPage'));
const SecuritySettingsPage = React.lazy(() => import('./pages/SecuritySettingsPage'));
const OrganizationPage = React.lazy(() => import('./pages/OrganizationPage'));
const StaffProfilePage = React.lazy(() => import('./pages/StaffProfilePage'));
const MyProfilePage = React.lazy(() => import('./pages/MyProfilePage'));
// LeaveAdminPage removed: admin features are inside LeaveManagementPage
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const AuditPage = React.lazy(() => import('./pages/AuditPage'));
const PublicLayout = React.lazy(() => import('./layouts/PublicLayout'));
const CareersPage = React.lazy(() => import('./pages/public/CareersPage'));
const JobDetailPage = React.lazy(() => import('./pages/public/JobDetailPage'));
const OfferSigningPage = React.lazy(() => import('./pages/public/OfferSigningPage'));
const StaffManagementPage = React.lazy(() => import('./pages/StaffManagementPage'));
const LeaveManagementPage = React.lazy(() => import('./pages/LeaveManagementPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Page loading skeleton
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-[#0066B3] rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 0,             // Always refetch after invalidation
      gcTime: 10 * 60_000,      // Keep unused data in cache for 10 minutes
      refetchOnReconnect: true, // Refetch when network reconnects
      networkMode: 'online',    // Only fetch when online
    },
  },
});

// Cache time presets for different data types
export const CachePresets = {
  // Reference data (branches, departments, positions, roles)
  reference: {
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
  },
  // Master data (staff, users)
  master: {
    staleTime: 0,
    gcTime: 15 * 60 * 1000,
  },
  // Transactional data (claims, leave, loans, petty cash)
  transactional: {
    staleTime: 0,
    gcTime: 5 * 60_000,
  },
  // Real-time data (notifications, dashboard) - always fresh
  realtime: {
    staleTime: 0,              // Always stale (fetch immediately)
    gcTime: 60_000,            // 1 minute
    refetchInterval: 30_000,   // Auto-refetch every 30 seconds
  },
  // Static data (document types, claim types, leave types) - almost never changes
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Simple auth check for main layout
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Public Careers Portal */}
          <Route element={<PublicLayout />}>
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/careers/:id" element={<JobDetailPage />} />
          </Route>

          {/* Public Offer Signing */}
          <Route path="/offer/sign/:token" element={<OfferSigningPage />} />

          {/* Protected routes with role-based access */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard - accessible to all authenticated users */}
            <Route path="dashboard" element={<RoleBasedDashboard />} />

            {/* Staff Management - HR and Management only */}
            <Route
              path="staff-management"
              element={
                <ProtectedRoute allowedRoles={ROLE_GROUPS.HR}>
                  <StaffManagementPage />
                </ProtectedRoute>
              }
            />
            <Route path="staff" element={<Navigate to="/staff-management" replace />} />
            <Route
              path="staff/:id"
              element={
                <ProtectedRoute allowedRoles={ROLE_GROUPS.HR}>
                  <StaffProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Leave Management - accessible to all staff */}
            <Route path="leave-management" element={<LeaveManagementPage />} />
            <Route path="leave" element={<Navigate to="/leave-management" replace />} />
            <Route path="leave-admin" element={<Navigate to="/leave-management" replace />} />

            {/* Claims - accessible to all staff */}
            <Route path="claims" element={<ClaimsPage />} />

            {/* Loans - accessible to all staff */}
            <Route path="loans" element={<LoansPage />} />

            {/* Recruitment - HR only */}
            <Route
              path="recruitment"
              element={
                <ProtectedRoute allowedRoles={ROLE_GROUPS.HR}>
                  <RecruitmentPage />
                </ProtectedRoute>
              }
            />

            {/* Reports - Management level */}
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={[...ROLE_GROUPS.MANAGEMENT, ROLES.ACCOUNTANT, ROLES.BRANCH_MANAGER, ROLES.RELATIONSHIP_OFFICER]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Notifications - All authenticated users */}
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Audit - CEO and HR only */}
            <Route
              path="audit"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR_MANAGER]}>
                  <AuditPage />
                </ProtectedRoute>
              }
            />

            {/* Settings - HR and Admin only */}
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={[...ROLE_GROUPS.HR, ROLES.REGIONAL_ADMIN]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Approvals - accessible to all staff (non-approvers see My Submissions) */}
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="approvals/history" element={<ApprovalHistoryPage />} />

            {/* Onboarding moved into Recruitment page */}
            <Route path="onboarding" element={<Navigate to="/recruitment" replace />} />

            {/* Petty Cash - Finance and Management */}
            <Route
              path="petty-cash"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.ACCOUNTANT, ROLES.BRANCH_MANAGER, ROLES.REGIONAL_MANAGER]}>
                  <PettyCashPage />
                </ProtectedRoute>
              }
            />

            {/* Payroll - CEO, HR Manager, Accountant */}
            <Route
              path="payroll"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR_MANAGER, ROLES.ACCOUNTANT]}>
                  <PayrollPage />
                </ProtectedRoute>
              }
            />

            {/* Attendance - all staff (admin tabs inside) */}
            <Route path="attendance" element={<AttendancePage />} />

            {/* Performance - all staff (admin tabs inside) */}
            <Route path="performance" element={<PerformancePage />} />

            {/* HR Administration (Training, Disciplinary, C&B, Assets) - HR + CEO */}
            <Route
              path="hr-admin"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR_MANAGER, ROLES.HR_ASSISTANT]}>
                  <HRAdminPage />
                </ProtectedRoute>
              }
            />

            {/* Document Templates (contracts, offers, JDs, warnings, …) */}
            <Route
              path="document-templates"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR_MANAGER]}>
                  <DocumentTemplatesPage />
                </ProtectedRoute>
              }
            />

            {/* Announcements - accessible to all staff */}
            <Route path="announcements" element={<AnnouncementsPage />} />

            {/* Legacy /users and /roles redirect to unified Staff Management */}
            <Route path="users" element={<Navigate to="/staff-management" replace />} />
            <Route path="roles" element={<Navigate to="/staff-management" replace />} />

            {/* Security Settings - accessible to all authenticated users */}
            <Route path="security" element={<SecuritySettingsPage />} />

            {/* My Profile - accessible to all authenticated users */}
            <Route path="my-profile" element={<MyProfilePage />} />

            {/* Organization Management - CEO and HR only */}
            <Route
              path="organization"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR_MANAGER, ROLES.REGIONAL_MANAGER]}>
                  <OrganizationPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 - Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

