import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Claim, ClaimStatus } from './entities/claim.entity';
import { ClaimType } from './entities/claim-type.entity';
import { ClaimItem, ClaimItemStatus } from './entities/claim-item.entity';
import { ApprovalService, ApprovalCompletedEvent } from '../approval/approval.service';
import { Staff } from '../staff/entities/staff.entity';

interface SubmitClaimDto {
    purpose?: string;
    period_start?: string;
    period_end?: string;
    is_urgent?: boolean;
    items: {
        claim_type_id: string;
        description: string;
        amount: number;
        expense_date?: string;
        quantity?: number;
        unit_price?: number;
        unit?: string;
        receipt_number?: string;
        vendor_name?: string;
        document_id?: string;
    }[];
}

interface ClaimItemReview {
    item_id: string;
    approved_amount: number;
    status: ClaimItemStatus;
    comment?: string;
}

@Injectable()
export class ClaimsService {
    constructor(
        @InjectRepository(Claim)
        private claimRepo: Repository<Claim>,
        @InjectRepository(ClaimType)
        private claimTypeRepo: Repository<ClaimType>,
        @InjectRepository(ClaimItem)
        private claimItemRepo: Repository<ClaimItem>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        private approvalService: ApprovalService,
        private dataSource: DataSource,
    ) { }

    // ==================== APPROVAL EVENT LISTENER ====================

    @OnEvent('approval.completed')
    async handleApprovalCompleted(event: ApprovalCompletedEvent) {
        if (event.targetType !== 'claim') return;

        const claim = await this.claimRepo.findOne({
            where: { id: event.targetId },
            relations: ['items'],
        });
        if (!claim) return;

        const approver = await this.staffRepo.findOne({ where: { id: event.approverId } });

        if (event.status === 'approved') {
            claim.status = ClaimStatus.APPROVED;
            claim.approved_at = new Date();
            claim.approval_comment = event.comment;
            if (approver) claim.approvedBy = approver;
            // Set approved amount = total amount if not already reviewed
            if (!claim.approved_amount || claim.approved_amount === 0) {
                claim.approved_amount = claim.total_amount;
            }
        } else if (event.status === 'rejected') {
            claim.status = ClaimStatus.REJECTED;
            claim.rejected_at = new Date();
            claim.rejection_reason = event.comment;
            if (approver) claim.rejectedBy = approver;
        }

        await this.claimRepo.save(claim);
        console.log(`Claim ${claim.claim_number} status updated to ${claim.status}`);
    }

    // ==================== CLAIM TYPES ====================

    async getClaimTypes(includeInactive = false): Promise<ClaimType[]> {
        const where = includeInactive ? {} : { is_active: true };
        return this.claimTypeRepo.find({
            where,
            order: { display_order: 'ASC', name: 'ASC' },
        });
    }

    async getClaimTypesForStaff(staffId: string): Promise<ClaimType[]> {
        const staff = await this.staffRepo.findOne({
            where: { id: staffId },
            relations: ['position', 'user', 'user.roles'],
        });
        if (!staff) throw new NotFoundException('Staff not found');

        const allTypes = await this.getClaimTypes();

        // Filter by eligibility
        return allTypes.filter(type => {
            // Check position eligibility
            if (type.eligible_position_codes?.length) {
                if (!staff.position?.code || !type.eligible_position_codes.includes(staff.position.code)) {
                    return false;
                }
            }
            // Check role eligibility
            if (type.eligible_role_codes?.length) {
                const userRoles = staff.user?.roles?.map(r => r.code) || [];
                if (!type.eligible_role_codes.some(rc => userRoles.includes(rc))) {
                    return false;
                }
            }
            return true;
        });
    }

    async createClaimType(data: Partial<ClaimType>): Promise<ClaimType> {
        const claimType = this.claimTypeRepo.create(data);
        return this.claimTypeRepo.save(claimType);
    }

