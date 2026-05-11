import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffAllowance } from '../entities/staff-allowance.entity';
import { StaffRecurringDeduction } from '../entities/staff-recurring-deduction.entity';
import { CreateAllowanceDto, UpdateAllowanceDto, CreateDeductionDto, UpdateDeductionDto } from '../dto/payroll.dto';

/**
 * CRUD for staff compensation components: allowances + recurring deductions.
 */
@Injectable()
export class StaffCompService {
    constructor(
        @InjectRepository(StaffAllowance) private allowanceRepo: Repository<StaffAllowance>,
        @InjectRepository(StaffRecurringDeduction) private deductionRepo: Repository<StaffRecurringDeduction>,
    ) {}

    // Allowances
    async listAllowances(staffId: string): Promise<StaffAllowance[]> {
        return this.allowanceRepo.find({ where: { staff_id: staffId }, order: { effective_from: 'DESC' } });
    }

    async createAllowance(dto: CreateAllowanceDto): Promise<StaffAllowance> {
        const a = this.allowanceRepo.create(dto);
        return this.allowanceRepo.save(a);
    }

    async updateAllowance(id: string, dto: UpdateAllowanceDto): Promise<StaffAllowance> {
        const a = await this.allowanceRepo.findOne({ where: { id } });
        if (!a) throw new NotFoundException('Allowance not found');
        Object.assign(a, dto);
        return this.allowanceRepo.save(a);
    }

    async deleteAllowance(id: string): Promise<void> {
        const r = await this.allowanceRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Allowance not found');
    }

    // Deductions
    async listDeductions(staffId: string): Promise<StaffRecurringDeduction[]> {
        return this.deductionRepo.find({ where: { staff_id: staffId }, order: { effective_from: 'DESC' } });
    }

    async createDeduction(dto: CreateDeductionDto): Promise<StaffRecurringDeduction> {
        const d = this.deductionRepo.create(dto);
        return this.deductionRepo.save(d);
    }

    async updateDeduction(id: string, dto: UpdateDeductionDto): Promise<StaffRecurringDeduction> {
        const d = await this.deductionRepo.findOne({ where: { id } });
        if (!d) throw new NotFoundException('Deduction not found');
        Object.assign(d, dto);
        return this.deductionRepo.save(d);
    }

    async deleteDeduction(id: string): Promise<void> {
        const r = await this.deductionRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Deduction not found');
    }
}
