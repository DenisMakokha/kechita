import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BackgroundCheck, BackgroundCheckType, BackgroundCheckStatus, BackgroundCheckResult } from './entities/background-check.entity';
import { ReferenceCheck, ReferenceCheckStatus } from './entities/reference-check.entity';
import { Candidate } from './entities/candidate.entity';
import { Staff } from '../staff/entities/staff.entity';
import { EmailService } from '../email/email.service';
import { Application } from './entities/application.entity';

// ==================== DTOs ====================

export interface InitiateBackgroundCheckDto {
    candidate_id: string;
    type: BackgroundCheckType;
    provider_name?: string;
    expected_completion_date?: string;
    cost?: number;
    currency?: string;
}

export interface UpdateBackgroundCheckDto {
    status?: BackgroundCheckStatus;
    result?: BackgroundCheckResult;
    findings?: string;
    detailed_results?: Record<string, any>;
    has_issues?: boolean;
    issue_description?: string;
    document_ids?: string[];
    completed_date?: string;
}

export interface CreateReferenceCheckDto {
    candidate_id: string;
    reference_name: string;
    reference_title?: string;
    reference_company?: string;
    reference_email: string;
    reference_phone?: string;
    relationship: string;
    years_known?: number;
    worked_from?: string;
    worked_to?: string;
}

export interface SubmitReferenceResponseDto {
    rating_work_quality?: number;
    rating_reliability?: number;
    rating_teamwork?: number;
    rating_communication?: number;
    rating_leadership?: number;
    overall_rating?: number;
    would_rehire?: boolean;
    strengths?: string;
    areas_for_improvement?: string;
    additional_comments?: string;
    reason_for_leaving?: string;
}

@Injectable()
export class BackgroundCheckService {
    constructor(
        @InjectRepository(BackgroundCheck)
        private bgCheckRepo: Repository<BackgroundCheck>,
        @InjectRepository(ReferenceCheck)
        private refCheckRepo: Repository<ReferenceCheck>,
        @InjectRepository(Candidate)
        private candidateRepo: Repository<Candidate>,
        @InjectRepository(Application)
        private applicationRepo: Repository<Application>,
        private emailService: EmailService,
    ) { }

    // ==================== BACKGROUND CHECKS ====================