    async updateClaimType(id: string, data: Partial<ClaimType>): Promise<ClaimType> {
        const claimType = await this.claimTypeRepo.findOne({ where: { id } });
        if (!claimType) throw new NotFoundException('Claim type not found');
        Object.assign(claimType, data);
        return this.claimTypeRepo.save(claimType);
    }

    // ==================== CLAIMS ====================

    private generateClaimNumber(): string {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        return `CLM-${year}-${random}`;
    }

    async submitClaim(staffId: string, dto: SubmitClaimDto): Promise<Claim> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const staff = await queryRunner.manager.findOne(Staff, {
                where: { id: staffId },
                relations: ['branch', 'position'],
            });
            if (!staff) throw new NotFoundException('Staff not found');

            // Validate items
            if (!dto.items || dto.items.length === 0) {
                throw new BadRequestException('At least one claim item is required');
            }

            // Calculate total
            let totalAmount = 0;
            const validatedItems: { claimType: ClaimType; data: typeof dto.items[0] }[] = [];

            for (const itemData of dto.items) {
                const claimType = await queryRunner.manager.findOne(ClaimType, {
                    where: { id: itemData.claim_type_id, is_active: true },
                });
                if (!claimType) {
                    throw new BadRequestException(`Invalid claim type: ${itemData.claim_type_id}`);
                }

                const itemAmount = itemData.amount || (itemData.quantity || 1) * (itemData.unit_price || 0);

                // Validate against limits
                if (claimType.max_amount_per_claim && itemAmount > Number(claimType.max_amount_per_claim)) {
                    throw new BadRequestException(
                        `Amount for ${claimType.name} exceeds maximum of ${claimType.max_amount_per_claim}`
                    );
                }

                // Check receipts requirement
                if (claimType.requires_receipt && !itemData.document_id && !itemData.receipt_number) {
                    throw new BadRequestException(`${claimType.name} requires a receipt or document`);
                }

                totalAmount += itemAmount;
                validatedItems.push({ claimType, data: { ...itemData, amount: itemAmount } });
            }

            // Create claim
            const claim = queryRunner.manager.create(Claim, {
                claim_number: this.generateClaimNumber(),
                staff,
                claim_date: new Date(),
                period_start: dto.period_start ? new Date(dto.period_start) : undefined,
                period_end: dto.period_end ? new Date(dto.period_end) : undefined,
                total_amount: totalAmount,
                approved_amount: 0,
                paid_amount: 0,
                currency: 'KES',
                status: ClaimStatus.SUBMITTED,
                purpose: dto.purpose,
                is_urgent: dto.is_urgent || false,
                has_attachments: validatedItems.some(v => v.data.document_id),
                submitted_at: new Date(),
                submittedBy: staff,
            });
            const savedClaim = await queryRunner.manager.save(claim);

            // Create claim items
            for (const { claimType, data } of validatedItems) {
                const item = queryRunner.manager.create(ClaimItem, {
                    claim: savedClaim,
                    claimType,
                    description: data.description,
                    amount: data.amount,
                    expense_date: data.expense_date ? new Date(data.expense_date) : undefined,
                    quantity: data.quantity || 1,
                    unit_price: data.unit_price,
                    unit: data.unit,
                    receipt_number: data.receipt_number,
                    vendor_name: data.vendor_name,
                    document_id: data.document_id,
                    status: ClaimItemStatus.PENDING,
                });
                await queryRunner.manager.save(item);
            }

            await queryRunner.commitTransaction();

            // Initiate approval workflow
            try {
                const instance = await this.approvalService.initiateApproval(
                    'claim',
                    savedClaim.id,
                    'CLAIM_DEFAULT',
                    staff.id,
                    dto.is_urgent,
                );
                savedClaim.approval_instance_id = instance.id;
                await this.claimRepo.save(savedClaim);
            } catch (approvalErr: any) {
                console.warn('Could not initiate approval for claim:', approvalErr.message);
            }

