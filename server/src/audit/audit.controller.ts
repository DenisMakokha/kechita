import {
    Controller,
    Get,
    Query,
    UseGuards,
    Param,
} from '@nestjs/common';
import { AuditService, AuditLogFilter } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @Roles('CEO', 'HR_MANAGER')
    async findAll(
        @Query('userId') userId?: string,
        @Query('staffId') staffId?: string,
        @Query('action') action?: AuditAction,
        @Query('entityType') entityType?: string,
        @Query('entityId') entityId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('isSuccessful') isSuccessful?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const filter: AuditLogFilter = {
            userId,
            staffId,
            action,
            entityType,
            entityId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isSuccessful: isSuccessful ? isSuccessful === 'true' : undefined,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
        };

        return this.auditService.findAll(filter);
    }

    @Get('recent')
    @Roles('CEO', 'HR_MANAGER')
    async getRecentActivity(@Query('limit') limit?: string) {
        return this.auditService.getRecentActivity(limit ? parseInt(limit) : 20);
    }

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER')
    async getStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const end = endDate ? new Date(endDate) : new Date();

        return this.auditService.getActivityStats(start, end);
    }

    @Get('entity/:entityType/:entityId')
    @Roles('CEO', 'HR_MANAGER')
    async getEntityHistory(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        return this.auditService.findByEntity(entityType, entityId);
    }

    @Get('user/:userId')
    @Roles('CEO', 'HR_MANAGER')
    async getUserActivity(
        @Param('userId') userId: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditService.findByUser(userId, limit ? parseInt(limit) : 50);
    }

    @Get('user/:userId/logins')
    @Roles('CEO', 'HR_MANAGER')
    async getLoginHistory(
        @Param('userId') userId: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditService.getLoginHistory(userId, limit ? parseInt(limit) : 10);
    }
}