    async initiateBackgroundCheck(data: InitiateBackgroundCheckDto, initiatedById: string): Promise<BackgroundCheck> {
        const candidate = await this.candidateRepo.findOneBy({ id: data.candidate_id });
        if (!candidate) throw new NotFoundException('Candidate not found');

        const checkNumber = `BGC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const bgCheck = this.bgCheckRepo.create({
            check_number: checkNumber,
            candidate,
            type: data.type,
            status: BackgroundCheckStatus.PENDING,
            provider_name: data.provider_name,
            expected_completion_date: data.expected_completion_date ? new Date(data.expected_completion_date) : undefined,
            initiated_date: new Date(),
            cost: data.cost,
            currency: data.currency || 'KES',
            initiatedBy: { id: initiatedById } as Staff,
        });

        const saved = await this.bgCheckRepo.save(bgCheck);

        // Get job title from candidate's application
        const applications = await this.applicationRepo.find({
            where: { candidate: { id: candidate.id } },
            relations: ['jobPost'],
            order: { applied_at: 'DESC' },
            take: 1,
        });
        const application = applications[0];
        const jobTitle = application?.jobPost?.title || 'Position Applied';

        // Send notification email to candidate
        await this.emailService.sendBackgroundCheckInitiated({
            candidateEmail: candidate.email,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            checkType: data.type,
            jobTitle,
            expectedDays: data.expected_completion_date
                ? Math.ceil((new Date(data.expected_completion_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : undefined,
        });

        return saved;
    }

    async updateBackgroundCheck(id: string, data: UpdateBackgroundCheckDto): Promise<BackgroundCheck> {
        const bgCheck = await this.bgCheckRepo.findOneBy({ id });
        if (!bgCheck) throw new NotFoundException('Background check not found');

        Object.assign(bgCheck, {
            ...data,
            completed_date: data.completed_date ? new Date(data.completed_date) : bgCheck.completed_date,
        });

        if (data.status === BackgroundCheckStatus.COMPLETED && !bgCheck.completed_date) {
            bgCheck.completed_date = new Date();
        }

        return this.bgCheckRepo.save(bgCheck);
    }

    async reviewBackgroundCheck(id: string, reviewedById: string, notes?: string): Promise<BackgroundCheck> {
        const bgCheck = await this.bgCheckRepo.findOneBy({ id });
        if (!bgCheck) throw new NotFoundException('Background check not found');

        bgCheck.reviewedBy = { id: reviewedById } as Staff;
        bgCheck.reviewed_at = new Date();
        bgCheck.reviewer_notes = notes;

        return this.bgCheckRepo.save(bgCheck);
    }

    async getBackgroundCheck(id: string): Promise<BackgroundCheck> {
        const bgCheck = await this.bgCheckRepo.findOne({
            where: { id },
            relations: ['candidate', 'initiatedBy', 'reviewedBy'],
        });
        if (!bgCheck) throw new NotFoundException('Background check not found');
        return bgCheck;
    }

    async getBackgroundChecksForCandidate(candidateId: string): Promise<BackgroundCheck[]> {
        return this.bgCheckRepo.find({
            where: { candidate: { id: candidateId } },
            relations: ['initiatedBy', 'reviewedBy'],
            order: { created_at: 'DESC' },
        });
    }

    async getPendingBackgroundChecks(): Promise<BackgroundCheck[]> {
        return this.bgCheckRepo.find({
            where: { status: In([BackgroundCheckStatus.PENDING, BackgroundCheckStatus.IN_PROGRESS]) },
            relations: ['candidate', 'initiatedBy'],
            order: { initiated_date: 'ASC' },
        });
    }

    async getBackgroundCheckSummary(candidateId: string): Promise<{
        total: number;
        pending: number;
        completed: number;
        clear: number;
        flagged: number;
        all_clear: boolean;
    }> {
        const checks = await this.getBackgroundChecksForCandidate(candidateId);

        const pending = checks.filter(c =>
            c.status === BackgroundCheckStatus.PENDING || c.status === BackgroundCheckStatus.IN_PROGRESS
        ).length;
        const completed = checks.filter(c => c.status === BackgroundCheckStatus.COMPLETED).length;
        const clear = checks.filter(c => c.result === BackgroundCheckResult.CLEAR).length;
        const flagged = checks.filter(c => c.result === BackgroundCheckResult.FLAGGED).length;

        return {
            total: checks.length,
            pending,
            completed,
            clear,
            flagged,
            all_clear: pending === 0 && flagged === 0 && completed > 0,
        };
    }

    // ==================== REFERENCE CHECKS ====================

    async createReferenceCheck(data: CreateReferenceCheckDto): Promise<ReferenceCheck> {
        const candidate = await this.candidateRepo.findOneBy({ id: data.candidate_id });
        if (!candidate) throw new NotFoundException('Candidate not found');

        const refCheck = this.refCheckRepo.create({
            candidate,
            reference_name: data.reference_name,
            reference_title: data.reference_title,
            reference_company: data.reference_company,
            reference_email: data.reference_email,
            reference_phone: data.reference_phone,
            relationship: data.relationship,
            years_known: data.years_known,
            worked_from: data.worked_from ? new Date(data.worked_from) : undefined,
            worked_to: data.worked_to ? new Date(data.worked_to) : undefined,
            status: ReferenceCheckStatus.PENDING,
        });

        const saved = await this.refCheckRepo.save(refCheck);

        // Get job title from candidate's application
        const applications = await this.applicationRepo.find({
            where: { candidate: { id: candidate.id } },
            relations: ['jobPost'],
            order: { applied_at: 'DESC' },
            take: 1,
        });
        const application = applications[0];
        const jobTitle = application?.jobPost?.title || 'Position Applied';

        // Send email to the reference
        await this.emailService.sendReferenceRequest({
            referenceEmail: data.reference_email,
            referenceName: data.reference_name,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            jobTitle,
            relationship: data.relationship,
        });

        return saved;
    }

    async recordContactAttempt(id: string, contactedById: string): Promise<ReferenceCheck> {
        const refCheck = await this.refCheckRepo.findOneBy({ id });
        if (!refCheck) throw new NotFoundException('Reference check not found');

        refCheck.contact_attempts += 1;
        refCheck.last_contact_attempt = new Date();
        refCheck.contactedBy = { id: contactedById } as Staff;

        if (refCheck.status === ReferenceCheckStatus.PENDING) {
            refCheck.status = ReferenceCheckStatus.CONTACTED;
        }

        return this.refCheckRepo.save(refCheck);
    }

    async submitReferenceResponse(id: string, data: SubmitReferenceResponseDto): Promise<ReferenceCheck> {
        const refCheck = await this.refCheckRepo.findOneBy({ id });
        if (!refCheck) throw new NotFoundException('Reference check not found');

        Object.assign(refCheck, {
            ...data,
            status: ReferenceCheckStatus.COMPLETED,
            completed_at: new Date(),
        });

        return this.refCheckRepo.save(refCheck);
    }

    async markAsUnreachable(id: string, notes?: string): Promise<ReferenceCheck> {
        const refCheck = await this.refCheckRepo.findOneBy({ id });
        if (!refCheck) throw new NotFoundException('Reference check not found');

        refCheck.status = ReferenceCheckStatus.UNREACHABLE;
        if (notes) {
            refCheck.additional_comments = notes;
        }

        return this.refCheckRepo.save(refCheck);
    }

    async verifyReference(id: string, verified: boolean, notes?: string): Promise<ReferenceCheck> {
        const refCheck = await this.refCheckRepo.findOneBy({ id });
        if (!refCheck) throw new NotFoundException('Reference check not found');

        refCheck.is_verified = verified;
        refCheck.verification_notes = notes;

        return this.refCheckRepo.save(refCheck);
    }

    async getReferenceCheck(id: string): Promise<ReferenceCheck> {
        const refCheck = await this.refCheckRepo.findOne({
            where: { id },
            relations: ['candidate', 'contactedBy'],
        });
        if (!refCheck) throw new NotFoundException('Reference check not found');
        return refCheck;
    }

    async getReferenceChecksForCandidate(candidateId: string): Promise<ReferenceCheck[]> {
        return this.refCheckRepo.find({
            where: { candidate: { id: candidateId } },
            relations: ['contactedBy'],
            order: { created_at: 'DESC' },
        });
    }

    async getReferenceSummary(candidateId: string): Promise<{
        total: number;
        completed: number;
        pending: number;
        average_rating: number;
        would_rehire_percentage: number;
    }> {
        const refs = await this.getReferenceChecksForCandidate(candidateId);
        const completed = refs.filter(r => r.status === ReferenceCheckStatus.COMPLETED);
        const pending = refs.filter(r =>
            r.status === ReferenceCheckStatus.PENDING || r.status === ReferenceCheckStatus.CONTACTED
        );

        const ratings = completed.filter(r => r.overall_rating).map(r => r.overall_rating!);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

        const wouldRehire = completed.filter(r => r.would_rehire).length;
        const rehirePercentage = completed.length > 0 ? (wouldRehire / completed.length) * 100 : 0;

        return {
            total: refs.length,
            completed: completed.length,
            pending: pending.length,
            average_rating: Math.round(avgRating * 10) / 10,
            would_rehire_percentage: Math.round(rehirePercentage),
        };
    }
}
