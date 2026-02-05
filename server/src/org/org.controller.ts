import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
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

    // Regions
    @Get('regions')
    getRegions() {
        return this.orgService.getRegions();
    }

    @Get('regions/:id')
    getRegion(@Param('id') id: string) {
        return this.orgService.getRegion(id);
    }

    @Post('regions')
    @Roles('CEO', 'HR_MANAGER')
    createRegion(@Body() dto: CreateRegionDto) {
        return this.orgService.createRegion(dto);
    }

    @Put('regions/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateRegion(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
        return this.orgService.updateRegion(id, dto);
    }

    @Delete('regions/:id')
    @Roles('CEO')
    deleteRegion(@Param('id') id: string) {
        return this.orgService.deleteRegion(id);
    }

    // Branches
    @Get('branches')
    getBranches(@Query('region_id') regionId?: string) {
        return this.orgService.getBranches(regionId);
    }

    @Get('branches/:id')
    getBranch(@Param('id') id: string) {
        return this.orgService.getBranch(id);
    }

    @Post('branches')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    createBranch(@Body() dto: CreateBranchDto) {
        return this.orgService.createBranch(dto);
    }

    @Put('branches/:id')
    @Roles('CEO', 'HR_MANAGER', 'REGIONAL_MANAGER')
    updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
        return this.orgService.updateBranch(id, dto);
    }

    @Delete('branches/:id')
    @Roles('CEO', 'HR_MANAGER')
    deleteBranch(@Param('id') id: string) {
        return this.orgService.deleteBranch(id);
    }

    // Departments
    @Get('departments')
    getDepartments() {
        return this.orgService.getDepartments();
    }

    @Get('departments/:id')
    getDepartment(@Param('id') id: string) {
        return this.orgService.getDepartment(id);
    }

    @Post('departments')
    @Roles('CEO', 'HR_MANAGER')
    createDepartment(@Body() dto: CreateDepartmentDto) {
        return this.orgService.createDepartment(dto);
    }

    @Put('departments/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
        return this.orgService.updateDepartment(id, dto);
    }

    @Delete('departments/:id')
    @Roles('CEO')
    deleteDepartment(@Param('id') id: string) {
        return this.orgService.deleteDepartment(id);
    }

    // Positions
    @Get('positions')
    getPositions() {
        return this.orgService.getPositions();
    }

    @Get('positions/:id')
    getPosition(@Param('id') id: string) {
        return this.orgService.getPosition(id);
    }

    @Post('positions')
    @Roles('CEO', 'HR_MANAGER')
    createPosition(@Body() dto: CreatePositionDto) {
        return this.orgService.createPosition(dto);
    }

    @Put('positions/:id')
    @Roles('CEO', 'HR_MANAGER')
    updatePosition(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
        return this.orgService.updatePosition(id, dto);
    }

    @Delete('positions/:id')
    @Roles('CEO')
    deletePosition(@Param('id') id: string) {
        return this.orgService.deletePosition(id);
    }
}