            return this.findById(savedClaim.id);

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async saveDraft(staffId: string, dto: SubmitClaimDto): Promise<Claim> {
        const staff = await this.staffRepo.findOne({ where: { id: staffId } });
        if (!staff) throw new NotFoundException('Staff not found');

        const totalAmount = dto.items.reduce((sum, item) => sum + (item.amount || 0), 0);

        const claim = this.claimRepo.create({
            claim_number: this.generateClaimNumber(),
            staff,
            claim_date: new Date(),
            period_start: dto.period_start ? new Date(dto.period_start) : undefined,
            period_end: dto.period_end ? new Date(dto.period_end) : undefined,
            total_amount: totalAmount,
            currency: 'KES',
            status: ClaimStatus.DRAFT,
            purpose: dto.purpose,
            is_urgent: dto.is_urgent || false,
        });
        const savedClaim = await this.claimRepo.save(claim);

        // Save items
        for (const itemData of dto.items) {
            const claimType = await this.claimTypeRepo.findOne({ where: { id: itemData.claim_type_id } });
            if (!claimType) continue;

            const item = this.claimItemRepo.create({
                claim: savedClaim,
                claimType,
                description: itemData.description,
                amount: itemData.amount,
                expense_date: itemData.expense_date ? new Date(itemData.expense_date) : undefined,
                quantity: itemData.quantity || 1,
                unit_price: itemData.unit_price,
                unit: itemData.unit,
                receipt_number: itemData.receipt_number,
                vendor_name: itemData.vendor_name,
                document_id: itemData.document_id,
            });
            await this.claimItemRepo.save(item);
        }

        return this.findById(savedClaim.id);
    }

    async submitDraft(claimId: string, staffId: string): Promise<Claim> {
        const claim = await this.claimRepo.findOne({
            where: { id: claimId },
            relations: ['staff', 'items'],
        });

        if (!claim) throw new NotFoundException('Claim not found');
        if (claim.staff.id !== staffId) {
            throw new ForbiddenException('You can only submit your own claims');
        }
        if (claim.status !== ClaimStatus.DRAFT) {
            throw new BadRequestException('Only draft claims can be submitted');
        }
        if (!claim.items || claim.items.length === 0) {
            throw new BadRequestException('Cannot submit claim without items');
        }

        claim.status = ClaimStatus.SUBMITTED;
        claim.submitted_at = new Date();
        await this.claimRepo.save(claim);

        // Initiate approval
        try {
            const instance = await this.approvalService.initiateApproval(
                'claim',
                claim.id,
                'CLAIM_DEFAULT',
                claim.staff.id,
                claim.is_urgent,
            );
            claim.approval_instance_id = instance.id;
            await this.claimRepo.save(claim);
        } catch (err: any) {
            console.warn('Could not initiate approval:', err.message);
        }

        return claim;
    }

    async cancelClaim(claimId: string, staffId: string): Promise<Claim> {
        const claim = await this.claimRepo.findOne({
            where: { id: claimId },
            relations: ['staff'],
        });

        if (!claim) throw new NotFoundException('Claim not found');
        if (claim.staff.id !== staffId) {
            throw new ForbiddenException('You can only cancel your own claims');
        }
        if (claim.status !== ClaimStatus.DRAFT && claim.status !== ClaimStatus.SUBMITTED) {
            throw new BadRequestException('Only draft or submitted claims can be cancelled');
        }

        claim.status = ClaimStatus.CANCELLED;
        await this.claimRepo.save(claim);

        // Cancel approval instance if exists
        if (claim.approval_instance_id) {
            try {
                await this.approvalService.cancelApproval(claim.approval_instance_id);
            } catch (err: any) {
                console.warn('Could not cancel approval instance:', err.message);
            }
        }

        return claim;
    }

    // ==================== QUERIES ====================

