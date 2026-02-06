import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query,
    UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleController {
    constructor(private roleService: RoleService) {}

    @Get()
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async findAll(@Query('include_inactive') includeInactive?: string) {
        return this.roleService.findAll(includeInactive === 'true');
    }

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER')
    async getRoleStats() {
        return this.roleService.getRoleStats();
    }

    @Get(':id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.roleService.findOne(id);
    }

    @Get(':id/user-count')
    @Roles('CEO', 'HR_MANAGER')
    async getUserCount(@Param('id', ParseUUIDPipe) id: string) {
        const count = await this.roleService.getUserCount(id);
        return { count };
    }

    @Post()
    @Roles('CEO')
    async create(@Body() dto: CreateRoleDto) {
        return this.roleService.create(dto);
    }

    @Patch(':id')
    @Roles('CEO')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.roleService.update(id, dto);
    }

    @Post(':id/activate')
    @Roles('CEO')
    @HttpCode(HttpStatus.OK)
    async activate(@Param('id', ParseUUIDPipe) id: string) {
        return this.roleService.activate(id);
    }

    @Post(':id/deactivate')
    @Roles('CEO')
    @HttpCode(HttpStatus.OK)
    async deactivate(@Param('id', ParseUUIDPipe) id: string) {
        return this.roleService.deactivate(id);
    }

    @Delete(':id')
    @Roles('CEO')
    async delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.roleService.delete(id);
    }
}
