import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { CEODashboard } from './CEODashboard';
import { HRDashboard } from './HRDashboard';
import { RegionalManagerDashboard } from './RegionalManagerDashboard';
import { BranchManagerDashboard } from './BranchManagerDashboard';
import { StaffDashboard } from './StaffDashboard';
import AccountantDashboard from './AccountantDashboard';
import { HRAssistantDashboard } from './HRAssistantDashboard';
import { RelationshipOfficerDashboard } from './RelationshipOfficerDashboard';

/**
 * Role-Based Dashboard Router
 * Displays the appropriate dashboard based on user's role
 * Priority order determines which dashboard is shown for users with multiple roles
 */
export const RoleBasedDashboard: React.FC = () => {
    const { user } = useAuthStore();
    const userRoles = user?.roles?.map((r) => r.code) || [];

    // Priority-based role routing (highest privilege first)
    if (userRoles.includes('CEO')) {
        return <CEODashboard />;
    }

    if (userRoles.includes('HR_MANAGER')) {
        return <HRDashboard />;
    }

    if (userRoles.includes('REGIONAL_MANAGER') || userRoles.includes('REGIONAL_ADMIN')) {
        return <RegionalManagerDashboard />;
    }

    if (userRoles.includes('BRANCH_MANAGER')) {
        return <BranchManagerDashboard />;
    }

    if (userRoles.includes('ACCOUNTANT')) {
        return <AccountantDashboard />;
    }

    if (userRoles.includes('HR_ASSISTANT')) {
        return <HRAssistantDashboard />;
    }

    if (userRoles.includes('BDM')) {
        // BDM is a field staff role similar to RO
        return <RelationshipOfficerDashboard />;
    }

    if (userRoles.includes('RELATIONSHIP_OFFICER')) {
        return <RelationshipOfficerDashboard />;
    }

    // Default staff dashboard for all other roles
    return <StaffDashboard />;
};

export default RoleBasedDashboard;

