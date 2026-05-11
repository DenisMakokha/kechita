import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryBand } from './entities/salary-band.entity';
import { BenefitPlan } from './entities/benefit-plan.entity';
import { BenefitEnrollment, EnrollmentStatus } from './entities/benefit-enrollment.entity';

@Injectable()
export class CompBenefitsService {
    constructor(
        @InjectRepository(SalaryBand) private bandRepo: Repository<SalaryBand>,
        @InjectRepository(BenefitPlan) private planRepo: Repository<BenefitPlan>,
        @InjectRepository(BenefitEnrollment) private enrollmentRepo: Repository<BenefitEnrollment>,
    ) {}

    // Salary bands
    listBands(activeOnly = false) {
        return this.bandRepo.find({ where: activeOnly ? { is_active: true } : {}, order: { grade_level: 'ASC' } });
    }
    async createBand(data: Partial<SalaryBand>) {
        if (data.code) {
            const exists = await this.bandRepo.findOne({ where: { code: data.code } });
            if (exists) throw new ConflictException('Band code already exists');
        }
        return this.bandRepo.save(this.bandRepo.create(data));
    }
    async updateBand(id: string, data: Partial<SalaryBand>) {
        const b = await this.bandRepo.findOne({ where: { id } });
        if (!b) throw new NotFoundException('Band not found');
        Object.assign(b, data);
        return this.bandRepo.save(b);
    }
    async deleteBand(id: string) {
        const r = await this.bandRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Band not found');
    }

    // Benefit plans
    listPlans(activeOnly = false) {
        return this.planRepo.find({ where: activeOnly ? { is_active: true } : {}, order: { type: 'ASC', name: 'ASC' } });
    }
    async createPlan(data: Partial<BenefitPlan>) {
        if (data.code) {
            const exists = await this.planRepo.findOne({ where: { code: data.code } });
            if (exists) throw new ConflictException('Plan code already exists');
        }
        return this.planRepo.save(this.planRepo.create(data));
    }
    async updatePlan(id: string, data: Partial<BenefitPlan>) {
        const p = await this.planRepo.findOne({ where: { id } });
        if (!p) throw new NotFoundException('Plan not found');
        Object.assign(p, data);
        return this.planRepo.save(p);
    }
    async deletePlan(id: string) {
        const r = await this.planRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Plan not found');
    }

    // Enrollments
    listStaffEnrollments(staffId: string) {
        return this.enrollmentRepo.find({ where: { staff_id: staffId }, relations: ['plan'], order: { effective_from: 'DESC' } });
    }
    listPlanEnrollments(planId: string) {
        return this.enrollmentRepo.find({ where: { plan_id: planId }, relations: ['staff'], order: { effective_from: 'DESC' } });
    }
    async enroll(data: Partial<BenefitEnrollment>) {
        return this.enrollmentRepo.save(this.enrollmentRepo.create({ ...data, status: data.status || EnrollmentStatus.PENDING }));
    }
    async updateEnrollment(id: string, data: Partial<BenefitEnrollment>) {
        const e = await this.enrollmentRepo.findOne({ where: { id } });
        if (!e) throw new NotFoundException('Enrollment not found');
        Object.assign(e, data);
        return this.enrollmentRepo.save(e);
    }
    async terminateEnrollment(id: string) {
        const e = await this.enrollmentRepo.findOne({ where: { id } });
        if (!e) throw new NotFoundException('Enrollment not found');
        e.status = EnrollmentStatus.CANCELLED;
        e.effective_to = new Date().toISOString().slice(0, 10);
        return this.enrollmentRepo.save(e);
    }

    async getStats() {
        const bands = await this.bandRepo.count({ where: { is_active: true } });
        const plans = await this.planRepo.count({ where: { is_active: true } });
        const activeEnrollments = await this.enrollmentRepo.count({ where: { status: EnrollmentStatus.ACTIVE } });
        return { active_salary_bands: bands, active_plans: plans, active_enrollments: activeEnrollments };
    }
}
