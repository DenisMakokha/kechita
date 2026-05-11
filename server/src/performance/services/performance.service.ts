import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ReviewCycle, ReviewCycleStatus } from '../entities/review-cycle.entity';
import { Review, ReviewerType, ReviewStatus } from '../entities/review.entity';
import { Goal, GoalStatus } from '../entities/goal.entity';
import { KeyResult } from '../entities/key-result.entity';
import { Staff } from '../../staff/entities/staff.entity';

@Injectable()
export class PerformanceService {
    private readonly logger = new Logger(PerformanceService.name);

    constructor(
        @InjectRepository(ReviewCycle) private cycleRepo: Repository<ReviewCycle>,
        @InjectRepository(Review) private reviewRepo: Repository<Review>,
        @InjectRepository(Goal) private goalRepo: Repository<Goal>,
        @InjectRepository(KeyResult) private krRepo: Repository<KeyResult>,
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    ) {}

    // ─────────── Review Cycles ───────────
    async listCycles(): Promise<ReviewCycle[]> {
        return this.cycleRepo.find({ order: { created_at: 'DESC' } });
    }

    async getCycle(id: string): Promise<ReviewCycle> {
        const c = await this.cycleRepo.findOne({ where: { id } });
        if (!c) throw new NotFoundException('Review cycle not found');
        return c;
    }

    async createCycle(dto: Partial<ReviewCycle>, userId?: string): Promise<ReviewCycle> {
        const cycle = this.cycleRepo.create({ ...dto, created_by_user_id: userId, status: ReviewCycleStatus.DRAFT });
        return this.cycleRepo.save(cycle);
    }

    async updateCycle(id: string, dto: Partial<ReviewCycle>): Promise<ReviewCycle> {
        const cycle = await this.getCycle(id);
        Object.assign(cycle, dto);
        return this.cycleRepo.save(cycle);
    }

    async transitionCycle(id: string, newStatus: ReviewCycleStatus): Promise<ReviewCycle> {
        const cycle = await this.getCycle(id);
        cycle.status = newStatus;
        return this.cycleRepo.save(cycle);
    }

    /**
     * Launch a cycle: create review records for all active staff (self + manager).
     * Pulls manager_id from Staff entity.
     */
    async launchCycle(id: string, staffIds?: string[]): Promise<{ created: number }> {
        const cycle = await this.getCycle(id);
        if (cycle.status !== ReviewCycleStatus.DRAFT && cycle.status !== ReviewCycleStatus.SELF_REVIEW) {
            throw new BadRequestException('Can only launch from DRAFT or SELF_REVIEW status');
        }

        const where: any = { status: 'active' };
        if (staffIds && staffIds.length > 0) where.id = In(staffIds);
        const staffList = await this.staffRepo.find({ where, relations: [] });

        let created = 0;
        for (const staff of staffList) {
            // Self review
            const existing = await this.reviewRepo.findOne({ where: { cycle_id: id, reviewee_id: staff.id, reviewer_id: staff.id, reviewer_type: ReviewerType.SELF } });
            if (!existing) {
                const selfReview = this.reviewRepo.create({
                    cycle_id: id,
                    reviewee_id: staff.id,
                    reviewer_id: staff.id,
                    reviewer_type: ReviewerType.SELF,
                    status: ReviewStatus.PENDING,
                });
                await this.reviewRepo.save(selfReview);
                created++;
            }

            // Manager review
            const managerId = (staff as any).manager_id;
            if (managerId) {
                const existingMgr = await this.reviewRepo.findOne({ where: { cycle_id: id, reviewee_id: staff.id, reviewer_id: managerId, reviewer_type: ReviewerType.MANAGER } });
                if (!existingMgr) {
                    const mgrReview = this.reviewRepo.create({
                        cycle_id: id,
                        reviewee_id: staff.id,
                        reviewer_id: managerId,
                        reviewer_type: ReviewerType.MANAGER,
                        status: ReviewStatus.PENDING,
                    });
                    await this.reviewRepo.save(mgrReview);
                    created++;
                }
            }
        }

        if (cycle.status === ReviewCycleStatus.DRAFT) {
            cycle.status = ReviewCycleStatus.SELF_REVIEW;
            await this.cycleRepo.save(cycle);
        }

        return { created };
    }

