import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    roles: { id: string; code: string; name: string }[];
    permissions?: string[];
    staff_id?: string;
    two_factor_enabled?: boolean;
    is_active?: boolean;
    last_login_at?: string;
}

interface AuthState {
    token: string | null;
    refreshToken: string | null;
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
    setTokens: (token: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            login: (token, refreshToken, user) => {
                set({ token, refreshToken, user, isAuthenticated: true });
            },
            logout: () => {
                set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
            },
            setTokens: (token, refreshToken) => {
                set({ token, refreshToken });
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
