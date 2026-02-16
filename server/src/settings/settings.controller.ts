import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    @Roles('CEO', 'HR_MANAGER')
    getAll() {
        return this.settingsService.getAll();
    }

    @Get('category/:category')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getByCategory(@Param('category') category: string) {
        return this.settingsService.getByCategory(category);
    }

    @Get(':key')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    get(@Param('key') key: string) {
        return this.settingsService.get(key);
    }

    @Put(':key')
    @Roles('CEO', 'HR_MANAGER')
    set(
        @Param('key') key: string,
        @Body() body: { value: any; category?: string; description?: string },
    ) {
        return this.settingsService.set(key, body.value, body.category, body.description);
    }

    @Post('bulk')
    @Roles('CEO', 'HR_MANAGER')
    bulkSet(@Body() body: { entries: { key: string; value: any; category?: string; description?: string }[] }) {
        return this.settingsService.bulkSet(body.entries);
    }

    @Delete(':key')
    @Roles('CEO')
    remove(@Param('key') key: string) {
        return this.settingsService.remove(key);
    }
}
