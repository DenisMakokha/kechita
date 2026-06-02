import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NextOfKin } from '../entities/next-of-kin.entity';
import { Dependent } from '../entities/dependent.entity';
import { SalaryHistory, SalaryChangeType } from '../entities/salary-history.entity';
import { ProbationReview, ProbationRecommendation } from '../entities/probation-review.entity';
import { Staff, StaffStatus, ProbationStatus } from '../entities/staff.entity';

/**
 * StaffPeopleService — handles related-people data for a staff member:
 * Next of Kin, Dependents, Salary History, Probation Reviews.
 * Extracted from the staff service god-object.
 */
@Injectable()
export class StaffPeopleService {
    constructor(
        @InjectRepository(NextOfKin) private nokRepo: Repository<NextOfKin>,
        @InjectRepository(Dependent) private depRepo: Repository<Dependent>,
        @InjectRepository(SalaryHistory) private salaryRepo: Repository<SalaryHistory>,
        @InjectRepository(ProbationReview) private reviewRepo: Repository<ProbationReview>,
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    ) {}

    // ───── Next of Kin ─────
    listNextOfKin(staffId: string) {
        return this.nokRepo.find({ where: { staff_id: staffId }, order: { is_primary: 'DESC', created_at: 'ASC' } });
    }

    async addNextOfKin(staffId: string, data: Partial<NextOfKin>) {
        if (data.is_primary) {
            // unset other primaries
            await this.nokRepo.update({ staff_id: staffId, is_primary: true }, { is_primary: false });
        }
        const saved = await this.nokRepo.save(this.nokRepo.create({ ...data, staff_id: staffId }));
        
        if (saved.is_primary) {
            await this.staffRepo.update(staffId, {
                emergency_contact_name: saved.full_name || undefined,
                emergency_contact_phone: saved.phone || undefined,
                emergency_contact_relationship: saved.relationship || undefined,
            });
        }
        return saved;
    }

    async updateNextOfKin(id: string, data: Partial<NextOfKin>) {
        const nok = await this.nokRepo.findOne({ where: { id } });
        if (!nok) throw new NotFoundException('Next of kin not found');
        if (data.is_primary && !nok.is_primary) {
            await this.nokRepo.update({ staff_id: nok.staff_id, is_primary: true }, { is_primary: false });
        }
        Object.assign(nok, data);
        const saved = await this.nokRepo.save(nok);

        if (saved.is_primary) {
            await this.staffRepo.update(saved.staff_id, {
                emergency_contact_name: saved.full_name || undefined,
                emergency_contact_phone: saved.phone || undefined,
                emergency_contact_relationship: saved.relationship || undefined,
            });
        }
        return saved;
    }

    async deleteNextOfKin(id: string) {
        const r = await this.nokRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Next of kin not found');
    }

    // ───── Dependents ─────
    listDependents(staffId: string) {
        return this.depRepo.find({ where: { staff_id: staffId }, order: { date_of_birth: 'ASC' } });
    }

    addDependent(staffId: string, data: Partial<Dependent>) {
        return this.depRepo.save(this.depRepo.create({ ...data, staff_id: staffId }));
    }

    async updateDependent(id: string, data: Partial<Dependent>) {
        const d = await this.depRepo.findOne({ where: { id } });
        if (!d) throw new NotFoundException('Dependent not found');
        Object.assign(d, data);
        return this.depRepo.save(d);
    }

    async deleteDependent(id: string) {
        const r = await this.depRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Dependent not found');
    }

    // ───── Salary History ─────
    listSalaryHistory(staffId: string) {
        return this.salaryRepo.find({ where: { staff_id: staffId }, order: { effective_date: 'DESC' } });
    }

