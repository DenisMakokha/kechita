import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RecruitmentService } from './recruitment.service';
import { JobPost, JobStatus } from './entities/job-post.entity';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Candidate, CandidateStatus } from './entities/candidate.entity';
import { Interview, InterviewStatus, InterviewOutcome } from './entities/interview.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';
import { Offer } from './entities/offer.entity';
import { CandidateNote } from './entities/candidate-note.entity';
import { Staff } from '../staff/entities/staff.entity';
import { EmailService } from '../email/email.service';
import { CalendarService } from '../email/calendar.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RecruitmentService', () => {
    let service: RecruitmentService;

    const mockJobPostRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        increment: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockApplicationRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        count: jest.fn(),
        increment: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockCandidateRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockInterviewRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockPipelineStageRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockOfferRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockCandidateNoteRepo = {
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockStaffRepo = {
        findOne: jest.fn(),
    };

    const mockDataSource = {
        createQueryRunner: jest.fn().mockReturnValue({
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                save: jest.fn(),
                findOne: jest.fn(),
            },
        }),
    };

    const mockEmailService = {
        sendEmail: jest.fn(),
        sendInterviewInvitation: jest.fn(),
        sendInterviewReminder: jest.fn(),
        sendNotificationEmail: jest.fn(),
    };

    const mockCalendarService = {
        createEvent: jest.fn(),
        updateEvent: jest.fn(),
        deleteEvent: jest.fn(),
        generateInterviewEvent: jest.fn().mockReturnValue({
            summary: 'Interview',
            start: new Date(),
            end: new Date(),
        }),
        generateICSBuffer: jest.fn().mockReturnValue(Buffer.from('ICS')),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RecruitmentService,
                { provide: getRepositoryToken(JobPost), useValue: mockJobPostRepo },
                { provide: getRepositoryToken(Application), useValue: mockApplicationRepo },
                { provide: getRepositoryToken(Candidate), useValue: mockCandidateRepo },
                { provide: getRepositoryToken(Interview), useValue: mockInterviewRepo },
                { provide: getRepositoryToken(PipelineStage), useValue: mockPipelineStageRepo },
                { provide: getRepositoryToken(Offer), useValue: mockOfferRepo },
                { provide: getRepositoryToken(CandidateNote), useValue: mockCandidateNoteRepo },
                { provide: getRepositoryToken(Staff), useValue: mockStaffRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: EmailService, useValue: mockEmailService },
                { provide: CalendarService, useValue: mockCalendarService },
            ],
        }).compile();

        service = module.get<RecruitmentService>(RecruitmentService);
        jest.clearAllMocks();
    });

    describe('getJobPosts', () => {
        it('should return all job posts', async () => {
            const jobs = [
                { id: '1', title: 'Software Engineer', status: JobStatus.PUBLISHED },
                { id: '2', title: 'Product Manager', status: JobStatus.DRAFT },
            ];
            mockJobPostRepo.find.mockResolvedValue(jobs);

            const result = await service.getJobPosts({});

            expect(result).toEqual(jobs);
        });

        it('should filter by status', async () => {
            const jobs = [{ id: '1', title: 'Software Engineer', status: JobStatus.PUBLISHED }];
            mockJobPostRepo.find.mockResolvedValue(jobs);

            const result = await service.getJobPosts({ status: JobStatus.PUBLISHED });

            expect(mockJobPostRepo.find).toHaveBeenCalled();
            expect(result).toEqual(jobs);
        });
    });

    describe('getPublishedJobs', () => {
        it('should return only published jobs', async () => {
            const jobs = [{ id: '1', title: 'Software Engineer', status: JobStatus.PUBLISHED }];
            mockJobPostRepo.find.mockResolvedValue(jobs);

            const result = await service.getPublishedJobs();

            expect(mockJobPostRepo.find).toHaveBeenCalled();
            expect(result).toEqual(jobs);
        });
    });

    describe('getJobPost', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobPostRepo.findOne.mockResolvedValue(null);

            await expect(service.getJobPost('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return job post with relations', async () => {
            const job = { id: '1', title: 'Software Engineer', status: JobStatus.PUBLISHED };
            mockJobPostRepo.findOne.mockResolvedValue(job);

            const result = await service.getJobPost('1');

            expect(result).toEqual(job);
        });
    });

    describe('createJobPost', () => {
        it('should create a new job post', async () => {
            const dto = { title: 'New Position', description: 'Job description' };
            const created = { id: '1', ...dto, status: JobStatus.DRAFT };
            mockJobPostRepo.create.mockReturnValue(created);
            mockJobPostRepo.save.mockResolvedValue(created);
            mockStaffRepo.findOne.mockResolvedValue({ id: 'staff-1' });

            const result = await service.createJobPost(dto, 'staff-1');

            expect(mockJobPostRepo.create).toHaveBeenCalled();
            expect(result).toEqual(created);
        });
    });

    describe('updateJobPost', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobPostRepo.findOne.mockResolvedValue(null);

            await expect(service.updateJobPost('non-existent', { title: 'Updated' }))
                .rejects.toThrow(NotFoundException);
        });

        it('should update existing job post', async () => {
            const existing = { id: '1', title: 'Old Title', status: JobStatus.DRAFT };
            const updated = { ...existing, title: 'Updated Title' };
            mockJobPostRepo.findOne.mockResolvedValue(existing);
            mockJobPostRepo.save.mockResolvedValue(updated);

            const result = await service.updateJobPost('1', { title: 'Updated Title' });

            expect(result.title).toBe('Updated Title');
        });
    });

    describe('publishJob', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobPostRepo.findOne.mockResolvedValue(null);

            await expect(service.publishJob('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should publish a draft job', async () => {
            const job = { id: '1', title: 'Job', status: JobStatus.DRAFT };
            mockJobPostRepo.findOne.mockResolvedValue(job);
            mockJobPostRepo.save.mockResolvedValue({ ...job, status: JobStatus.PUBLISHED });

            const result = await service.publishJob('1');

            expect(result.status).toBe(JobStatus.PUBLISHED);
        });
    });

    describe('closeJob', () => {
        it('should close a published job', async () => {
            const job = { id: '1', title: 'Job', status: JobStatus.PUBLISHED };
            mockJobPostRepo.findOne.mockResolvedValue(job);
            mockJobPostRepo.save.mockResolvedValue({ ...job, status: JobStatus.CLOSED });

            const result = await service.closeJob('1');

            expect(result.status).toBe(JobStatus.CLOSED);
        });
    });

    describe('getApplication', () => {
        it('should throw NotFoundException if application not found', async () => {
            mockApplicationRepo.findOne.mockResolvedValue(null);

            await expect(service.getApplication('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return application with relations', async () => {
            const app = { id: '1', candidate: { first_name: 'John' }, job_post: { title: 'Job' } };
            mockApplicationRepo.findOne.mockResolvedValue(app);

            const result = await service.getApplication('1');

            expect(result).toEqual(app);
        });
    });

    describe('applyToJob', () => {
        it('should throw NotFoundException if job not found', async () => {
            mockJobPostRepo.findOne.mockResolvedValue(null);

            await expect(service.applyToJob('non-existent', {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
            })).rejects.toThrow(NotFoundException);
        });

        it('should create new candidate and application', async () => {
            const job = { id: '1', title: 'Job', status: JobStatus.PUBLISHED };
            const candidate = { id: 'c1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' };
            const application = { id: 'a1', candidate, jobPost: job, status: ApplicationStatus.ACTIVE };

            mockJobPostRepo.findOne.mockResolvedValue(job);
            mockCandidateRepo.findOne.mockResolvedValueOnce(null); // No existing candidate
            mockCandidateRepo.create.mockReturnValue(candidate);
            mockCandidateRepo.save.mockResolvedValue(candidate);
            mockApplicationRepo.findOne.mockResolvedValue(null); // No existing application
            mockPipelineStageRepo.findOne.mockResolvedValue({ code: 'NEW' });
            mockApplicationRepo.create.mockReturnValue(application);
            mockApplicationRepo.save.mockResolvedValue(application);

            const result = await service.applyToJob('1', {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
            });

            expect(result).toEqual(application);
        });
    });

    describe('updateApplicationStage', () => {
        it('should throw NotFoundException if application not found', async () => {
            mockApplicationRepo.findOne.mockResolvedValue(null);

            await expect(service.updateApplicationStage('non-existent', 'SCREENING'))
                .rejects.toThrow(NotFoundException);
        });

        it('should update application stage', async () => {
            const stage = { code: 'SCREENING', name: 'Screening' };
            const app = { id: '1', stage: { code: 'NEW' }, status: ApplicationStatus.ACTIVE };
            mockApplicationRepo.findOne.mockResolvedValue(app);
            mockPipelineStageRepo.findOne.mockResolvedValue(stage);
            mockApplicationRepo.save.mockResolvedValue({ ...app, stage });

            const result = await service.updateApplicationStage('1', 'SCREENING');

            expect(mockApplicationRepo.save).toHaveBeenCalled();
        });
    });

    describe('starApplication', () => {
        it('should star an application', async () => {
            const app = { id: '1', is_starred: false };
            mockApplicationRepo.findOne.mockResolvedValue(app);
            mockApplicationRepo.save.mockResolvedValue({ ...app, is_starred: true });

            const result = await service.starApplication('1', true);

            expect(result.is_starred).toBe(true);
        });
    });

    describe('rateApplication', () => {
        it('should rate an application', async () => {
            const app = { id: '1', recruiter_rating: null };
            mockApplicationRepo.findOne.mockResolvedValue(app);
            mockApplicationRepo.save.mockResolvedValue({ ...app, recruiter_rating: 4 });

            const result = await service.rateApplication('1', 4);

            expect(result.recruiter_rating).toBe(4);
        });
    });

    describe('getCandidate', () => {
        it('should throw NotFoundException if candidate not found', async () => {
            mockCandidateRepo.findOne.mockResolvedValue(null);

            await expect(service.getCandidate('non-existent'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return candidate with applications', async () => {
            const candidate = { id: '1', first_name: 'John', applications: [] };
            mockCandidateRepo.findOne.mockResolvedValue(candidate);

            const result = await service.getCandidate('1');

            expect(result).toEqual(candidate);
        });
    });

    describe('updateCandidate', () => {
        it('should update candidate details', async () => {
            const candidate = { id: '1', first_name: 'John', status: CandidateStatus.ACTIVE };
            mockCandidateRepo.findOne.mockResolvedValue(candidate);
            mockCandidateRepo.save.mockResolvedValue({ ...candidate, first_name: 'Jane' });

            const result = await service.updateCandidate('1', { first_name: 'Jane' });

            expect(result.first_name).toBe('Jane');
        });
    });

    describe('scheduleInterview', () => {
        it('should throw NotFoundException if application not found', async () => {
            mockApplicationRepo.findOne.mockResolvedValue(null);

            await expect(service.scheduleInterview({
                application_id: 'non-existent',
                title: 'Technical Interview',
                type: 'technical' as any,
                scheduled_at: new Date().toISOString(),
            }, 'staff-1')).rejects.toThrow(NotFoundException);
        });

        it('should schedule an interview', async () => {
            const app = { id: '1', candidate: { id: 'c1', first_name: 'John', email: 'john@example.com' } };
            const interview = { id: 'i1', application: app, title: 'Technical Interview' };

            mockApplicationRepo.findOne.mockResolvedValue(app);
            mockStaffRepo.findOne.mockResolvedValue({ id: 'staff-1', email: 'hr@example.com' });
            mockInterviewRepo.create.mockReturnValue(interview);
            mockInterviewRepo.save.mockResolvedValue(interview);
            mockApplicationRepo.increment.mockResolvedValue({ affected: 1 });
            mockPipelineStageRepo.findOne.mockResolvedValue({ code: 'INTERVIEW' });

            const result = await service.scheduleInterview({
                application_id: '1',
                title: 'Technical Interview',
                type: 'technical' as any,
                scheduled_at: new Date().toISOString(),
            }, 'staff-1');

            expect(mockInterviewRepo.save).toHaveBeenCalled();
        });
    });

    describe('updateInterviewFeedback', () => {
        it('should throw NotFoundException if interview not found', async () => {
            mockInterviewRepo.findOne.mockResolvedValue(null);

            await expect(service.updateInterviewFeedback('non-existent', {
                outcome: InterviewOutcome.YES,
            })).rejects.toThrow(NotFoundException);
        });

        it('should update interview feedback', async () => {
            const interview = { id: '1', status: InterviewStatus.SCHEDULED, outcome: null };
            mockInterviewRepo.findOne.mockResolvedValue(interview);
            mockInterviewRepo.save.mockResolvedValue({
                ...interview,
                outcome: InterviewOutcome.YES,
                status: InterviewStatus.COMPLETED,
            });

            const result = await service.updateInterviewFeedback('1', {
                outcome: InterviewOutcome.YES,
                feedback: 'Great candidate',
            });

            expect(result.outcome).toBe(InterviewOutcome.YES);
        });
    });

    describe('getPipelineStages', () => {
        it('should return all active pipeline stages', async () => {
            const stages = [
                { id: '1', code: 'NEW', name: 'New', order: 1 },
                { id: '2', code: 'SCREENING', name: 'Screening', order: 2 },
            ];
            mockPipelineStageRepo.find.mockResolvedValue(stages);

            const result = await service.getPipelineStages();

            expect(result).toEqual(stages);
        });
    });

    describe('createPipelineStage', () => {
        it('should create a new pipeline stage', async () => {
            const dto = { name: 'Technical Review', order: 3 };
            const stage = { id: '1', code: 'TECHNICAL_REVIEW', ...dto };
            mockPipelineStageRepo.create.mockReturnValue(stage);
            mockPipelineStageRepo.save.mockResolvedValue(stage);

            const result = await service.createPipelineStage(dto);

            expect(result).toEqual(stage);
        });
    });

    describe('createOffer', () => {
        it('should throw NotFoundException if application not found', async () => {
            mockApplicationRepo.findOne.mockResolvedValue(null);

            await expect(service.createOffer('non-existent', {
                salary: 100000,
                start_date: '2024-01-01',
            }, 'user-1')).rejects.toThrow(NotFoundException);
        });

        it('should create an offer for application', async () => {
            const app = {
                id: '1',
                candidate: { id: 'c1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
                jobPost: { title: 'Engineer', location: 'Remote' },
            };
            const offer = { id: 'o1', application: app, salary: 100000 };

            mockApplicationRepo.findOne.mockResolvedValue(app);
            mockOfferRepo.create.mockReturnValue(offer);
            mockOfferRepo.save.mockResolvedValue(offer);
            mockPipelineStageRepo.findOne.mockResolvedValue({ code: 'OFFER' });
            mockApplicationRepo.save.mockResolvedValue(app);

            const result = await service.createOffer('1', {
                salary: 100000,
                start_date: '2024-01-01',
            }, 'user-1');

            expect(mockOfferRepo.save).toHaveBeenCalled();
        });
    });

    describe('addCandidateNote', () => {
        it('should add a note to candidate', async () => {
            const candidate = { id: 'c1', first_name: 'John' };
            const staff = { id: 's1', full_name: 'HR Manager' };
            const note = { id: 'n1', candidate, staff, content: 'Good candidate' };

            mockCandidateRepo.findOne.mockResolvedValue(candidate);
            mockStaffRepo.findOne.mockResolvedValue(staff);
            mockCandidateNoteRepo.create.mockReturnValue(note);
            mockCandidateNoteRepo.save.mockResolvedValue(note);

            const result = await service.addCandidateNote('c1', 's1', 'Good candidate');

            expect(result.content).toBe('Good candidate');
        });
    });

    describe('getCandidateNotes', () => {
        it('should return notes for candidate', async () => {
            const notes = [
                { id: 'n1', content: 'Note 1', staff: { full_name: 'HR' } },
                { id: 'n2', content: 'Note 2', staff: { full_name: 'Manager' } },
            ];
            mockCandidateNoteRepo.find.mockResolvedValue(notes);

            const result = await service.getCandidateNotes('c1');

            expect(result).toEqual(notes);
        });
    });
});
