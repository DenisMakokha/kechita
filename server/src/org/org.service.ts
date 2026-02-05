import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { Branch } from './entities/branch.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';

@Injectable()
export class OrgService {
    constructor(
        @InjectRepository(Region)
        private regionRepo: Repository<Region>,
        @InjectRepository(Branch)
        private branchRepo: Repository<Branch>,
        @InjectRepository(Department)
        private departmentRepo: Repository<Department>,
        @InjectRepository(Position)
        private positionRepo: Repository<Position>,
    ) { }

    // Regions
    async createRegion(data: { name: string; code: string }) {
        const region = this.regionRepo.create(data);
        return this.regionRepo.save(region);
    }

    async getRegions() {
        return this.regionRepo.find({ relations: ['branches'] });
    }

    async getRegion(id: string) {
        const region = await this.regionRepo.findOne({ where: { id }, relations: ['branches'] });
        if (!region) throw new NotFoundException('Region not found');
        return region;
    }

    async updateRegion(id: string, data: Partial<Region>) {
        await this.regionRepo.update(id, data);
        return this.getRegion(id);
    }

    async deleteRegion(id: string) {
        await this.regionRepo.delete(id);
        return { success: true };
    }

    // Branches
    async createBranch(data: { name: string; code: string; region_id: string }) {
        const region = await this.regionRepo.findOne({ where: { id: data.region_id } });
        if (!region) throw new NotFoundException('Region not found');

        const branch = this.branchRepo.create({
            name: data.name,
            code: data.code,
            region,
        });
        return this.branchRepo.save(branch);
    }

    async getBranches(regionId?: string) {
        const where = regionId ? { region: { id: regionId } } : {};
        return this.branchRepo.find({ where, relations: ['region'] });
    }

    async getBranch(id: string) {
        const branch = await this.branchRepo.findOne({ where: { id }, relations: ['region'] });
        if (!branch) throw new NotFoundException('Branch not found');
        return branch;
    }

    async updateBranch(id: string, data: Partial<Branch>) {
        await this.branchRepo.update(id, data);
        return this.getBranch(id);
    }

    async deleteBranch(id: string) {
        await this.branchRepo.delete(id);
        return { success: true };
    }

    // Departments
    async createDepartment(data: { name: string; code: string }) {
        const department = this.departmentRepo.create(data);
        return this.departmentRepo.save(department);
    }

    async getDepartments() {
        return this.departmentRepo.find();
    }

    async getDepartment(id: string) {
        const dept = await this.departmentRepo.findOne({ where: { id } });
        if (!dept) throw new NotFoundException('Department not found');
        return dept;
    }

    async updateDepartment(id: string, data: Partial<Department>) {
        await this.departmentRepo.update(id, data);
        return this.getDepartment(id);
    }

    async deleteDepartment(id: string) {
        await this.departmentRepo.delete(id);
        return { success: true };
    }

    // Positions
    async createPosition(data: { name: string; code: string }) {
        const position = this.positionRepo.create(data);
        return this.positionRepo.save(position);
    }

    async getPositions() {
        return this.positionRepo.find();
    }

    async getPosition(id: string) {
        const pos = await this.positionRepo.findOne({ where: { id } });
        if (!pos) throw new NotFoundException('Position not found');
        return pos;
    }

    async updatePosition(id: string, data: Partial<Position>) {
        await this.positionRepo.update(id, data);
        return this.getPosition(id);
    }

    async deletePosition(id: string) {
        await this.positionRepo.delete(id);
        return { success: true };
    }
}
