import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
    CreateRegionDto, UpdateRegionDto,
    CreateBranchDto, UpdateBranchDto,
    CreateDepartmentDto, UpdateDepartmentDto,
    CreatePositionDto, UpdatePositionDto,
} from './dto/org.dto';

@Controller('org')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrgController {
    constructor(private readonly orgService: OrgService) { }

    // ==================== STATS ====================

    @Get('stats')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    getOrgStats() {
        return this.orgService.getOrgStats();
    }

    @Get('stats/regions')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    getRegionStats() {
        return this.orgService.getRegionStats();
    }

    // ==================== REGIONS ====================

    @Get('regions')
    getRegions(@Query('include_inactive') includeInactive?: string) {
        return this.orgService.getRegions(includeInactive === 'true');
    }

    @Get('regions/:id')
    getRegion(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.getRegion(id);
    }

    @Post('regions')
    @Roles('CEO', 'HR_MANAGER')
    createRegion(@Body() dto: CreateRegionDto) {
        return this.orgService.createRegion(dto);
    }

    @Put('regions/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateRegion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRegionDto) {
        return this.orgService.updateRegion(id, dto);
    }

    @Delete('regions/:id')
    @Roles('CEO')
    deleteRegion(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deleteRegion(id);
    }

    // ==================== BRANCHES ====================

    @Get('branches')
    getBranches(
        @Query('region_id') regionId?: string,
        @Query('include_inactive') includeInactive?: string,
    ) {
        return this.orgService.getBranches(regionId, includeInactive === 'true');
    }

    @Get('branches/:id')
    getBranch(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.getBranch(id);
    }

    @Post('branches')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    createBranch(@Body() dto: CreateBranchDto) {
        return this.orgService.createBranch(dto);
    }

    @Put('branches/:id')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    updateBranch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto) {
        return this.orgService.updateBranch(id, dto);
    }

    @Delete('branches/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteBranch(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deleteBranch(id);
    }

    // ==================== DEPARTMENTS ====================

    @Get('departments')
    getDepartments(@Query('include_inactive') includeInactive?: string) {
        return this.orgService.getDepartments(includeInactive === 'true');
    }

    @Get('departments/:id')
    getDepartment(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.getDepartment(id);
    }

    @Post('departments')
    @Roles('CEO', 'HR_MANAGER')
    createDepartment(@Body() dto: CreateDepartmentDto) {
        return this.orgService.createDepartment(dto);
    }

    @Put('departments/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
        return this.orgService.updateDepartment(id, dto);
    }

    @Delete('departments/:id')
    @Roles('CEO')
    deleteDepartment(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deleteDepartment(id);
    }

    // ==================== POSITIONS ====================

    @Get('positions')
    getPositions(@Query('include_inactive') includeInactive?: string) {
        return this.orgService.getPositions(includeInactive === 'true');
    }

    @Get('positions/:id')
    getPosition(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.getPosition(id);
    }

    @Post('positions')
    @Roles('CEO', 'HR_MANAGER')
    createPosition(@Body() dto: CreatePositionDto) {
        return this.orgService.createPosition(dto);
    }

    @Put('positions/:id')
    @Roles('CEO', 'HR_MANAGER')
    updatePosition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePositionDto) {
        return this.orgService.updatePosition(id, dto);
    }

    @Delete('positions/:id')
    @Roles('CEO')
    deletePosition(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deletePosition(id);
    }

    // ==================== ACTIVATE/DEACTIVATE ====================

    @Post('regions/:id/activate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    activateRegion(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.activateRegion(id);
    }

    @Post('regions/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    deactivateRegion(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deactivateRegion(id);
    }

    @Post('branches/:id/activate')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    @HttpCode(HttpStatus.OK)
    activateBranch(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.activateBranch(id);
    }

    @Post('branches/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    @HttpCode(HttpStatus.OK)
    deactivateBranch(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deactivateBranch(id);
    }

    @Post('departments/:id/activate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    activateDepartment(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.activateDepartment(id);
    }

    @Post('departments/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    deactivateDepartment(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deactivateDepartment(id);
    }

    @Post('positions/:id/activate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    activatePosition(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.activatePosition(id);
    }

    @Post('positions/:id/deactivate')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    deactivatePosition(@Param('id', ParseUUIDPipe) id: string) {
        return this.orgService.deactivatePosition(id);
    }

    // ==================== ORG CHART ====================

    @Get('chart')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    getOrgChart() {
        return this.orgService.getOrgChart();
    }

    // ==================== MANAGER ASSIGNMENT ====================

    @Post('regions/:id/manager')
    @Roles('CEO', 'HR_MANAGER')
    @HttpCode(HttpStatus.OK)
    assignRegionManager(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('manager_id', ParseUUIDPipe) managerId: string,
    ) {
        return this.orgService.assignRegionManager(id, managerId);
    }

    @Post('branches/:id/manager')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    @HttpCode(HttpStatus.OK)
    assignBranchManager(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('manager_id', ParseUUIDPipe) managerId: string,
    ) {
        return this.orgService.assignBranchManager(id, managerId);
    }
}
