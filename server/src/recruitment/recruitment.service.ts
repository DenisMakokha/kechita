import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like, ILike, Between, MoreThan } from 'typeorm';
import { JobPost, JobStatus, EmploymentType, ExperienceLevel } from './entities/job-post.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';
import { Candidate, CandidateSource, CandidateStatus } from './entities/candidate.entity';
import { CandidateNote } from './entities/candidate-note.entity';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Interview, InterviewType, InterviewStatus, InterviewOutcome } from './entities/interview.entity';

import { Offer } from './entities/offer.entity';
import { Staff } from '../staff/entities/staff.entity';
import { EmailService } from '../email/email.service';
import { CalendarService } from '../email/calendar.service';
import { randomDigits, uuid } from '../common/id-utils';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

export interface CreateJobDto {
    title: string;
    position_id?: string;
    department_id?: string;
    branch_id?: string;
    region_id?: string;
    employment_type?: EmploymentType;
    experience_level?: ExperienceLevel;
    min_experience_years?: number;
    max_experience_years?: number;
    description?: string;
    responsibilities?: string;
    requirements?: string;
    benefits?: string;
    required_skills?: string[];
    preferred_skills?: string[];
    salary_min?: number;
    salary_max?: number;
    show_salary?: boolean;
    vacancies?: number;
    deadline?: string;
    location?: string;
    is_remote?: boolean;
    is_urgent?: boolean;
    hiring_manager_id?: string;
}

export interface UpdateJobDto {
    title?: string;
    description?: string;
    responsibilities?: string;
    requirements?: string;
    benefits?: string;
    employment_type?: EmploymentType;
    experience_level?: ExperienceLevel;
    salary_min?: number;
    salary_max?: number;
    deadline?: string;
    location?: string;
    is_remote?: boolean;
    is_urgent?: boolean;
    status?: JobStatus;
}

export interface UpdateCandidateDto {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    status?: CandidateStatus;
}

interface ApplyJobDto {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    resume_url?: string;
    cover_letter?: string;
    source?: CandidateSource;
    years_of_experience?: number;
    current_title?: string;
    current_company?: string;
    expected_salary?: number;
    skills?: string[];
    custom_responses?: Record<string, string>;
}

export interface ScheduleInterviewDto {
    application_id: string;
    type: InterviewType;
    title: string;
    scheduled_at: string;
    duration_minutes?: number;
    location?: string;
    video_link?: string;
    interviewer_ids?: string[];
    agenda?: string;
}

@Injectable()
export class RecruitmentService {
    constructor(
        @InjectRepository(JobPost)
        private jobPostRepo: Repository<JobPost>,
        @InjectRepository(PipelineStage)
        private stageRepo: Repository<PipelineStage>,
        @InjectRepository(Candidate)
        private candidateRepo: Repository<Candidate>,
        @InjectRepository(Application)
        private applicationRepo: Repository<Application>,
        @InjectRepository(Interview)
        private interviewRepo: Repository<Interview>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        @InjectRepository(CandidateNote)
        private candidateNoteRepo: Repository<CandidateNote>,

        @InjectRepository(Offer)
        private offerRepo: Repository<Offer>,
        private dataSource: DataSource,
        private emailService: EmailService,
        private calendarService: CalendarService,
    ) { }

    // ==================== JOB POSTS ====================

    private generateJobCode(): string {
        const year = new Date().getFullYear();
        const random = randomDigits(4);
        return `JOB-${year}-${random}`;
    }

    async createJobPost(data: CreateJobDto, createdById?: string): Promise<JobPost> {
        const post = this.jobPostRepo.create({
            ...data,
            job_code: this.generateJobCode(),
            status: JobStatus.DRAFT,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
        });

        if (createdById) {
            const creator = await this.staffRepo.findOne({ where: { id: createdById } });
            if (creator) post.createdBy = creator;
        }

        if (data.hiring_manager_id) {
            const manager = await this.staffRepo.findOne({ where: { id: data.hiring_manager_id } });
            if (manager) post.hiringManager = manager;
        }

        return this.jobPostRepo.save(post);
    }

    async updateJobPost(id: string, dto: UpdateJobDto): Promise<JobPost> {
        const post = await this.jobPostRepo.findOne({ where: { id } });
        if (!post) throw new NotFoundException('Job post not found');

        // Explicit field mapping - no Object.assign
        if (dto.title !== undefined) post.title = dto.title;
        if (dto.description !== undefined) post.description = dto.description;
        if (dto.responsibilities !== undefined) post.responsibilities = dto.responsibilities;
        if (dto.requirements !== undefined) post.requirements = dto.requirements;
        if (dto.benefits !== undefined) post.benefits = dto.benefits;
        if (dto.employment_type !== undefined) post.employment_type = dto.employment_type;
        if (dto.experience_level !== undefined) post.experience_level = dto.experience_level;
        if (dto.salary_min !== undefined) post.salary_min = dto.salary_min;
        if (dto.salary_max !== undefined) post.salary_max = dto.salary_max;
        if (dto.deadline !== undefined) post.deadline = new Date(dto.deadline);
        if (dto.location !== undefined) post.location = dto.location;
        if (dto.is_remote !== undefined) post.is_remote = dto.is_remote;
        if (dto.is_urgent !== undefined) post.is_urgent = dto.is_urgent;
        if (dto.status !== undefined) post.status = dto.status;

        return this.jobPostRepo.save(post);
    }