    // ─────────── Reviews ───────────
    async getReview(id: string): Promise<Review> {
        const r = await this.reviewRepo.findOne({ where: { id }, relations: ['cycle', 'reviewee', 'reviewer'] });
        if (!r) throw new NotFoundException('Review not found');
        return r;
    }

    /** Get all reviews where I am the reviewer (i.e., my action items) */
    async getMyReviewsToGive(reviewerStaffId: string): Promise<Review[]> {
        return this.reviewRepo.find({
            where: { reviewer_id: reviewerStaffId, status: In([ReviewStatus.PENDING, ReviewStatus.IN_PROGRESS]) },
            relations: ['cycle', 'reviewee'],
            order: { created_at: 'DESC' },
        });
    }

    /** Reviews about me (mine to read once submitted) */
    async getMyReviewsAboutMe(revieweeStaffId: string): Promise<Review[]> {
        return this.reviewRepo.find({
            where: { reviewee_id: revieweeStaffId, status: In([ReviewStatus.SUBMITTED, ReviewStatus.ACKNOWLEDGED, ReviewStatus.DISPUTED]) },
            relations: ['cycle', 'reviewer'],
            order: { submitted_at: 'DESC' },
        });
    }

    async listCycleReviews(cycleId: string): Promise<Review[]> {
        return this.reviewRepo.find({
            where: { cycle_id: cycleId },
            relations: ['reviewee', 'reviewer'],
            order: { created_at: 'DESC' },
        });
    }

