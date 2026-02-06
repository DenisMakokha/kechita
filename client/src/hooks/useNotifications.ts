import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    priority: string;
    is_read: boolean;
    created_at: string;
    payload?: Record<string, any>;
    actions?: Array<{
        label: string;
        action: string;
        url?: string;
        style?: string;
    }>;
}

interface UseNotificationsReturn {
    isConnected: boolean;
    notifications: Notification[];
    unreadCount: number;
    connect: () => void;
    disconnect: () => void;
    markAsRead: (id: string) => void;
}

export function useNotifications(): UseNotificationsReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const queryClient = useQueryClient();
    const { token, isAuthenticated } = useAuthStore();

    const connect = useCallback(() => {
        if (!token || !isAuthenticated || socketRef.current?.connected) {
            return;
        }

        const socket = io(`${SOCKET_URL}/notifications`, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('🔔 Notification socket connected');
            setIsConnected(true);
            socket.emit('subscribe');
        });

        socket.on('disconnect', (reason: string) => {
            console.log('🔕 Notification socket disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (error: Error) => {
            console.error('Notification socket error:', error);
            setIsConnected(false);
        });

        // Handle new notification
        socket.on('notification', (notification: Notification) => {
            console.log('📬 New notification:', notification);
            
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Show browser notification if permitted
            if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.body,
                    icon: '/favicon.ico',
                    tag: notification.id,
                });
            }

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        });

        // Handle notification read
        socket.on('notification:read', ({ id }: { id: string }) => {
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        });

        socketRef.current = socket;
    }, [token, isAuthenticated, queryClient]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    }, []);

    const markAsRead = useCallback((id: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('markAsRead', { notificationId: id });
        }
    }, []);

    // Auto-connect when authenticated
    useEffect(() => {
        if (isAuthenticated && token) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [isAuthenticated, token, connect, disconnect]);

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return {
        isConnected,
        notifications,
        unreadCount,
        connect,
        disconnect,
        markAsRead,
    };
}

export default useNotifications;
