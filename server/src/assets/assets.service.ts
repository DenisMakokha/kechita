import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Asset, AssetStatus } from './entities/asset.entity';
import { AssetAssignment, AssignmentStatus } from './entities/asset-assignment.entity';

@Injectable()
export class AssetsService {
    constructor(
        @InjectRepository(Asset) private assetRepo: Repository<Asset>,
        @InjectRepository(AssetAssignment) private assignmentRepo: Repository<AssetAssignment>,
    ) {}

    // Assets
    async list(filters?: { category?: string; status?: AssetStatus; branch_id?: string }) {
        const where: any = {};
        if (filters?.category) where.category = filters.category;
        if (filters?.status) where.status = filters.status;
        if (filters?.branch_id) where.branch_id = filters.branch_id;
        return this.assetRepo.find({ where, order: { asset_tag: 'ASC' } });
    }

    async findOne(id: string) {
        const a = await this.assetRepo.findOne({ where: { id }, relations: ['assignments', 'assignments.staff'] });
        if (!a) throw new NotFoundException('Asset not found');
        return a;
    }

    async create(data: Partial<Asset>) {
        if (data.asset_tag) {
            const exists = await this.assetRepo.findOne({ where: { asset_tag: data.asset_tag } });
            if (exists) throw new ConflictException('Asset tag already exists');
        }
        return this.assetRepo.save(this.assetRepo.create({ ...data, status: data.status || AssetStatus.AVAILABLE }));
    }

    async update(id: string, data: Partial<Asset>) {
        const a = await this.findOne(id);
        Object.assign(a, data);
        return this.assetRepo.save(a);
    }

    async retire(id: string) {
        const a = await this.findOne(id);
        if (a.status === AssetStatus.ASSIGNED) throw new BadRequestException('Cannot retire an assigned asset — return it first');
        a.status = AssetStatus.RETIRED;
        return this.assetRepo.save(a);
    }

    // Assignments
    async assign(data: { asset_id: string; staff_id: string; assigned_at?: string; condition?: any; notes?: string; issued_by_user_id?: string }) {
        const asset = await this.findOne(data.asset_id);
        if (asset.status !== AssetStatus.AVAILABLE) throw new BadRequestException(`Asset is ${asset.status}, not available`);
        const assignment = this.assignmentRepo.create({
            asset_id: data.asset_id,
            staff_id: data.staff_id,
            assigned_at: data.assigned_at || new Date().toISOString().slice(0, 10),
            condition_at_assignment: data.condition,
            notes: data.notes,
            issued_by_user_id: data.issued_by_user_id,
            status: AssignmentStatus.ASSIGNED,
        });
        const saved = await this.assignmentRepo.save(assignment);
        asset.status = AssetStatus.ASSIGNED;
        await this.assetRepo.save(asset);
        return saved;
    }

    async returnAsset(assignmentId: string, data: { condition?: any; deduction_amount?: number; notes?: string; status?: AssignmentStatus; received_by_user_id?: string }) {
        const a = await this.assignmentRepo.findOne({ where: { id: assignmentId }, relations: ['asset'] });
        if (!a) throw new NotFoundException('Assignment not found');
        if (a.returned_at) throw new BadRequestException('Already returned');
        a.returned_at = new Date().toISOString().slice(0, 10);
        a.condition_at_return = data.condition;
        a.deduction_amount = data.deduction_amount;
        a.notes = data.notes ? (a.notes ? a.notes + '\n' : '') + data.notes : a.notes;
        a.status = data.status || AssignmentStatus.RETURNED;
        a.received_by_user_id = data.received_by_user_id;
        await this.assignmentRepo.save(a);

        // Update asset status based on return condition
        if (a.asset) {
            if (data.status === AssignmentStatus.LOST) a.asset.status = AssetStatus.LOST;
            else if (data.status === AssignmentStatus.DAMAGED_BY_STAFF) a.asset.status = AssetStatus.DAMAGED;
            else a.asset.status = AssetStatus.AVAILABLE;
            await this.assetRepo.save(a.asset);
        }
        return a;
    }

    listStaffAssets(staffId: string, activeOnly = false) {
        const where: any = { staff_id: staffId };
        if (activeOnly) where.status = AssignmentStatus.ASSIGNED;
        return this.assignmentRepo.find({ where, relations: ['asset'], order: { assigned_at: 'DESC' } });
    }

    async getStats() {
        const total = await this.assetRepo.count();
        const available = await this.assetRepo.count({ where: { status: AssetStatus.AVAILABLE } });
        const assigned = await this.assetRepo.count({ where: { status: AssetStatus.ASSIGNED } });
        const lost = await this.assetRepo.count({ where: { status: AssetStatus.LOST } });
        const damaged = await this.assetRepo.count({ where: { status: AssetStatus.DAMAGED } });
        return { total, available, assigned, lost, damaged };
    }

    /** Active assignments — used by termination/exit clearance checklists */
    async getActiveAssignmentsForStaff(staffId: string) {
        return this.assignmentRepo.find({
            where: { staff_id: staffId, status: AssignmentStatus.ASSIGNED },
            relations: ['asset'],
        });
    }
}