    async saveReviewDraft(id: string, dto: Partial<Review>, reviewerStaffId: string): Promise<Review> {
        const review = await this.getReview(id);
        if (review.reviewer_id !== reviewerStaffId) throw new ForbiddenException('Not your review to edit');
        if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.IN_PROGRESS) {
            throw new BadRequestException('Cannot edit a submitted review');
        }
        Object.assign(review, dto);
        review.status = ReviewStatus.IN_PROGRESS;
        return this.reviewRepo.save(review);
    }

    async submitReview(id: string, dto: Partial<Review>, reviewerStaffId: string): Promise<Review> {
        const review = await this.getReview(id);
        if (review.reviewer_id !== reviewerStaffId) throw new ForbiddenException('Not your review to submit');
        if (review.status === ReviewStatus.SUBMITTED || review.status === ReviewStatus.ACKNOWLEDGED) {
            throw new BadRequestException('Already submitted');
        }
        Object.assign(review, dto);
        // Compute overall_rating as weighted mean if competency_ratings present and cycle has framework
        if (review.competency_ratings && review.cycle?.competency_framework) {
            let total = 0, weightTotal = 0;
            for (const comp of review.cycle.competency_framework) {
                const r = review.competency_ratings[comp.code];
                if (r?.rating) {
                    total += r.rating * comp.weight;
                    weightTotal += comp.weight;
                }
            }
            if (weightTotal > 0) review.overall_rating = Math.round((total / weightTotal) * 100) / 100;
        }
        review.status = ReviewStatus.SUBMITTED;
        review.submitted_at = new Date();
        return this.reviewRepo.save(review);
    }

    async acknowledgeReview(id: string, comments: string | undefined, revieweeStaffId: string): Promise<Review> {
        const review = await this.getReview(id);
        if (review.reviewee_id !== revieweeStaffId) throw new ForbiddenException('Not your review');
        if (review.status !== ReviewStatus.SUBMITTED) throw new BadRequestException('Review must be submitted first');
        review.status = ReviewStatus.ACKNOWLEDGED;
        review.acknowledged_at = new Date();
        review.reviewee_comments = comments;
        return this.reviewRepo.save(review);
    }

    async disputeReview(id: string, reason: string, revieweeStaffId: string): Promise<Review> {
        const review = await this.getReview(id);
        if (review.reviewee_id !== revieweeStaffId) throw new ForbiddenException('Not your review');
        if (review.status !== ReviewStatus.SUBMITTED) throw new BadRequestException('Can only dispute a submitted review');
        review.status = ReviewStatus.DISPUTED;
        review.is_disputed = true;
        review.dispute_reason = reason;
        return this.reviewRepo.save(review);
    }

    // ─────────── Goals ───────────
    async listStaffGoals(staffId: string, status?: GoalStatus): Promise<Goal[]> {
        const where: any = { staff_id: staffId };
        if (status) where.status = status;
        return this.goalRepo.find({ where, relations: ['key_results'], order: { due_date: 'ASC' } });
    }

    async createGoal(dto: Partial<Goal> & { staff_id: string }): Promise<Goal> {
        const goal = this.goalRepo.create({ ...dto, status: dto.status || GoalStatus.DRAFT });
        return this.goalRepo.save(goal);
    }

    async updateGoal(id: string, dto: Partial<Goal>): Promise<Goal> {
        const goal = await this.goalRepo.findOne({ where: { id } });
        if (!goal) throw new NotFoundException('Goal not found');
        Object.assign(goal, dto);
        // Auto-complete if 100%
        if (goal.progress_percent >= 100 && goal.status !== GoalStatus.COMPLETED) {
            goal.status = GoalStatus.COMPLETED;
            goal.completed_at = new Date().toISOString().slice(0, 10);
        }
        return this.goalRepo.save(goal);
    }

    async deleteGoal(id: string): Promise<void> {
        const r = await this.goalRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Goal not found');
    }

    // ─────────── Key Results ───────────
    async addKeyResult(goalId: string, dto: Partial<KeyResult>): Promise<KeyResult> {
        const goal = await this.goalRepo.findOne({ where: { id: goalId } });
        if (!goal) throw new NotFoundException('Goal not found');
        const kr = this.krRepo.create({ ...dto, goal_id: goalId });
        const saved = await this.krRepo.save(kr);
        await this.recalcGoalProgress(goalId);
        return saved;
    }

    async updateKeyResult(id: string, dto: Partial<KeyResult>): Promise<KeyResult> {
        const kr = await this.krRepo.findOne({ where: { id } });
        if (!kr) throw new NotFoundException('Key result not found');
        Object.assign(kr, dto);
        // Auto-compute progress for numeric type
        if (kr.type === 'numeric' && kr.target_value && kr.target_value > 0) {
            kr.progress_percent = Math.min(100, Math.round((Number(kr.current_value) / Number(kr.target_value)) * 100));
            if (kr.progress_percent >= 100) {
                kr.is_completed = true;
                if (!kr.completed_at) kr.completed_at = new Date().toISOString().slice(0, 10);
            }
        }
        const saved = await this.krRepo.save(kr);
        await this.recalcGoalProgress(kr.goal_id);
        return saved;
    }

    async deleteKeyResult(id: string): Promise<void> {
        const kr = await this.krRepo.findOne({ where: { id } });
        if (!kr) throw new NotFoundException('Key result not found');
        const goalId = kr.goal_id;
        await this.krRepo.delete(id);
        await this.recalcGoalProgress(goalId);
    }

    private async recalcGoalProgress(goalId: string): Promise<void> {
        const goal = await this.goalRepo.findOne({ where: { id: goalId }, relations: ['key_results'] });
        if (!goal || !goal.key_results || goal.key_results.length === 0) return;
        const avg = Math.round(goal.key_results.reduce((sum, kr) => sum + kr.progress_percent, 0) / goal.key_results.length);
        goal.progress_percent = avg;
        if (avg >= 100 && goal.status !== GoalStatus.COMPLETED) {
            goal.status = GoalStatus.COMPLETED;
            goal.completed_at = new Date().toISOString().slice(0, 10);
        } else if (avg < 100 && goal.status === GoalStatus.COMPLETED) {
            goal.status = GoalStatus.ACTIVE;
            goal.completed_at = undefined;
        }
        await this.goalRepo.save(goal);
    }

    // ─────────── Analytics ───────────
    async cycleAnalytics(cycleId: string): Promise<{
        total_reviews: number;
        by_status: Record<string, number>;
        completion_rate: number;
        average_overall_rating: number | null;
    }> {
        const reviews = await this.reviewRepo.find({ where: { cycle_id: cycleId } });
        const byStatus: Record<string, number> = {};
        let ratingSum = 0, ratingCount = 0;
        for (const r of reviews) {
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
            if (r.overall_rating) {
                ratingSum += Number(r.overall_rating);
                ratingCount++;
            }
        }
        const completed = (byStatus[ReviewStatus.SUBMITTED] || 0) + (byStatus[ReviewStatus.ACKNOWLEDGED] || 0);
        return {
            total_reviews: reviews.length,
            by_status: byStatus,
            completion_rate: reviews.length === 0 ? 0 : Math.round((completed / reviews.length) * 100),
            average_overall_rating: ratingCount === 0 ? null : Math.round((ratingSum / ratingCount) * 100) / 100,
        };
    }
}
