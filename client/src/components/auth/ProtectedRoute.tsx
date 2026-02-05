import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Lock } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: readonly string[];
    requiredPermissions?: readonly string[];
    redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    requiredPermissions,
    redirectTo = '/unauthorized',
}) => {
    const { user, isAuthenticated } = useAuthStore();
    const location = useLocation();

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Get user's role codes
    const userRoles = user.roles?.map((r) => r.code) || [];

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
        const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role));
        if (!hasAllowedRole) {
            return <Navigate to={redirectTo} replace />;
        }
    }

    // TODO: Implement permission-based access when permissions are added
    // if (requiredPermissions && requiredPermissions.length > 0) {
    //     const userPermissions = user.permissions || [];
    //     const hasAllPermissions = requiredPermissions.every(p => userPermissions.includes(p));
    //     if (!hasAllPermissions) {
    //         return <Navigate to={redirectTo} replace />;
    //     }
    // }

    return <>{children}</>;
};

// Role constants for easy reference
export const ROLES = {
    CEO: 'CEO',
    HR_MANAGER: 'HR_MANAGER',
    REGIONAL_MANAGER: 'REGIONAL_MANAGER',
    BRANCH_MANAGER: 'BRANCH_MANAGER',
    RELATIONSHIP_OFFICER: 'RELATIONSHIP_OFFICER',
    BDM: 'BDM',
    ACCOUNTANT: 'ACCOUNTANT',
    HR_ASSISTANT: 'HR_ASSISTANT',
    REGIONAL_ADMIN: 'REGIONAL_ADMIN',
} as const;

// Role groups for common access patterns
export const ROLE_GROUPS = {
    EXECUTIVE: [ROLES.CEO],
    HR: [ROLES.CEO, ROLES.HR_MANAGER, ROLES.HR_ASSISTANT],
    MANAGEMENT: [ROLES.CEO, ROLES.HR_MANAGER, ROLES.REGIONAL_MANAGER, ROLES.BRANCH_MANAGER],
    REGIONAL: [ROLES.CEO, ROLES.REGIONAL_MANAGER, ROLES.REGIONAL_ADMIN],
    ALL_STAFF: Object.values(ROLES),
    FINANCE: [ROLES.CEO, ROLES.ACCOUNTANT, ROLES.HR_MANAGER],
} as const;

// Hook to check user permissions
export const useAuthorization = () => {
    const { user } = useAuthStore();
    const userRoles = user?.roles?.map((r) => r.code) || [];

    const hasRole = (role: string): boolean => {
        return userRoles.includes(role);
    };

    const hasAnyRole = (roles: readonly string[]): boolean => {
        return roles.some((role) => userRoles.includes(role));
    };

    const hasAllRoles = (roles: readonly string[]): boolean => {
        return roles.every((role) => userRoles.includes(role));
    };

    const isCEO = (): boolean => hasRole(ROLES.CEO);
    const isHR = (): boolean => hasAnyRole([ROLES.HR_MANAGER, ROLES.HR_ASSISTANT]);
    const isManager = (): boolean => hasAnyRole([ROLES.CEO, ROLES.REGIONAL_MANAGER, ROLES.BRANCH_MANAGER]);
    const isRegionalLevel = (): boolean => hasAnyRole([ROLES.CEO, ROLES.REGIONAL_MANAGER, ROLES.REGIONAL_ADMIN]);

    return {
        userRoles,
        hasRole,
        hasAnyRole,
        hasAllRoles,
        isCEO,
        isHR,
        isManager,
        isRegionalLevel,
    };
};

// Unauthorized Page Component
export const UnauthorizedPage: React.FC = () => {
    const { user } = useAuthStore();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="text-red-600" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
                <p className="text-slate-600 mb-6">
                    You don't have permission to access this page.
                </p>
                {user && (
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-slate-500">Logged in as:</p>
                        <p className="font-medium text-slate-900">{user.email}</p>
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                            {user.roles?.map((role) => (
                                <span
                                    key={role.code}
                                    className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                                >
                                    {role.code.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex gap-3 justify-center">
                    <a
                        href="/"
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                        Go to Dashboard
                    </a>
                    <a
                        href="/login"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                        Switch Account
                    </a>
                </div>
            </div>
        </div>
    );
};

// RoleGate component for conditional rendering within pages
interface RoleGateProps {
    children: React.ReactNode;
    allowedRoles: readonly string[];
    fallback?: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ children, allowedRoles, fallback = null }) => {
    const { hasAnyRole } = useAuthorization();

    if (!hasAnyRole(allowedRoles)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

// Component to show different content based on role
interface RoleBasedContentProps {
    ceo?: React.ReactNode;
    hr?: React.ReactNode;
    manager?: React.ReactNode;
    staff?: React.ReactNode;
    default?: React.ReactNode;
}

export const RoleBasedContent: React.FC<RoleBasedContentProps> = ({
    ceo,
    hr,
    manager,
    staff,
    default: defaultContent,
}) => {
    const { isCEO, isHR, isManager } = useAuthorization();

    if (isCEO() && ceo) return <>{ceo}</>;
    if (isHR() && hr) return <>{hr}</>;
    if (isManager() && manager) return <>{manager}</>;
    if (staff) return <>{staff}</>;
    return <>{defaultContent || null}</>;
};
