import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CommunicationsService } from './communications.service';
import { AnnouncementStatus, AnnouncementPriority } from './entities/announcement.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/communications.dto';

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
    getAnnouncement(@Param('id', ParseUUIDPipe) id: string) {
        return this.communicationsService.getAnnouncement(id);
    }

    @Post('announcements')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    createAnnouncement(@Body() data: CreateAnnouncementDto, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.communicationsService.createAnnouncement(data, staffId);
    }

    @Put('announcements/:id')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    updateAnnouncement(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateAnnouncementDto) {
        return this.communicationsService.updateAnnouncement(id, data);
    }

    @Patch('announcements/:id/publish')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    publishAnnouncement(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.communicationsService.publishAnnouncement(id, staffId);
    }

    @Patch('announcements/:id/archive')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    archiveAnnouncement(@Param('id', ParseUUIDPipe) id: string) {
        return this.communicationsService.archiveAnnouncement(id);
    }

    @Get('announcements/:id/stats')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    getAnnouncementStats(@Param('id', ParseUUIDPipe) id: string) {
        return this.communicationsService.getReadStats(id);
    }

    // ==================== USER-FACING ENDPOINTS ====================

    @Get('my-announcements')
    getMyAnnouncements(@Req() req: AuthenticatedRequest) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User ID not found in token');
        return this.communicationsService.getAnnouncementsForUser(userId);
    }

    @Post('announcements/:id/read')
    markAsRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.communicationsService.markAsRead(id, staffId);
    }

    @Post('announcements/:id/acknowledge')
    acknowledge(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
        const staffId = req.user?.staff_id;
        if (!staffId) throw new BadRequestException('Staff ID not found in token');
        return this.communicationsService.acknowledge(id, staffId);
    }

    // ==================== DELETE & UNARCHIVE ====================

    @Delete('announcements/:id')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    deleteAnnouncement(@Param('id', ParseUUIDPipe) id: string) {
        return this.communicationsService.deleteAnnouncement(id);
    }

    @Patch('announcements/:id/unarchive')
    @Roles('CEO', 'HR_MANAGER', 'ADMIN')
    unarchiveAnnouncement(@Param('id', ParseUUIDPipe) id: string) {
        return this.communicationsService.unarchiveAnnouncement(id);
    }
}
