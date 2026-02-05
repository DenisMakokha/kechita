import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import { ProtectedRoute, UnauthorizedPage, ROLES, ROLE_GROUPS } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { RoleBasedDashboard } from './pages/dashboards';
import { StaffPage } from './pages/StaffPage';
import { LeavePage } from './pages/LeavePage';
import { ClaimsPage } from './pages/ClaimsPage';
import { LoansPage } from './pages/LoansPage';
import { RecruitmentPage } from './pages/RecruitmentPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ApprovalHistoryPage } from './pages/ApprovalHistoryPage';
import OnboardingPage from './pages/OnboardingPage';
import { PettyCashPage } from './pages/PettyCashPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { PublicLayout } from './layouts/PublicLayout';
import { CareersPage } from './pages/public/CareersPage';
import { JobDetailPage } from './pages/public/JobDetailPage';
import { OfferSigningPage } from './pages/public/OfferSigningPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
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
              path="staff"
              element={
                <ProtectedRoute allowedRoles={ROLE_GROUPS.HR}>
                  <StaffPage />
                </ProtectedRoute>
              }
            />

            {/* Leave - accessible to all staff */}
            <Route path="leave" element={<LeavePage />} />

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
                <ProtectedRoute allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <ReportsPage />
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

            {/* Approvals - Management only */}
            <Route
              path="approvals"
              element={
                <ProtectedRoute allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <ApprovalsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="approvals/history"
              element={
                <ProtectedRoute allowedRoles={ROLE_GROUPS.MANAGEMENT}>
                  <ApprovalHistoryPage />
                </ProtectedRoute>
              }
            />

            {/* Onboarding - HR only */}
            <Route
              path="onboarding"
              element={
                <ProtectedRoute allowedRoles={ROLE_GROUPS.HR}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Petty Cash - Finance and Management */}
            <Route
              path="petty-cash"
              element={
                <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.ACCOUNTANT, ROLES.BRANCH_MANAGER, ROLES.REGIONAL_MANAGER]}>
                  <PettyCashPage />
                </ProtectedRoute>
              }
            />

            {/* Announcements - accessible to all staff */}
            <Route path="announcements" element={<AnnouncementsPage />} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

