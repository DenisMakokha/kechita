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
    Req,
    ParseUUIDPipe,
    BadRequestException,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationType } from './entities/notification.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { MarkMultipleReadDto, UpdatePreferenceDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async getNotifications(
        @Req() req: AuthenticatedRequest,
        @Query('unreadOnly') unreadOnly?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('types') types?: string,
    ) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        const options = {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            types: types ? (types.split(',') as NotificationType[]) : undefined,
        };

        return this.notificationService.getUserNotifications(userId, options);
    }

    @Get('unread-count')
    async getUnreadCount(@Req() req: AuthenticatedRequest) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        const count = await this.notificationService.getUnreadCount(userId);
        return { count };
    }

    @Get('stats')
    async getStats(@Req() req: AuthenticatedRequest) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        return this.notificationService.getStats(userId);
    }

    @Patch(':id/read')
    async markAsRead(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        return this.notificationService.markAsRead(id, userId);
    }

    @Patch('read-all')
    async markAllAsRead(@Req() req: AuthenticatedRequest) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        const count = await this.notificationService.markAllAsRead(userId);
        return { markedAsRead: count };
    }

    @Patch('read-multiple')
    async markMultipleAsRead(@Req() req: AuthenticatedRequest, @Body() dto: MarkMultipleReadDto) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        const count = await this.notificationService.markMultipleAsRead(dto.ids, userId);
        return { markedAsRead: count };
    }

    @Delete(':id')
    async deleteNotification(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        await this.notificationService.delete(id, userId);
        return { deleted: true };
    }

    @Delete()
    async deleteAll(@Req() req: AuthenticatedRequest, @Query('readOnly') readOnly?: string) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        if (readOnly === 'true') {
            const count = await this.notificationService.deleteRead(userId);
            return { deleted: count };
        }
        const count = await this.notificationService.deleteAll(userId);
        return { deleted: count };
    }

    // =============== PREFERENCES ===============

    @Get('preferences')
    async getPreferences(@Req() req: AuthenticatedRequest) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        return this.notificationService.getPreferences(userId);
    }

    @Patch('preferences/:type')
    async updatePreference(
        @Req() req: AuthenticatedRequest,
        @Param('type') type: NotificationType,
        @Body() dto: UpdatePreferenceDto,
    ) {
        const userId = req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        return this.notificationService.updatePreference(userId, type, dto);
    }
}