    async publishJob(id: string): Promise<JobPost> {
        const post = await this.jobPostRepo.findOne({ where: { id } });
        if (!post) throw new NotFoundException('Job post not found');

        post.status = JobStatus.PUBLISHED;
        post.published_at = new Date();

        return this.jobPostRepo.save(post);
    }

    async closeJob(id: string): Promise<JobPost> {
        const post = await this.jobPostRepo.findOne({ where: { id } });
        if (!post) throw new NotFoundException('Job post not found');

        post.status = JobStatus.CLOSED;
        return this.jobPostRepo.save(post);
    }

    async getJobPosts(filters?: { status?: JobStatus; department_id?: string; is_urgent?: boolean }): Promise<JobPost[]> {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.department_id) where.department = { id: filters.department_id };
        if (filters?.is_urgent !== undefined) where.is_urgent = filters.is_urgent;

        return this.jobPostRepo.find({
            where,
            relations: ['department', 'branch', 'region', 'position', 'hiringManager', 'createdBy'],
            order: { is_urgent: 'DESC', created_at: 'DESC' },
        });
    }

    async getJobPost(id: string): Promise<JobPost> {
        const post = await this.jobPostRepo.findOne({
            where: { id },
            relations: ['department', 'branch', 'region', 'position', 'hiringManager', 'createdBy'],
        });
        if (!post) throw new NotFoundException('Job post not found');
        return post;
    }

    async getPublishedJobs(): Promise<JobPost[]> {
        return this.jobPostRepo.find({
            where: { status: JobStatus.PUBLISHED },
            relations: ['department', 'branch', 'region'],
            order: { is_urgent: 'DESC', published_at: 'DESC' },
        });
    }

    async incrementJobViews(id: string): Promise<void> {
        await this.jobPostRepo.increment({ id }, 'views_count', 1);
    }

    async getJobStats(): Promise<{ total: number; published: number; draft: number; closed: number; urgent: number }> {
        const total = await this.jobPostRepo.count();
        const published = await this.jobPostRepo.count({ where: { status: JobStatus.PUBLISHED } });
        const draft = await this.jobPostRepo.count({ where: { status: JobStatus.DRAFT } });
        const closed = await this.jobPostRepo.count({ where: { status: JobStatus.CLOSED } });
        const urgent = await this.jobPostRepo.count({ where: { is_urgent: true, status: JobStatus.PUBLISHED } });

        return { total, published, draft, closed, urgent };
    }

    // ==================== APPLICATIONS ====================

    private generateApplicationNumber(): string {
        const year = new Date().getFullYear();
        const random = randomDigits(5);
        return `APP-${year}-${random}`;
    }

    async applyToJob(jobPostId: string, data: ApplyJobDto): Promise<Application> {
        const jobPost = await this.jobPostRepo.findOne({ where: { id: jobPostId } });
        if (!jobPost) throw new NotFoundException('Job post not found');
        if (jobPost.status !== JobStatus.PUBLISHED) {
            throw new BadRequestException('This job is not accepting applications');
        }

        const appliedStage = await this.stageRepo.findOne({ where: { code: 'APPLIED' } });

        // Find or create candidate
        let candidate = await this.candidateRepo.findOne({ where: { email: data.email } });
        if (!candidate) {
            candidate = this.candidateRepo.create({
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                phone: data.phone,
                resume_url: data.resume_url,
                source: data.source || CandidateSource.CAREER_PAGE,
                years_of_experience: data.years_of_experience,
                current_title: data.current_title,
                current_company: data.current_company,
                expected_salary: data.expected_salary,
                skills: data.skills,
                status: CandidateStatus.ACTIVE,
            });
            if (appliedStage) candidate.currentStage = appliedStage;
            candidate = await this.candidateRepo.save(candidate);
        } else {
            // Update candidate info if provided
            if (data.phone) candidate.phone = data.phone;
            if (data.resume_url) candidate.resume_url = data.resume_url;
            if (data.years_of_experience) candidate.years_of_experience = data.years_of_experience;
            if (data.current_title) candidate.current_title = data.current_title;
            if (data.skills) candidate.skills = data.skills;
            await this.candidateRepo.save(candidate);
        }

        // Check for existing application
        const existingApp = await this.applicationRepo.findOne({
            where: { candidate: { id: candidate.id }, jobPost: { id: jobPostId } },
        });
        if (existingApp) {
            throw new ConflictException('You have already applied for this position');
        }

        // Create application
        const application = this.applicationRepo.create({
            application_number: this.generateApplicationNumber(),
            candidate,
            jobPost,
            status: ApplicationStatus.ACTIVE,
            resume_url: data.resume_url,
            cover_letter_text: data.cover_letter,
            custom_responses: data.custom_responses,
            source: data.source,
        });
        if (appliedStage) application.stage = appliedStage;

        // Calculate initial match score
        application.match_score = this.calculateMatchScore(candidate, jobPost);

        const saved = await this.applicationRepo.save(application);

        // Update job applications count
        await this.jobPostRepo.increment({ id: jobPostId }, 'applications_count', 1);

        // Send application confirmation email to candidate
        await this.emailService.sendNotificationEmail({
            email: candidate.email,
            name: `${candidate.first_name} ${candidate.last_name}`,
            subject: `Application Received - ${jobPost.title}`,
            title: 'Thank you for your application!',
            message: `
                We have received your application for the <strong>${jobPost.title}</strong> position.
                <br><br>
                <strong>Application Number:</strong> ${saved.application_number}
                <br><br>
                Our recruitment team will review your application and get back to you soon. 
                If your qualifications match our requirements, we will reach out to schedule the next steps.
                <br><br>
                In the meantime, you can track your application status through our careers portal.
            `,
        });

        return saved;
    }

    private calculateMatchScore(candidate: Candidate, job: JobPost): number {
        let score = 0;
        let maxScore = 0;

        // Experience match (40 points)
        maxScore += 40;
        if (candidate.years_of_experience && job.min_experience_years) {
            if (candidate.years_of_experience >= job.min_experience_years) {
                score += 40;
            } else {
                score += Math.max(0, 40 - (job.min_experience_years - candidate.years_of_experience) * 10);
            }
        } else {
            score += 20; // Neutral if no data
        }

        // Skills match (60 points)
        maxScore += 60;
        if (candidate.skills && job.required_skills) {
            const candidateSkillsLower = candidate.skills.map(s => s.toLowerCase());
            const requiredSkillsLower = job.required_skills.map(s => s.toLowerCase());
            const matchedSkills = requiredSkillsLower.filter(s =>
                candidateSkillsLower.some(cs => cs.includes(s) || s.includes(cs))
            );
            score += (matchedSkills.length / requiredSkillsLower.length) * 60;
        } else {
            score += 30; // Neutral if no data
        }

        return Math.min(100, Math.round((score / maxScore) * 100));
    }

    async getApplications(filters?: {
        job_post_id?: string;
        stage_code?: string;
        status?: ApplicationStatus;
        is_starred?: boolean;
    }): Promise<Application[]> {
        const qb = this.applicationRepo.createQueryBuilder('app')
            .leftJoinAndSelect('app.candidate', 'candidate')
            .leftJoinAndSelect('app.jobPost', 'jobPost')
            .leftJoinAndSelect('app.stage', 'stage')
            .leftJoinAndSelect('app.assignedTo', 'assignedTo');

        if (filters?.job_post_id) {
            qb.andWhere('jobPost.id = :jobId', { jobId: filters.job_post_id });
        }
        if (filters?.stage_code) {
            qb.andWhere('stage.code = :stageCode', { stageCode: filters.stage_code });
        }
        if (filters?.status) {
            qb.andWhere('app.status = :status', { status: filters.status });
        }
        if (filters?.is_starred !== undefined) {
            qb.andWhere('app.is_starred = :starred', { starred: filters.is_starred });
        }

        return qb.orderBy('app.match_score', 'DESC').addOrderBy('app.applied_at', 'DESC').getMany();
    }

    async getApplication(id: string): Promise<Application> {
        const app = await this.applicationRepo.findOne({
            where: { id },
            relations: ['candidate', 'jobPost', 'stage', 'assignedTo', 'screenedBy'],
        });
        if (!app) throw new NotFoundException('Application not found');
        return app;
    }

    async updateApplicationStage(applicationId: string, stageCode: string, notes?: string): Promise<Application> {
        const application = await this.applicationRepo.findOne({
            where: { id: applicationId },
            relations: ['candidate', 'jobPost'],
        });
        if (!application) throw new NotFoundException('Application not found');

        const stage = await this.stageRepo.findOne({ where: { code: stageCode } });
        if (!stage) throw new NotFoundException('Stage not found');

        application.stage = stage;
        if (notes) application.internal_notes = notes;

        // Update status based on terminal stages
        if (stage.is_terminal) {
            application.status = stage.is_success ? ApplicationStatus.HIRED : ApplicationStatus.REJECTED;
            if (stage.is_success) {
                application.hired_at = new Date();
            } else {
                application.rejected_at = new Date();
                if (notes) {
                    application.rejection_reason = notes;
                }

                // Send regret email to candidate
                if (application.candidate && application.jobPost) {
                    await this.emailService.sendRegretEmail({
                        candidateEmail: application.candidate.email,
                        candidateName: `${application.candidate.first_name} ${application.candidate.last_name}`,
                        jobTitle: application.jobPost.title,
                        encourageReapply: true,
                    });
                }
            }
        }

        // Update candidate's current stage
        if (application.candidate) {
            application.candidate.currentStage = stage;
            await this.candidateRepo.save(application.candidate);
        }

        return this.applicationRepo.save(application);
    }

    async starApplication(id: string, starred: boolean): Promise<Application> {
        const app = await this.applicationRepo.findOne({ where: { id } });
        if (!app) throw new NotFoundException('Application not found');
        app.is_starred = starred;
        return this.applicationRepo.save(app);
    }

    async rateApplication(id: string, rating: number): Promise<Application> {
        const app = await this.applicationRepo.findOne({ where: { id } });
        if (!app) throw new NotFoundException('Application not found');
        app.recruiter_rating = rating;
        return this.applicationRepo.save(app);
    }

    async assignApplication(id: string, staffId: string): Promise<Application> {
        const app = await this.applicationRepo.findOne({ where: { id } });
        if (!app) throw new NotFoundException('Application not found');

        const staff = await this.staffRepo.findOne({ where: { id: staffId } });
        if (!staff) throw new NotFoundException('Staff not found');

        app.assignedTo = staff;
        return this.applicationRepo.save(app);
    }

    async getApplicationStats(jobPostId?: string): Promise<Record<string, number>> {
        const qb = this.applicationRepo.createQueryBuilder('app')
            .leftJoin('app.stage', 'stage')
            .select('stage.code', 'stage_code')
            .addSelect('COUNT(*)', 'count')
            .groupBy('stage.code');

        if (jobPostId) {
            qb.andWhere('app.jobPost.id = :jobId', { jobId: jobPostId });
        }

        const results = await qb.getRawMany();
        const stats: Record<string, number> = {};
        results.forEach(r => { stats[r.stage_code] = parseInt(r.count); });
        return stats;
    }

    // ==================== CANDIDATES ====================

    async getCandidates(filters?: { search?: string; status?: CandidateStatus; skills?: string[] }): Promise<Candidate[]> {
        const qb = this.candidateRepo.createQueryBuilder('c')
            .leftJoinAndSelect('c.currentStage', 'stage');

        if (filters?.search) {
            qb.andWhere(
                '(c.first_name ILIKE :search OR c.last_name ILIKE :search OR c.email ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        if (filters?.status) {
            qb.andWhere('c.status = :status', { status: filters.status });
        }

        return qb.orderBy('c.created_at', 'DESC').getMany();
    }

    async getCandidate(id: string): Promise<Candidate> {
        const candidate = await this.candidateRepo.findOne({
            where: { id },
            relations: ['currentStage'],
        });
        if (!candidate) throw new NotFoundException('Candidate not found');
        return candidate;
    }

    async getCandidateApplications(candidateId: string): Promise<Application[]> {
        return this.applicationRepo.find({
            where: { candidate: { id: candidateId } },
            relations: ['jobPost', 'stage'],
            order: { applied_at: 'DESC' },
        });
    }

    async updateCandidate(id: string, dto: UpdateCandidateDto): Promise<Candidate> {
        const candidate = await this.candidateRepo.findOne({ where: { id } });
        if (!candidate) throw new NotFoundException('Candidate not found');

        // Explicit field mapping - no Object.assign
        if (dto.first_name !== undefined) candidate.first_name = dto.first_name;
        if (dto.last_name !== undefined) candidate.last_name = dto.last_name;
        if (dto.email !== undefined) candidate.email = dto.email;
        if (dto.phone !== undefined) candidate.phone = dto.phone;
        if (dto.status !== undefined) candidate.status = dto.status;

        return this.candidateRepo.save(candidate);
    }

    async addCandidateNote(candidateId: string, staffId: string, content: string): Promise<CandidateNote> {
        const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
        if (!candidate) throw new NotFoundException('Candidate not found');

        const staff = await this.staffRepo.findOne({ where: { id: staffId } });
        if (!staff) throw new NotFoundException('Staff not found');

        const note = this.candidateNoteRepo.create({
            candidate,
            createdBy: staff,
            content,
        });
        return this.candidateNoteRepo.save(note);
    }

    async getCandidateNotes(candidateId: string): Promise<CandidateNote[]> {
        return this.candidateNoteRepo.find({
            where: { candidate: { id: candidateId } },
            relations: ['createdBy'],
            order: { created_at: 'DESC' },
        });
    }

    // ==================== INTERVIEWS ====================

    async scheduleInterview(data: ScheduleInterviewDto, createdById?: string): Promise<Interview> {
        const application = await this.applicationRepo.findOne({ where: { id: data.application_id } });
        if (!application) throw new NotFoundException('Application not found');

        const interview = this.interviewRepo.create({
            application,
            type: data.type,
            title: data.title,
            scheduled_at: new Date(data.scheduled_at),
            duration_minutes: data.duration_minutes || 60,
            location: data.location,
            video_link: data.video_link,
            agenda: data.agenda,
            status: InterviewStatus.SCHEDULED,
            outcome: InterviewOutcome.PENDING,
        });

        if (createdById) {
            const creator = await this.staffRepo.findOne({ where: { id: createdById } });
            if (creator) interview.createdBy = creator;
        }

        if (data.interviewer_ids?.length) {
            interview.interviewers = await this.staffRepo.find({
                where: { id: In(data.interviewer_ids) },
            });
        }

        const saved = await this.interviewRepo.save(interview);

        // Update application interview count
        await this.applicationRepo.increment({ id: data.application_id }, 'interview_count', 1);

        // Move application to interview stage if not already past it
        const interviewStage = await this.stageRepo.findOne({ where: { code: 'INTERVIEW' } });
        if (interviewStage && application.stage?.position < interviewStage.position) {
            application.stage = interviewStage;
            application.status = ApplicationStatus.INTERVIEW_SCHEDULED;
            await this.applicationRepo.save(application);
        }

        // Send interview invitation email to candidate
        const candidate = application.candidate;
        const jobTitle = application.jobPost?.title || 'Position';
        const scheduledDate = new Date(data.scheduled_at);
        const interviewerNames = interview.interviewers?.map(i => `${i.first_name} ${i.last_name}`) || [];

        // Generate calendar ICS file
        const interviewers = interview.interviewers?.map(i => ({
            name: `${i.first_name} ${i.last_name}`,
            email: i.user?.email || i.personal_email || 'interviewer@kechita.com'
        })) || [];

        const calendarEvent = this.calendarService.generateInterviewEvent({
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            candidateEmail: candidate.email,
            jobTitle,
            interviewDate: scheduledDate,
            duration: data.duration_minutes || 60,
            type: data.type === InterviewType.VIDEO ? 'video' : data.type === InterviewType.PHONE_SCREEN ? 'phone' : 'in_person',
            location: data.location,
            videoLink: data.video_link,
            interviewers,
            organizerEmail: 'hr@kechita.com',
        });
        const icsBuffer = this.calendarService.generateICSBuffer(calendarEvent);

        await this.emailService.sendInterviewInvitation({
            candidateEmail: candidate.email,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            jobTitle,
            interviewDate: scheduledDate,
            interviewTime: scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            duration: data.duration_minutes || 60,
            type: data.type === InterviewType.VIDEO ? 'video' : data.type === InterviewType.PHONE_SCREEN ? 'phone' : 'in_person',
            location: data.location,
            videoLink: data.video_link,
            interviewerNames,
            icsAttachment: icsBuffer,
        });

        return saved;
    }

    async rescheduleInterview(
        interviewId: string,
        newScheduledAt: string,
        reason?: string,
    ): Promise<Interview> {
        const interview = await this.interviewRepo.findOne({
            where: { id: interviewId },
            relations: ['application', 'application.candidate', 'application.jobPost', 'interviewers'],
        });
        if (!interview) throw new NotFoundException('Interview not found');

        const originalDate = interview.scheduled_at;
        const newDate = new Date(newScheduledAt);

        interview.scheduled_at = newDate;
        interview.status = InterviewStatus.RESCHEDULED;

        const saved = await this.interviewRepo.save(interview);

        // Send reschedule email to candidate
        const candidate = interview.application.candidate;
        const jobTitle = interview.application.jobPost?.title || 'Position';

        // Generate updated calendar event
        const interviewers = interview.interviewers?.map(i => ({
            name: `${i.first_name} ${i.last_name}`,
            email: i.user?.email || i.personal_email || 'interviewer@kechita.com'
        })) || [];

        const calendarEvent = this.calendarService.generateInterviewEvent({
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            candidateEmail: candidate.email,
            jobTitle,
            interviewDate: newDate,
            duration: interview.duration_minutes,
            type: interview.type === InterviewType.VIDEO ? 'video' : interview.type === InterviewType.PHONE_SCREEN ? 'phone' : 'in_person',
            location: interview.location,
            videoLink: interview.video_link,
            interviewers,
            organizerEmail: 'hr@kechita.com',
        });
        const icsBuffer = this.calendarService.generateICSBuffer(calendarEvent);

        await this.emailService.sendInterviewRescheduled({
            candidateEmail: candidate.email,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            jobTitle,
            originalDate,
            newDate,
            newTime: newDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            duration: interview.duration_minutes,
            type: interview.type === InterviewType.VIDEO ? 'video' : interview.type === InterviewType.PHONE_SCREEN ? 'phone' : 'in_person',
            location: interview.location,
            videoLink: interview.video_link,
            reason,
            icsAttachment: icsBuffer,
        });

        return saved;
    }

    async cancelInterview(
        interviewId: string,
        reason?: string,
        willReschedule: boolean = false,
    ): Promise<Interview> {
        const interview = await this.interviewRepo.findOne({
            where: { id: interviewId },
            relations: ['application', 'application.candidate', 'application.jobPost'],
        });
        if (!interview) throw new NotFoundException('Interview not found');

        const originalDate = interview.scheduled_at;
        interview.status = InterviewStatus.CANCELLED;

        const saved = await this.interviewRepo.save(interview);

        // Send cancellation email to candidate
        const candidate = interview.application.candidate;
        const jobTitle = interview.application.jobPost?.title || 'Position';

        await this.emailService.sendInterviewCancelled({
            candidateEmail: candidate.email,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            jobTitle,
            originalDate,
            reason,
            willReschedule,
        });

        return saved;
    }

    async sendInterviewReminders(): Promise<{ sent: number; errors: number }> {
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        let sent = 0;
        let errors = 0;

        // Get interviews scheduled for the next 24 hours
        const upcomingInterviews = await this.interviewRepo.find({
            where: {
                status: In([InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED]),
                scheduled_at: Between(now, in24Hours),
            },
            relations: ['application', 'application.candidate', 'application.jobPost'],
        });

        for (const interview of upcomingInterviews) {
            const candidate = interview.application.candidate;
            const jobTitle = interview.application.jobPost?.title || 'Position';
            const hoursUntil = (interview.scheduled_at.getTime() - now.getTime()) / (1000 * 60 * 60);

            // Determine reminder type
            const reminderType = hoursUntil <= 2 ? '1_hour' : '24_hours';

            try {
                await this.emailService.sendInterviewReminder({
                    candidateEmail: candidate.email,
                    candidateName: `${candidate.first_name} ${candidate.last_name}`,
                    jobTitle,
                    interviewDate: interview.scheduled_at,
                    interviewTime: interview.scheduled_at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    duration: interview.duration_minutes,
                    type: interview.type === InterviewType.VIDEO ? 'video' : interview.type === InterviewType.PHONE_SCREEN ? 'phone' : 'in_person',
                    location: interview.location,
                    videoLink: interview.video_link,
                    reminderType,
                });
                sent++;
            } catch (error) {
                errors++;
            }
        }

        return { sent, errors };
    }

    async getInterviews(filters?: { application_id?: string; date?: string; interviewer_id?: string }): Promise<Interview[]> {
        const qb = this.interviewRepo.createQueryBuilder('i')
            .leftJoinAndSelect('i.application', 'app')
            .leftJoinAndSelect('app.candidate', 'candidate')
            .leftJoinAndSelect('app.jobPost', 'job')
            .leftJoinAndSelect('i.interviewers', 'interviewers')
            .leftJoinAndSelect('i.leadInterviewer', 'lead');

        if (filters?.application_id) {
            qb.andWhere('app.id = :appId', { appId: filters.application_id });
        }
        if (filters?.date) {
            qb.andWhere('DATE(i.scheduled_at) = :date', { date: filters.date });
        }

        return qb.orderBy('i.scheduled_at', 'ASC').getMany();
    }

    async getInterview(id: string): Promise<Interview> {
        const interview = await this.interviewRepo.findOne({
            where: { id },
            relations: ['application', 'application.candidate', 'application.jobPost', 'interviewers', 'leadInterviewer', 'createdBy'],
        });
        if (!interview) throw new NotFoundException('Interview not found');
        return interview;
    }

    async updateInterviewFeedback(id: string, feedback: {
        outcome: InterviewOutcome;
        overall_rating?: number;
        feedback?: string;
        strengths?: string;
        weaknesses?: string;
        competency_scores?: Record<string, number>;
    }): Promise<Interview> {
        const interview = await this.interviewRepo.findOne({ where: { id } });
        if (!interview) throw new NotFoundException('Interview not found');

        Object.assign(interview, feedback);
        interview.status = InterviewStatus.COMPLETED;
        interview.ended_at = new Date();

        return this.interviewRepo.save(interview);
    }


    async getUpcomingInterviews(staffId?: string): Promise<Interview[]> {
        const now = new Date();
        const qb = this.interviewRepo.createQueryBuilder('i')
            .leftJoinAndSelect('i.application', 'app')
            .leftJoinAndSelect('app.candidate', 'candidate')
            .leftJoinAndSelect('app.jobPost', 'job')
            .where('i.scheduled_at >= :now', { now })
            .andWhere('i.status IN (:...statuses)', { statuses: [InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED] });

        if (staffId) {
            qb.leftJoin('i.interviewers', 'interviewer')
                .andWhere('interviewer.id = :staffId', { staffId });
        }

        return qb.orderBy('i.scheduled_at', 'ASC').limit(20).getMany();
    }

    // ==================== PIPELINE STAGES ====================

    async getPipelineStages(): Promise<PipelineStage[]> {
        return this.stageRepo.find({
            where: { is_active: true },
            order: { position: 'ASC' }
        });
    }

    async createPipelineStage(data: Partial<PipelineStage>): Promise<PipelineStage> {
        const stage = this.stageRepo.create(data);
        return this.stageRepo.save(stage);
    }

    async updatePipelineStage(id: string, data: Partial<PipelineStage>): Promise<PipelineStage> {
        const stage = await this.stageRepo.findOne({ where: { id } });
        if (!stage) throw new NotFoundException('Stage not found');
        Object.assign(stage, data);
        return this.stageRepo.save(stage);
    }

    // ==================== DASHBOARD STATS ====================

    async getDashboardStats() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const activeJobs = await this.jobPostRepo.count({ where: { status: JobStatus.PUBLISHED } });
        const totalApplications = await this.applicationRepo.count();
        const newThisWeek = await this.applicationRepo.count({
            where: { applied_at: MoreThan(weekAgo) }
        });

        const interviewsThisWeek = await this.interviewRepo.count({
            where: { scheduled_at: Between(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) }
        });

        const hiredCount = await this.applicationRepo.count({ where: { status: ApplicationStatus.HIRED } });

        // Time to Hire
        const hiredApps = await this.applicationRepo.find({
            where: { status: ApplicationStatus.HIRED },
            select: ['applied_at', 'updated_at']
        });

        let avgTimeToHire = 0;
        if (hiredApps.length > 0) {
            const totalDays = hiredApps.reduce((acc, app) => acc + (new Date(app.updated_at).getTime() - new Date(app.applied_at).getTime()), 0);
            avgTimeToHire = Math.round(totalDays / hiredApps.length / (1000 * 3600 * 24));
        }

        const pipelineBreakdown = await this.applicationRepo.createQueryBuilder('app')
            .leftJoin('app.stage', 'stage')
            .select('stage.name', 'name')
            .addSelect('stage.color', 'fill')
            .addSelect('COUNT(app.id)', 'value')
            .groupBy('stage.name, stage.color, stage.order_index')
            .orderBy('stage.order_index', 'ASC')
            .getRawMany();

        return {
            activeJobs,
            totalApplications,
            newThisWeek,
            interviewsThisWeek,
            hiredCount,
            avgTimeToHire,
            pipelineBreakdown: pipelineBreakdown.map(p => ({
                name: p.name,
                value: parseInt(p.value),
                fill: p.fill
            }))
        };
    }

    // ==================== OFFERS ====================

    async createOffer(applicationId: string, offerData: any, userId: string): Promise<Offer> {
        const application = await this.applicationRepo.findOne({
            where: { id: applicationId },
            relations: ['candidate', 'jobPost', 'jobPost.department']
        });
        if (!application) throw new NotFoundException('Application not found');

        const staff = await this.staffRepo.findOne({ where: { user: { id: userId } } });

        // Create offer instance directly
        const offer = new Offer();
        offer.application = application;
        offer.offered_salary = offerData.offered_salary;
        offer.start_date = new Date(offerData.start_date);
        if (offerData.expiration_date) {
            offer.expiration_date = new Date(offerData.expiration_date);
        }
        offer.currency = offerData.currency || 'KES';
        offer.status = 'draft';
        if (staff) {
            offer.createdBy = staff;
        }

        // Generate PDF
        const pdfFileName = await this.generateOfferPdf(offer, application, offerData.additional_notes);
        offer.file_url = `/uploads/offers/${pdfFileName}`;
        offer.status = 'generated';

        return this.offerRepo.save(offer);
    }

    private async generateOfferPdf(offer: Offer, application: Application, notes?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const safeFirstName = (application.candidate.first_name || 'candidate').replace(/[^a-z0-9_-]/gi, '');
            const fileName = `offer-${safeFirstName}-${uuid()}.pdf`;
            // Ensure path resolution is correct relative to dist/src/recruitment/recruitment.service.js
            // Or use process.cwd()
            const uploadDir = path.join(process.cwd(), 'uploads', 'offers');
            const filePath = path.join(uploadDir, fileName);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // LOGO (Optional - skip for now)

            // Header
            doc.fontSize(20).text('EMPLOYMENT OFFER', { align: 'center', underline: true });
            doc.moveDown(1.5);

            doc.fontSize(12).font('Helvetica');
            doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
            doc.moveDown();

            doc.text(`To: ${application.candidate.first_name} ${application.candidate.last_name}`);
            doc.text(`Email: ${application.candidate.email}`);
            doc.moveDown(2);

            doc.text(`Dear ${application.candidate.first_name},`);
            doc.moveDown();
            doc.text(`We are pleased to offer you the position of ${application.jobPost.title} at Kechita. We were impressed with your qualifications and believe you will be a valuable asset to our team.`, { align: 'justify' });
            doc.moveDown();

            doc.font('Helvetica-Bold').text('Terms of Employment:');
            doc.font('Helvetica').moveDown(0.5);

            doc.list([
                `Position: ${application.jobPost.title}`,
                `Department: ${application.jobPost.department?.name || 'General'}`,
                `Start Date: ${new Date(offer.start_date).toLocaleDateString()}`,
                `Salary: ${offer.currency} ${Number(offer.offered_salary).toLocaleString()} per month`,
                `Probation Period: ${offer.probation_months || 3} months`
            ], { bulletRadius: 2 });

            if (notes) {
                doc.moveDown();
                doc.font('Helvetica-Bold').text('Additional Notes:');
                doc.font('Helvetica').text(notes);
            }

            doc.moveDown(2);
            doc.text('We look forward to having you on the team. Please sign below to accept this offer.');
            doc.moveDown(4);

            // Signatures
            doc.text('__________________________                __________________________');
            doc.text('Authorized Signature                            Candidate Signature');
            doc.text('Kechita HR                                            Date');

            doc.end();

            stream.on('finish', () => resolve(fileName));
            stream.on('error', reject);
        });
    }

    // ==================== REJECT APPLICATION ====================

    async rejectApplication(applicationId: string, reason?: string): Promise<Application> {
        const application = await this.applicationRepo.findOne({
            where: { id: applicationId },
            relations: ['candidate'],
        });

        if (!application) throw new NotFoundException('Application not found');

        application.status = ApplicationStatus.REJECTED;
        if (reason) application.rejection_reason = reason;
        application.rejected_at = new Date();

        // Update candidate status if no other active applications
        const otherActiveApps = await this.applicationRepo.count({
            where: {
                candidate: { id: application.candidate.id },
                status: In([ApplicationStatus.ACTIVE, ApplicationStatus.SHORTLISTED, ApplicationStatus.IN_REVIEW]),
            },
        });

        if (otherActiveApps === 0) {
            await this.candidateRepo.update(application.candidate.id, { status: CandidateStatus.REJECTED });
        }

        return this.applicationRepo.save(application);
    }

    // ==================== WITHDRAW APPLICATION ====================

    async withdrawApplication(applicationId: string, candidateEmail: string): Promise<Application> {
        const application = await this.applicationRepo.findOne({
            where: { id: applicationId },
            relations: ['candidate'],
        });

        if (!application) throw new NotFoundException('Application not found');
        if (application.candidate.email !== candidateEmail) {
            throw new ForbiddenException('You can only withdraw your own application');
        }
        if (application.status === ApplicationStatus.REJECTED || application.status === ApplicationStatus.WITHDRAWN) {
            throw new BadRequestException('Application is already closed');
        }

        application.status = ApplicationStatus.WITHDRAWN;

        return this.applicationRepo.save(application);
    }

    // ==================== DELETE JOB POST ====================

    async deleteJobPost(jobId: string): Promise<{ message: string }> {
        const job = await this.jobPostRepo.findOne({
            where: { id: jobId },
        });

        if (!job) throw new NotFoundException('Job post not found');

        // Check if job has applications
        const applicationCount = await this.applicationRepo.count({
            where: { jobPost: { id: jobId } },
        });

        if (applicationCount > 0) {
            throw new BadRequestException(
                `Cannot delete job post with ${applicationCount} application(s). Close it instead.`
            );
        }

        await this.jobPostRepo.remove(job);
        return { message: 'Job post deleted successfully' };
    }

    // ==================== DELETE PIPELINE STAGE ====================

    async deletePipelineStage(stageId: string): Promise<{ message: string }> {
        const stage = await this.stageRepo.findOne({
            where: { id: stageId },
        });

        if (!stage) throw new NotFoundException('Pipeline stage not found');

        // Check if stage is in use by applications
        const usageCount = await this.applicationRepo.count({
            where: { stage: { id: stageId } },
        });

        if (usageCount > 0) {
            throw new BadRequestException(
                `Cannot delete stage with ${usageCount} application(s). Move applications first.`
            );
        }

        await this.stageRepo.remove(stage);
        return { message: 'Pipeline stage deleted successfully' };
    }

    // ==================== BLACKLIST CANDIDATE ====================

    async blacklistCandidate(candidateId: string, reason?: string): Promise<Candidate> {
        const candidate = await this.candidateRepo.findOne({
            where: { id: candidateId },
        });

        if (!candidate) throw new NotFoundException('Candidate not found');

        candidate.status = CandidateStatus.BLACKLISTED;
        if (reason) candidate.internal_notes = candidate.internal_notes 
            ? `${candidate.internal_notes}\nBlacklisted: ${reason}` 
            : `Blacklisted: ${reason}`;
        return this.candidateRepo.save(candidate);
    }

    async unblacklistCandidate(candidateId: string): Promise<Candidate> {
        const candidate = await this.candidateRepo.findOne({
            where: { id: candidateId },
        });

        if (!candidate) throw new NotFoundException('Candidate not found');

        candidate.status = CandidateStatus.ACTIVE;
        return this.candidateRepo.save(candidate);
    }

    // ==================== BULK REJECT APPLICATIONS ====================

    async bulkRejectApplications(applicationIds: string[], reason?: string): Promise<{ rejected: number }> {
        let rejected = 0;

        for (const id of applicationIds) {
            try {
                await this.rejectApplication(id, reason);
                rejected++;
            } catch (err) {
                // Skip failed rejections
            }
        }

        return { rejected };
    }
}