    /** Record a salary change. Returns the new staff salary. Does not mutate Staff (caller must save). */
    async recordSalaryChange(
        staffId: string,
        data: {
            previous_salary?: number;
            new_salary: number;
            change_type?: SalaryChangeType;
            effective_date?: string;
            reason?: string;
            approved_by?: string;
        },
    ) {
        const change_percent = data.previous_salary && data.previous_salary > 0
            ? Number((((data.new_salary - data.previous_salary) / data.previous_salary) * 100).toFixed(2))
            : undefined;
        return this.salaryRepo.save(this.salaryRepo.create({
            staff_id: staffId,
            previous_salary: data.previous_salary,
            new_salary: data.new_salary,
            change_percent,
            change_type: data.change_type || SalaryChangeType.OTHER,
            effective_date: data.effective_date || new Date().toISOString().slice(0, 10),
            reason: data.reason,
            approved_by: data.approved_by,
        }));
    }

    async updateSalaryHistory(id: string, data: Partial<SalaryHistory>) {
        const sh = await this.salaryRepo.findOne({ where: { id } });
        if (!sh) throw new NotFoundException('Salary history entry not found');
        Object.assign(sh, data);
        return this.salaryRepo.save(sh);
    }

    async deleteSalaryHistory(id: string) {
        const r = await this.salaryRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Salary history entry not found');
    }

    /** Adjust salary directly (raise, correction, etc.) without changing position. */
    async adjustSalary(
        staffId: string,
        data: { new_salary: number; change_type?: SalaryChangeType; effective_date?: string; reason?: string },
        approvedBy?: string,
    ) {
        const staff = await this.staffRepo.findOne({ where: { id: staffId } });
        if (!staff) throw new NotFoundException('Staff not found');
        const previous = staff.basic_salary;
        await this.recordSalaryChange(staffId, { previous_salary: previous as any, new_salary: data.new_salary, change_type: data.change_type, effective_date: data.effective_date, reason: data.reason, approved_by: approvedBy });
        staff.basic_salary = data.new_salary;
        staff.updated_by = approvedBy;
        return this.staffRepo.save(staff);
    }

    // ───── Probation Reviews ─────
    listProbationReviews(staffId: string) {
        return this.reviewRepo.find({ where: { staff_id: staffId }, relations: ['reviewer'], order: { review_date: 'DESC' } });
    }

    async createProbationReview(staffId: string, data: Partial<ProbationReview>, reviewerId?: string) {
        const review = this.reviewRepo.create({
            ...data,
            staff_id: staffId,
            reviewer_id: reviewerId || data.reviewer_id,
            review_date: data.review_date || new Date().toISOString().slice(0, 10),
        });
        const saved = await this.reviewRepo.save(review);

        // If recommendation is decisive, update staff probation status
        if (data.recommendation && data.recommendation !== ProbationRecommendation.PENDING) {
            const staff = await this.staffRepo.findOne({ where: { id: staffId } });
            if (staff) {
                if (data.recommendation === ProbationRecommendation.CONFIRM) {
                    staff.probation_status = ProbationStatus.PASSED;
                    staff.status = StaffStatus.ACTIVE;
                    staff.confirmation_date = new Date();
                } else if (data.recommendation === ProbationRecommendation.EXTEND && data.extended_until) {
                    staff.probation_status = ProbationStatus.EXTENDED;
                    staff.probation_extended_until = new Date(data.extended_until);
                    staff.probation_end_date = new Date(data.extended_until);
                } else if (data.recommendation === ProbationRecommendation.TERMINATE) {
                    staff.probation_status = ProbationStatus.FAILED;
                    staff.status = StaffStatus.TERMINATED;
                    staff.termination_date = new Date();
                    staff.termination_reason = 'Failed probation';
                }
                await this.staffRepo.save(staff);
            }
        }
        return saved;
    }

    async acknowledgeProbationReview(id: string, comments?: string) {
        const r = await this.reviewRepo.findOne({ where: { id } });
        if (!r) throw new NotFoundException('Review not found');
        r.acknowledged_by_employee = true;
        r.acknowledged_at = new Date();
        if (comments) r.employee_comments = comments;
        return this.reviewRepo.save(r);
    }

    async updateProbationReview(id: string, data: Partial<ProbationReview>) {
        const r = await this.reviewRepo.findOne({ where: { id } });
        if (!r) throw new NotFoundException('Review not found');
        Object.assign(r, data);
        return this.reviewRepo.save(r);
    }

    async deleteProbationReview(id: string) {
        const r = await this.reviewRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Review not found');
    }
}
