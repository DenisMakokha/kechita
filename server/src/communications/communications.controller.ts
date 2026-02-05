import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CommunicationsService, CreateAnnouncementDto } from './communications.service';
import { AnnouncementStatus, AnnouncementPriority } from './entities/announcement.entity';

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationsController {
    constructor(private readonly communicationsService: CommunicationsService) { }

    // ==================== ADMIN ENDPOINTS ====================

    @Get('announcements')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    getAllAnnouncements(
        @Query('status') status?: AnnouncementStatus,
        @Query('priority') priority?: AnnouncementPriority,
    ) {
        return this.communicationsService.getAllAnnouncements({ status, priority });
    }

    @Get('announcements/:id')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    getAnnouncement(@Param('id') id: string) {
        return this.communicationsService.getAnnouncement(id);
    }

    @Post('announcements')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    createAnnouncement(@Body() data: CreateAnnouncementDto, @Request() req: any) {
        return this.communicationsService.createAnnouncement(data, req.user?.staff_id);
    }

    @Put('announcements/:id')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    updateAnnouncement(@Param('id') id: string, @Body() data: Partial<CreateAnnouncementDto>) {
        return this.communicationsService.updateAnnouncement(id, data);
    }

    @Patch('announcements/:id/publish')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    publishAnnouncement(@Param('id') id: string, @Request() req: any) {
        return this.communicationsService.publishAnnouncement(id, req.user?.staff_id);
    }

    @Patch('announcements/:id/archive')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    archiveAnnouncement(@Param('id') id: string) {
        return this.communicationsService.archiveAnnouncement(id);
    }

    @Get('announcements/:id/stats')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    getAnnouncementStats(@Param('id') id: string) {
        return this.communicationsService.getReadStats(id);
    }

    // ==================== USER-FACING ENDPOINTS ====================

    @Get('my-announcements')
    getMyAnnouncements(@Request() req: any) {
        return this.communicationsService.getAnnouncementsForUser(req.user?.id);
    }

    @Post('announcements/:id/read')
    markAsRead(@Param('id') id: string, @Request() req: any) {
        return this.communicationsService.markAsRead(id, req.user?.staff_id);
    }

    @Post('announcements/:id/acknowledge')
    acknowledge(@Param('id') id: string, @Request() req: any) {
        return this.communicationsService.acknowledge(id, req.user?.staff_id);
    }
}
