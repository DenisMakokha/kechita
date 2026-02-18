import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query,
    UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, Req
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserService, UserListQuery } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserRolesDto, UpdateUserPasswordDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
    constructor(private userService: UserService) {}

    @Get()
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('role_code') role_code?: string,
        @Query('is_active') is_active?: string,
    ) {
        const query: UserListQuery = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            search,
            role_code,
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
        };
        return this.userService.findAll(query);
    }

    @Get('stats/by-role')
    @Roles('CEO', 'HR_MANAGER')
    async countByRole() {
        return this.userService.countByRole();
    }

    @Get('by-role/:roleCode')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async getUsersWithRole(@Param('roleCode') roleCode: string) {
        return this.userService.getUsersWithRole(roleCode);
    }

    @Get(':id')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.userService.findOne(id);
    }

    @Post()
    @Roles('CEO', 'HR_MANAGER')
    async create(@Body() dto: CreateUserDto) {
        return this.userService.create(dto);
    }

    @Patch(':id')
    @Roles('CEO', 'HR_MANAGER')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserDto,
        @Req() req: any,
    ) {
        return this.userService.update(id, dto, req.user?.roles);
    }

    @Patch(':id/roles')
    @Roles('CEO', 'HR_MANAGER')
    async updateRoles(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserRolesDto,
        @Req() req: any,
    ) {
        return this.userService.updateRoles(id, dto, req.user?.roles);
    }

    @Post(':id/roles/:roleCode')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    async addRole(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('roleCode') roleCode: string,
        @Req() req: any,
    ) {
        return this.userService.addRole(id, roleCode, req.user?.roles);
    }

    @Delete(':id/roles/:roleCode')
    @Roles('CEO', 'HR_MANAGER')
    async removeRole(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('roleCode') roleCode: string,
        @Req() req: any,
    ) {
        return this.userService.removeRole(id, roleCode, req.user?.roles);
    }

    @Patch(':id/password')
    @Roles('CEO', 'HR_MANAGER')
    async updatePassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateUserPasswordDto,
        @Req() req: any,
    ) {
        return this.userService.updatePassword(id, dto, req.user?.roles);
    }

    @Post(':id/activate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    async activate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
        return this.userService.activate(id, req.user?.roles);
    }

    @Post(':id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    async deactivate(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
        return this.userService.deactivate(id, req.user?.roles);
    }

    @Delete(':id')
    @Roles('CEO')
    async delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
        return this.userService.delete(id, req.user?.roles);
    }
}
