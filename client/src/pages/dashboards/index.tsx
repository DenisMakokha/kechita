import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { CEODashboard } from './CEODashboard';
import { HRDashboard } from './HRDashboard';
import { RegionalManagerDashboard } from './RegionalManagerDashboard';
import { BranchManagerDashboard } from './BranchManagerDashboard';
import { StaffDashboard } from './StaffDashboard';
import AccountantDashboard from './AccountantDashboard';

/**
 * Role-Based Dashboard Router
 * Displays the appropriate dashboard based on user's role
 */
export const RoleBasedDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const userRoles = user?.roles?.map((r) => r.code) || [];

    // Priority-based role routing
    if (userRoles.includes('CEO')) {
        return <CEODashboard />;
    }

    if (userRoles.includes('HR_MANAGER')) {
        return <HRDashboard />;
    }

    if (userRoles.includes('REGIONAL_MANAGER')) {
        return <RegionalManagerDashboard />;
    }

    if (userRoles.includes('BRANCH_MANAGER')) {
        return <BranchManagerDashboard />;
    }

    if (userRoles.includes('ACCOUNTANT')) {
        return <AccountantDashboard />;
    }

    // Default staff dashboard for all other roles
    return <StaffDashboard />;
};

export default RoleBasedDashboard;

