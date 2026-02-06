import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { Branch } from './entities/branch.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import {
    CreateRegionDto, UpdateRegionDto,
    CreateBranchDto, UpdateBranchDto,
    CreateDepartmentDto, UpdateDepartmentDto,
    CreatePositionDto, UpdatePositionDto,
} from './dto/org.dto';

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

    // ==================== REGIONS ====================

    async createRegion(dto: CreateRegionDto): Promise<Region> {
        const code = dto.code || this.generateCode(dto.name);
        
        const existing = await this.regionRepo.findOne({ where: { code } });
        if (existing) {
            throw new ConflictException(`Region with code "${code}" already exists`);
        }

        const region = this.regionRepo.create({
            name: dto.name,
            code,
            description: dto.description,
        });
        return this.regionRepo.save(region);
    }

    async getRegions(includeInactive = false): Promise<Region[]> {
        const where = includeInactive ? {} : { is_active: true };
        return this.regionRepo.find({ 
            where,
            relations: ['branches'],
            order: { name: 'ASC' },
        });
    }

    async getRegion(id: string): Promise<Region> {
        const region = await this.regionRepo.findOne({ 
            where: { id }, 
            relations: ['branches'] 
        });
        if (!region) throw new NotFoundException('Region not found');
        return region;
    }

    async updateRegion(id: string, dto: UpdateRegionDto): Promise<Region> {
        const region = await this.getRegion(id);

        if (dto.code && dto.code !== region.code) {
            const existing = await this.regionRepo.findOne({ where: { code: dto.code } });
            if (existing) {
                throw new ConflictException(`Region with code "${dto.code}" already exists`);
            }
        }

        Object.assign(region, dto);
        return this.regionRepo.save(region);
    }

    async deleteRegion(id: string): Promise<{ message: string }> {
        const region = await this.regionRepo.findOne({
            where: { id },
            relations: ['branches'],
        });
        if (!region) throw new NotFoundException('Region not found');

        if (region.branches && region.branches.length > 0) {
            throw new BadRequestException(
                `Cannot delete region "${region.name}" - it has ${region.branches.length} branch(es)`
            );
        }

        await this.regionRepo.remove(region);
        return { message: 'Region deleted successfully' };
    }

    // ==================== BRANCHES ====================

    async createBranch(dto: CreateBranchDto): Promise<Branch> {
        const region = await this.regionRepo.findOne({ where: { id: dto.region_id } });
        if (!region) throw new NotFoundException('Region not found');

        const code = dto.code || this.generateCode(dto.name);
        
        const existing = await this.branchRepo.findOne({ where: { code } });
        if (existing) {
            throw new ConflictException(`Branch with code "${code}" already exists`);
        }

        const branch = this.branchRepo.create({
            name: dto.name,
            code,
            region,
            address: dto.address,
            phone: dto.phone,
            email: dto.email,
            target_disbursement: dto.target_disbursement,
            target_collection: dto.target_collection,
            target_clients: dto.target_clients,
        });
        return this.branchRepo.save(branch);
    }

    async getBranches(regionId?: string, includeInactive = false): Promise<Branch[]> {
        const qb = this.branchRepo.createQueryBuilder('branch')
            .leftJoinAndSelect('branch.region', 'region');

        if (regionId) {
            qb.where('region.id = :regionId', { regionId });
        }

        if (!includeInactive) {
            qb.andWhere('branch.is_active = true');
        }

        return qb.orderBy('branch.name', 'ASC').getMany();
    }

    async getBranch(id: string): Promise<Branch> {
        const branch = await this.branchRepo.findOne({ 
            where: { id }, 
            relations: ['region'] 
        });
        if (!branch) throw new NotFoundException('Branch not found');
        return branch;
    }

    async updateBranch(id: string, dto: UpdateBranchDto): Promise<Branch> {
        const branch = await this.getBranch(id);

        if (dto.code && dto.code !== branch.code) {
            const existing = await this.branchRepo.findOne({ where: { code: dto.code } });
            if (existing) {
                throw new ConflictException(`Branch with code "${dto.code}" already exists`);
            }
        }

        if (dto.region_id) {
            const region = await this.regionRepo.findOne({ where: { id: dto.region_id } });
            if (!region) throw new NotFoundException('Region not found');
            branch.region = region;
        }

        const { region_id, ...updateData } = dto;
        Object.assign(branch, updateData);
        return this.branchRepo.save(branch);
    }

    async deleteBranch(id: string): Promise<{ message: string }> {
        const branch = await this.getBranch(id);
        await this.branchRepo.remove(branch);
        return { message: 'Branch deleted successfully' };
    }

    // ==================== DEPARTMENTS ====================

    async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
        const code = dto.code || this.generateCode(dto.name);
        
        const existing = await this.departmentRepo.findOne({ where: { code } });
        if (existing) {
            throw new ConflictException(`Department with code "${code}" already exists`);
        }

        const department = this.departmentRepo.create({
            name: dto.name,
            code,
            description: dto.description,
        });

        if (dto.parent_id) {
            const parent = await this.departmentRepo.findOne({ where: { id: dto.parent_id } });
            if (!parent) throw new NotFoundException('Parent department not found');
            department.parent = parent;
        }

        return this.departmentRepo.save(department);
    }

    async getDepartments(includeInactive = false): Promise<Department[]> {
        const where = includeInactive ? {} : { is_active: true };
        return this.departmentRepo.find({
            where,
            relations: ['parent', 'children'],
            order: { name: 'ASC' },
        });
    }

    async getDepartment(id: string): Promise<Department> {
        const dept = await this.departmentRepo.findOne({ 
            where: { id },
            relations: ['parent', 'children'],
        });
        if (!dept) throw new NotFoundException('Department not found');
        return dept;
    }

    async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<Department> {
        const department = await this.getDepartment(id);

        if (dto.code && dto.code !== department.code) {
            const existing = await this.departmentRepo.findOne({ where: { code: dto.code } });
            if (existing) {
                throw new ConflictException(`Department with code "${dto.code}" already exists`);
            }
        }

        if (dto.parent_id) {
            if (dto.parent_id === id) {
                throw new BadRequestException('Department cannot be its own parent');
            }
            const parent = await this.departmentRepo.findOne({ where: { id: dto.parent_id } });
            if (!parent) throw new NotFoundException('Parent department not found');
            department.parent = parent;
        } else if (dto.parent_id === null) {
            department.parent = undefined;
        }

        const { parent_id, ...updateData } = dto;
        Object.assign(department, updateData);
        return this.departmentRepo.save(department);
    }

    async deleteDepartment(id: string): Promise<{ message: string }> {
        const department = await this.departmentRepo.findOne({
            where: { id },
            relations: ['children'],
        });
        if (!department) throw new NotFoundException('Department not found');

        if (department.children && department.children.length > 0) {
            throw new BadRequestException(
                `Cannot delete department "${department.name}" - it has ${department.children.length} child department(s)`
            );
        }

        await this.departmentRepo.remove(department);
        return { message: 'Department deleted successfully' };
    }

    // ==================== POSITIONS ====================

    async createPosition(dto: CreatePositionDto): Promise<Position> {
        const code = dto.code || this.generateCode(dto.name);
        
        const existing = await this.positionRepo.findOne({ where: { code } });
        if (existing) {
            throw new ConflictException(`Position with code "${code}" already exists`);
        }

        const position = this.positionRepo.create({
            name: dto.name,
            code,
            description: dto.description,
            level: dto.level ?? 0,
        });

        if (dto.department_id) {
            const department = await this.departmentRepo.findOne({ where: { id: dto.department_id } });
            if (!department) throw new NotFoundException('Department not found');
            position.department = department;
        }

        if (dto.reports_to_id) {
            const reportsTo = await this.positionRepo.findOne({ where: { id: dto.reports_to_id } });
            if (!reportsTo) throw new NotFoundException('Reports-to position not found');
            position.reports_to = reportsTo;
        }

        return this.positionRepo.save(position);
    }

    async getPositions(includeInactive = false): Promise<Position[]> {
        const where = includeInactive ? {} : { is_active: true };
        return this.positionRepo.find({
            where,
            relations: ['department', 'reports_to'],
            order: { level: 'ASC', name: 'ASC' },
        });
    }

    async getPosition(id: string): Promise<Position> {
        const pos = await this.positionRepo.findOne({ 
            where: { id },
            relations: ['department', 'reports_to'],
        });
        if (!pos) throw new NotFoundException('Position not found');
        return pos;
    }

    async updatePosition(id: string, dto: UpdatePositionDto): Promise<Position> {
        const position = await this.getPosition(id);

        if (dto.code && dto.code !== position.code) {
            const existing = await this.positionRepo.findOne({ where: { code: dto.code } });
            if (existing) {
                throw new ConflictException(`Position with code "${dto.code}" already exists`);
            }
        }

        if (dto.department_id) {
            const department = await this.departmentRepo.findOne({ where: { id: dto.department_id } });
            if (!department) throw new NotFoundException('Department not found');
            position.department = department;
        } else if (dto.department_id === null) {
            position.department = undefined;
        }

        if (dto.reports_to_id) {
            if (dto.reports_to_id === id) {
                throw new BadRequestException('Position cannot report to itself');
            }
            const reportsTo = await this.positionRepo.findOne({ where: { id: dto.reports_to_id } });
            if (!reportsTo) throw new NotFoundException('Reports-to position not found');
            position.reports_to = reportsTo;
        } else if (dto.reports_to_id === null) {
            position.reports_to = undefined;
        }

        const { department_id, reports_to_id, ...updateData } = dto;
        Object.assign(position, updateData);
        return this.positionRepo.save(position);
    }

    async deletePosition(id: string): Promise<{ message: string }> {
        const position = await this.getPosition(id);
        await this.positionRepo.remove(position);
        return { message: 'Position deleted successfully' };
    }

    // ==================== STATS ====================

    async getOrgStats(): Promise<{
        regions: number;
        branches: number;
        departments: number;
        positions: number;
    }> {
        const [regions, branches, departments, positions] = await Promise.all([
            this.regionRepo.count({ where: { is_active: true } }),
            this.branchRepo.count({ where: { is_active: true } }),
            this.departmentRepo.count({ where: { is_active: true } }),
            this.positionRepo.count({ where: { is_active: true } }),
        ]);

        return { regions, branches, departments, positions };
    }

    async getRegionStats(): Promise<{ id: string; name: string; branchCount: number }[]> {
        const regions = await this.regionRepo.find({
            where: { is_active: true },
            relations: ['branches'],
        });

        return regions.map(r => ({
            id: r.id,
            name: r.name,
            branchCount: r.branches?.filter(b => b.is_active).length || 0,
        }));
    }

    // ==================== ACTIVATE/DEACTIVATE ====================

    async activateRegion(id: string): Promise<Region> {
        const region = await this.getRegion(id);
        region.is_active = true;
        return this.regionRepo.save(region);
    }

    async deactivateRegion(id: string): Promise<Region> {
        const region = await this.getRegion(id);
        region.is_active = false;
        return this.regionRepo.save(region);
    }

    async activateBranch(id: string): Promise<Branch> {
        const branch = await this.getBranch(id);
        branch.is_active = true;
        return this.branchRepo.save(branch);
    }

    async deactivateBranch(id: string): Promise<Branch> {
        const branch = await this.getBranch(id);
        branch.is_active = false;
        return this.branchRepo.save(branch);
    }

    async activateDepartment(id: string): Promise<Department> {
        const dept = await this.getDepartment(id);
        dept.is_active = true;
        return this.departmentRepo.save(dept);
    }

    async deactivateDepartment(id: string): Promise<Department> {
        const dept = await this.getDepartment(id);
        dept.is_active = false;
        return this.departmentRepo.save(dept);
    }

    async activatePosition(id: string): Promise<Position> {
        const pos = await this.getPosition(id);
        pos.is_active = true;
        return this.positionRepo.save(pos);
    }

    async deactivatePosition(id: string): Promise<Position> {
        const pos = await this.getPosition(id);
        pos.is_active = false;
        return this.positionRepo.save(pos);
    }

    // ==================== ORG CHART ====================

    async getOrgChart(): Promise<{
        regions: Array<{
            id: string;
            name: string;
            code: string;
            manager_id?: string;
            branches: Array<{
                id: string;
                name: string;
                code: string;
                manager_id?: string;
            }>;
        }>;
        departments: Array<{
            id: string;
            name: string;
            code: string;
            parent_id?: string;
            children: any[];
        }>;
        positions: Array<{
            id: string;
            name: string;
            code: string;
            level: number;
            department_id?: string;
            reports_to_id?: string;
        }>;
    }> {
        const [regions, departments, positions] = await Promise.all([
            this.regionRepo.find({
                where: { is_active: true },
                relations: ['branches'],
                order: { name: 'ASC' },
            }),
            this.departmentRepo.find({
                where: { is_active: true },
                relations: ['parent', 'children'],
                order: { name: 'ASC' },
            }),
            this.positionRepo.find({
                where: { is_active: true },
                relations: ['department', 'reports_to'],
                order: { level: 'ASC', name: 'ASC' },
            }),
        ]);

        return {
            regions: regions.map(r => ({
                id: r.id,
                name: r.name,
                code: r.code,
                manager_id: r.manager_id,
                branches: (r.branches || [])
                    .filter(b => b.is_active)
                    .map(b => ({
                        id: b.id,
                        name: b.name,
                        code: b.code,
                        manager_id: b.manager_id,
                    })),
            })),
            departments: this.buildDepartmentTree(departments),
            positions: positions.map(p => ({
                id: p.id,
                name: p.name,
                code: p.code,
                level: p.level,
                department_id: p.department?.id,
                reports_to_id: p.reports_to?.id,
            })),
        };
    }

    private buildDepartmentTree(departments: Department[]): any[] {
        const rootDepts = departments.filter(d => !d.parent);
        return rootDepts.map(d => this.buildDeptNode(d, departments));
    }

    private buildDeptNode(dept: Department, allDepts: Department[]): any {
        const children = allDepts.filter(d => d.parent?.id === dept.id);
        return {
            id: dept.id,
            name: dept.name,
            code: dept.code,
            children: children.map(c => this.buildDeptNode(c, allDepts)),
        };
    }

    // ==================== POSITION HIERARCHY VALIDATION ====================

    async validatePositionHierarchy(positionId: string, reportsToId: string): Promise<boolean> {
        if (positionId === reportsToId) {
            return false;
        }

        // Check for circular reference
        const visited = new Set<string>();
        let currentId: string | undefined = reportsToId;

        while (currentId) {
            if (visited.has(currentId)) {
                return false; // Circular reference detected
            }
            if (currentId === positionId) {
                return false; // Would create circular reference
            }
            visited.add(currentId);

            const pos = await this.positionRepo.findOne({
                where: { id: currentId },
                relations: ['reports_to'],
            });
            currentId = pos?.reports_to?.id;
        }

        return true;
    }

    // ==================== MANAGER ASSIGNMENT ====================

    async assignRegionManager(regionId: string, managerId: string): Promise<Region> {
        const region = await this.getRegion(regionId);
        region.manager_id = managerId;
        return this.regionRepo.save(region);
    }

    async assignBranchManager(branchId: string, managerId: string): Promise<Branch> {
        const branch = await this.getBranch(branchId);
        branch.manager_id = managerId;
        return this.branchRepo.save(branch);
    }

    // ==================== HELPERS ====================

    private generateCode(name: string): string {
        return name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);
    }
}
