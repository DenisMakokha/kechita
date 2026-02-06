import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';

interface AuthenticatedSocket extends Socket {
    userId?: string;
}

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    },
    namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationGateway.name);
    private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

    constructor(private jwtService: JwtService) {}

    async handleConnection(client: AuthenticatedSocket) {
        try {
            const token = client.handshake.auth?.token || 
                          client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                this.logger.warn(`Client ${client.id} connected without token`);
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;

            // Track user's socket connections
            if (!this.userSockets.has(payload.sub)) {
                this.userSockets.set(payload.sub, new Set());
            }
            this.userSockets.get(payload.sub)!.add(client.id);

            // Join user's personal room
            client.join(`user:${payload.sub}`);

            this.logger.log(`Client ${client.id} connected for user ${payload.sub}`);
        } catch (error) {
            this.logger.warn(`Client ${client.id} failed authentication: ${error}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        if (client.userId) {
            const userSockets = this.userSockets.get(client.userId);
            if (userSockets) {
                userSockets.delete(client.id);
                if (userSockets.size === 0) {
                    this.userSockets.delete(client.userId);
                }
            }
        }
        this.logger.log(`Client ${client.id} disconnected`);
    }

    @SubscribeMessage('subscribe')
    handleSubscribe(client: AuthenticatedSocket) {
        if (client.userId) {
            client.join(`user:${client.userId}`);
            return { status: 'subscribed', userId: client.userId };
        }
        return { status: 'error', message: 'Not authenticated' };
    }

    @SubscribeMessage('markAsRead')
    handleMarkAsRead(client: AuthenticatedSocket, payload: { notificationId: string }) {
        // This will be handled by the notification service
        // Just acknowledge receipt here
        return { status: 'received', notificationId: payload.notificationId };
    }

    // Listen for notification created events from the service
    @OnEvent('notification.created')
    handleNotificationCreated(payload: { userId: string; notification: any }) {
        this.sendToUser(payload.userId, 'notification', payload.notification);
    }

    @OnEvent('notification.read')
    handleNotificationRead(payload: { userId: string; notificationId: string }) {
        this.sendToUser(payload.userId, 'notification:read', { id: payload.notificationId });
    }

    @OnEvent('notification.bulk')
    handleBulkNotification(payload: { userIds: string[]; notification: any }) {
        for (const userId of payload.userIds) {
            this.sendToUser(userId, 'notification', payload.notification);
        }
    }

    // Helper to send to specific user
    sendToUser(userId: string, event: string, data: any) {
        this.server.to(`user:${userId}`).emit(event, data);
    }

    // Helper to broadcast to all connected users
    broadcast(event: string, data: any) {
        this.server.emit(event, data);
    }

    // Get online status
    isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
    }

    // Get count of online users
    getOnlineUsersCount(): number {
        return this.userSockets.size;
    }
}