    async findById(id: string): Promise<Claim> {
        const claim = await this.claimRepo.findOne({
            where: { id },
            relations: ['staff', 'staff.branch', 'staff.position', 'items', 'items.claimType', 'approvedBy', 'rejectedBy'],
        });
        if (!claim) throw new NotFoundException('Claim not found');
        return claim;
    }

    async findMyClaims(staffId: string, status?: ClaimStatus): Promise<Claim[]> {
        const where: any = { staff: { id: staffId } };
        if (status) where.status = status;

        return this.claimRepo.find({
            where,
            relations: ['items', 'items.claimType'],
            order: { created_at: 'DESC' },
        });
    }

    async findAll(filters?: {
        status?: ClaimStatus;
        staffId?: string;
        branchId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<Claim[]> {
        const query = this.claimRepo.createQueryBuilder('claim')
            .leftJoinAndSelect('claim.staff', 'staff')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('staff.position', 'position')
            .leftJoinAndSelect('claim.items', 'items')
            .leftJoinAndSelect('items.claimType', 'claimType')
            .orderBy('claim.created_at', 'DESC');

        if (filters?.status) {
            query.andWhere('claim.status = :status', { status: filters.status });
        }
        if (filters?.staffId) {
            query.andWhere('staff.id = :staffId', { staffId: filters.staffId });
        }
        if (filters?.branchId) {
            query.andWhere('branch.id = :branchId', { branchId: filters.branchId });
        }
        if (filters?.startDate) {
            query.andWhere('claim.claim_date >= :startDate', { startDate: filters.startDate });
        }
        if (filters?.endDate) {
            query.andWhere('claim.claim_date <= :endDate', { endDate: filters.endDate });
        }

        return query.getMany();
    }

    async findPendingReview(): Promise<Claim[]> {
        return this.claimRepo.find({
            where: [
                { status: ClaimStatus.SUBMITTED },
                { status: ClaimStatus.UNDER_REVIEW },
            ],
            relations: ['staff', 'staff.branch', 'items', 'items.claimType'],
            order: { is_urgent: 'DESC', submitted_at: 'ASC' },
        });
    }

    // ==================== REVIEW & APPROVAL CALLBACKS ====================

    async reviewItems(claimId: string, reviewerId: string, reviews: ClaimItemReview[]): Promise<Claim> {
        const claim = await this.findById(claimId);
        if (claim.status !== ClaimStatus.SUBMITTED && claim.status !== ClaimStatus.UNDER_REVIEW) {
            throw new BadRequestException('Claim is not under review');
        }

        claim.status = ClaimStatus.UNDER_REVIEW;

        let totalApproved = 0;
        for (const review of reviews) {
            const item = claim.items.find(i => i.id === review.item_id);
            if (!item) continue;

            item.status = review.status;
            item.approved_amount = review.approved_amount;
            item.review_comment = review.comment;
            item.reviewed_at = new Date();
            await this.claimItemRepo.save(item);

            if (review.status === ClaimItemStatus.APPROVED || review.status === ClaimItemStatus.PARTIALLY_APPROVED) {
                totalApproved += review.approved_amount;
            }
        }

        claim.approved_amount = totalApproved;
        return this.claimRepo.save(claim);
    }

    // Called by ApprovalService when claim is approved
    async onClaimApproved(claimId: string, approverId: string, comment?: string): Promise<void> {
        const claim = await this.findById(claimId);
        const approver = await this.staffRepo.findOne({ where: { id: approverId } });

        claim.status = ClaimStatus.APPROVED;
        claim.approved_at = new Date();
        claim.approvedBy = approver || undefined;
        claim.approval_comment = comment;

        // Auto-approve all pending items at full amount
        for (const item of claim.items) {
            if (item.status === ClaimItemStatus.PENDING) {
                item.status = ClaimItemStatus.APPROVED;
                item.approved_amount = item.amount;
                item.reviewed_at = new Date();
                await this.claimItemRepo.save(item);
            }
        }

        claim.approved_amount = claim.items.reduce((sum, i) => sum + Number(i.approved_amount), 0);
        await this.claimRepo.save(claim);
    }

    // Called by ApprovalService when claim is rejected
    async onClaimRejected(claimId: string, rejecterId: string, reason: string): Promise<void> {
        const claim = await this.findById(claimId);
        const rejecter = await this.staffRepo.findOne({ where: { id: rejecterId } });

        claim.status = ClaimStatus.REJECTED;
        claim.rejected_at = new Date();
        claim.rejectedBy = rejecter || undefined;
        claim.rejection_reason = reason;

        // Reject all pending items
        for (const item of claim.items) {
            if (item.status === ClaimItemStatus.PENDING) {
                item.status = ClaimItemStatus.REJECTED;
                item.approved_amount = 0;
                item.reviewed_at = new Date();
                await this.claimItemRepo.save(item);
            }
        }

        await this.claimRepo.save(claim);
    }

    // ==================== PAYMENT ====================

    async recordPayment(
        claimId: string,
        amount: number,
        paymentReference: string,
        paymentMethod: string,
    ): Promise<Claim> {
        const claim = await this.findById(claimId);
        if (claim.status !== ClaimStatus.APPROVED && claim.status !== ClaimStatus.PARTIALLY_PAID) {
            throw new BadRequestException('Only approved claims can be paid');
        }

        claim.paid_amount = Number(claim.paid_amount) + amount;
        claim.payment_reference = paymentReference;
        claim.payment_method = paymentMethod;
        claim.paid_at = new Date();

        if (claim.paid_amount >= claim.approved_amount) {
            claim.status = ClaimStatus.PAID;
        } else {
            claim.status = ClaimStatus.PARTIALLY_PAID;
        }

        return this.claimRepo.save(claim);
    }

    // ==================== STATISTICS ====================

    async getClaimStats(filters?: { staffId?: string; year?: number }): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        paid: number;
        totalAmount: number;
        approvedAmount: number;
        paidAmount: number;
        byType: { type: string; count: number; amount: number }[];
    }> {
        const year = filters?.year || new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        const query = this.claimRepo.createQueryBuilder('claim')
            .where('claim.claim_date BETWEEN :startDate AND :endDate', { startDate, endDate });

        if (filters?.staffId) {
            query.andWhere('claim.staff_id = :staffId', { staffId: filters.staffId });
        }

        const claims = await query.getMany();

        const pending = claims.filter(c => c.status === ClaimStatus.SUBMITTED || c.status === ClaimStatus.UNDER_REVIEW).length;
        const approved = claims.filter(c => c.status === ClaimStatus.APPROVED).length;
        const rejected = claims.filter(c => c.status === ClaimStatus.REJECTED).length;
        const paid = claims.filter(c => c.status === ClaimStatus.PAID || c.status === ClaimStatus.PARTIALLY_PAID).length;

        const totalAmount = claims.reduce((sum, c) => sum + Number(c.total_amount), 0);
        const approvedAmount = claims.reduce((sum, c) => sum + Number(c.approved_amount), 0);
        const paidAmount = claims.reduce((sum, c) => sum + Number(c.paid_amount), 0);

        // Get by type breakdown
        const itemQuery = this.claimItemRepo.createQueryBuilder('item')
            .leftJoin('item.claim', 'claim')
            .leftJoin('item.claimType', 'type')
            .select('type.name', 'type')
            .addSelect('COUNT(*)', 'count')
            .addSelect('SUM(item.amount)', 'amount')
            .where('claim.claim_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .groupBy('type.name');

        const byType = await itemQuery.getRawMany();

        return {
            total: claims.length,
            pending,
            approved,
            rejected,
            paid,
            totalAmount,
            approvedAmount,
            paidAmount,
            byType: byType.map(t => ({
                type: t.type,
                count: parseInt(t.count),
                amount: parseFloat(t.amount) || 0,
            })),
        };
    }
}
