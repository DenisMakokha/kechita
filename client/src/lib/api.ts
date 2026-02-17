import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Strip non-DTO metadata fields from outgoing request bodies
const STRIP_FIELDS = ['id', 'created_at', 'updated_at', 'deleted_at'];

function stripMetadata(data: any): any {
    if (!data || typeof data !== 'object' || Array.isArray(data) || data instanceof FormData) return data;
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (!STRIP_FIELDS.includes(key)) {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

// Add token to requests + strip metadata from mutation bodies
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data && ['post', 'patch', 'put'].includes(config.method || '')) {
        config.data = stripMetadata(config.data);
    }
    return config;
});

// Handle 401 errors with token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is 401 and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't retry for auth endpoints (login, refresh, etc.)
            if (originalRequest.url?.includes('/auth/login') || 
                originalRequest.url?.includes('/auth/refresh') ||
                originalRequest.url?.includes('/auth/logout')) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalRequest));
                        },
                        reject: (err: Error) => reject(err),
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = useAuthStore.getState().refreshToken;

            if (!refreshToken) {
                isRefreshing = false;
                clearAuthAndRedirect();
                return Promise.reject(error);
            }

            try {
                const response = await axios.post(`${API_URL}/auth/refresh`, {
                    refresh_token: refreshToken,
                });

                const { access_token, refresh_token: newRefreshToken } = response.data;

                useAuthStore.getState().setTokens(access_token, newRefreshToken);

                api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                processQueue(null, access_token);
                isRefreshing = false;

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                isRefreshing = false;
                clearAuthAndRedirect();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

function clearAuthAndRedirect() {
    useAuthStore.getState().logout();
    window.location.href = '/login';
}

export default api;
