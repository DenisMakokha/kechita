import {
    Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BiodataService } from './services/biodata.service';

/**
 * BiodataController exposes CRUD endpoints for all expanded staff profile data:
 *   - Education, Work Experience, Skills, Languages
 *   - Assets, Bank Accounts
 *   - Next of Kin, Dependents
 *   - Completeness score
 *
 * All endpoints are scoped under /staff/:staffId/...
 */
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BiodataController {
    constructor(private readonly biodataService: BiodataService) {}

    // ==================== COMPLETENESS ====================

    @Get(':staffId/completeness')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    calculateCompleteness(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.calculateCompleteness(staffId).then(score => ({ score }));
    }

    // ==================== EDUCATION ====================

    @Get(':staffId/education')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listEducation(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listEducation(staffId);
    }

    @Post(':staffId/education')
    @Roles('CEO', 'HR_MANAGER')
    createEducation(@Param('staffId', ParseUUIDPipe) staffId: string, @Body() data: any) {
        return this.biodataService.createEducation(staffId, data);
    }

    @Put('education/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateEducation(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateEducation(id, data);
    }

    @Delete('education/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeEducation(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeEducation(id);
    }

    // ==================== WORK EXPERIENCE ====================

    @Get(':staffId/work-experience')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listWorkExperience(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listWorkExperience(staffId);
    }

    @Post(':staffId/work-experience')
    @Roles('CEO', 'HR_MANAGER')
    createWorkExperience(@Param('staffId', ParseUUIDPipe) staffId: string, @Body() data: any) {
        return this.biodataService.createWorkExperience(staffId, data);
    }

    @Put('work-experience/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateWorkExperience(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateWorkExperience(id, data);
    }

    @Delete('work-experience/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeWorkExperience(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeWorkExperience(id);
    }

    // ==================== SKILLS ====================

    @Get(':staffId/skills')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listSkills(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listSkills(staffId);
    }

    @Post(':staffId/skills')
    @Roles('CEO', 'HR_MANAGER')
    createSkill(@Param('staffId', ParseUUIDPipe) staffId: string, @Body() data: any) {
        return this.biodataService.createSkill(staffId, data);
    }

    @Put('skills/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateSkill(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateSkill(id, data);
    }

    @Delete('skills/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeSkill(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeSkill(id);
    }

    // ==================== LANGUAGES ====================

    @Get(':staffId/languages')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listLanguages(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listLanguages(staffId);
    }

    @Post(':staffId/languages')
    @Roles('CEO', 'HR_MANAGER')
    createLanguage(@Param('staffId', ParseUUIDPipe) staffId: string, @Body() data: any) {
        return this.biodataService.createLanguage(staffId, data);
    }

    @Put('languages/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateLanguage(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateLanguage(id, data);
    }

    @Delete('languages/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeLanguage(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeLanguage(id);
    }

    // ==================== ASSETS ====================

    @Get(':staffId/assets')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listAssets(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listAssets(staffId);
    }

    @Post(':staffId/assets')
    @Roles('CEO', 'HR_MANAGER')
    createAsset(
        @Param('staffId', ParseUUIDPipe) staffId: string,
        @Body() data: any,
        @Req() req: AuthenticatedRequest,
    ) {
        return this.biodataService.createAsset(staffId, data, req.user?.id);
    }

    @Put('assets/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateAsset(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateAsset(id, data);
    }

    @Delete('assets/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeAsset(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeAsset(id);
    }

    // ==================== BANK ACCOUNTS ====================

    @Get(':staffId/bank-accounts')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT')
    listBankAccounts(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listBankAccounts(staffId);
    }

    @Post(':staffId/bank-accounts')
    @Roles('CEO', 'HR_MANAGER')
    createBankAccount(@Param('staffId', ParseUUIDPipe) staffId: string, @Body() data: any) {
        return this.biodataService.createBankAccount(staffId, data);
    }

    @Put('bank-accounts/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateBankAccount(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateBankAccount(id, data);
    }

    @Delete('bank-accounts/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeBankAccount(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeBankAccount(id);
    }

    // ==================== NEXT OF KIN ====================

    @Get(':staffId/next-of-kin')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listNextOfKin(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listNextOfKin(staffId);
    }

    @Post(':staffId/next-of-kin')
    @Roles('CEO', 'HR_MANAGER')
    createNextOfKin(@Param('staffId', ParseUUIDPipe) staffId: string, @Body() data: any) {
        return this.biodataService.createNextOfKin(staffId, data);
    }

    @Put('next-of-kin/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateNextOfKin(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateNextOfKin(id, data);
    }

    @Delete('next-of-kin/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeNextOfKin(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeNextOfKin(id);
    }

    // ==================== DEPENDENTS ====================

    @Get(':staffId/dependents')
    @Roles('CEO', 'HR_MANAGER', 'HR_ASSISTANT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER')
    listDependents(@Param('staffId', ParseUUIDPipe) staffId: string) {
        return this.biodataService.listDependents(staffId);
    }

    @Post(':staffId/dependents')
    @Roles('CEO', 'HR_MANAGER')
    createDependent(@Param('staffId', ParseUUIDPipe) staffId: string, @Body() data: any) {
        return this.biodataService.createDependent(staffId, data);
    }

    @Put('dependents/:id')
    @Roles('CEO', 'HR_MANAGER')
    updateDependent(@Param('id', ParseUUIDPipe) id: string, @Body() data: any) {
        return this.biodataService.updateDependent(id, data);
    }

    @Delete('dependents/:id')
    @Roles('CEO', 'HR_MANAGER')
    removeDependent(@Param('id', ParseUUIDPipe) id: string) {
        return this.biodataService.removeDependent(id);
    }
}
