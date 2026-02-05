import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Query,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationType } from './entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async getNotifications(
        @Request() req: any,
        @Query('unreadOnly') unreadOnly?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('types') types?: string,
    ) {
        const options = {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            types: types ? (types.split(',') as NotificationType[]) : undefined,
        };

        return this.notificationService.getUserNotifications(req.user.sub, options);
    }

    @Get('unread-count')
    async getUnreadCount(@Request() req: any) {
        const count = await this.notificationService.getUnreadCount(req.user.sub);
        return { count };
    }

    @Get('stats')
    async getStats(@Request() req: any) {
        return this.notificationService.getStats(req.user.sub);
    }

    @Patch(':id/read')
    async markAsRead(@Request() req: any, @Param('id') id: string) {
        return this.notificationService.markAsRead(id, req.user.sub);
    }

    @Patch('read-all')
    async markAllAsRead(@Request() req: any) {
        const count = await this.notificationService.markAllAsRead(req.user.sub);
        return { markedAsRead: count };
    }

    @Patch('read-multiple')
    async markMultipleAsRead(@Request() req: any, @Body('ids') ids: string[]) {
        const count = await this.notificationService.markMultipleAsRead(ids, req.user.sub);
        return { markedAsRead: count };
    }

    @Delete(':id')
    async deleteNotification(@Request() req: any, @Param('id') id: string) {
        await this.notificationService.delete(id, req.user.sub);
        return { deleted: true };
    }

    @Delete()
    async deleteAll(@Request() req: any, @Query('readOnly') readOnly?: string) {
        if (readOnly === 'true') {
            const count = await this.notificationService.deleteRead(req.user.sub);
            return { deleted: count };
        }
        const count = await this.notificationService.deleteAll(req.user.sub);
        return { deleted: count };
    }

    // =============== PREFERENCES ===============

    @Get('preferences')
    async getPreferences(@Request() req: any) {
        return this.notificationService.getPreferences(req.user.sub);
    }

    @Patch('preferences/:type')
    async updatePreference(
        @Request() req: any,
        @Param('type') type: NotificationType,
        @Body() body: {
            in_app_enabled?: boolean;
            email_enabled?: boolean;
            push_enabled?: boolean;
            sms_enabled?: boolean;
        },
    ) {
        return this.notificationService.updatePreference(req.user.sub, type, body);
    }
}
