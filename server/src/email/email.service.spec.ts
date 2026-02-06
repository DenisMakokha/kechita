import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
    let service: EmailService;

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config: Record<string, string> = {
                SMTP_HOST: 'smtp.test.com',
                SMTP_PORT: '587',
                SMTP_FROM_EMAIL: 'test@kechita.com',
                SMTP_FROM_NAME: 'Kechita Test',
            };
            return config[key];
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailService,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<EmailService>(EmailService);
    });

    describe('sendEmail', () => {
        it('should send email in dev mode when no SMTP credentials', async () => {
            const result = await service.sendEmail({
                to: 'recipient@example.com',
                subject: 'Test Subject',
                html: '<p>Test content</p>',
            });

            expect(result.success).toBe(true);
            expect(result.messageId).toContain('dev-mode-');
        });

        it('should handle array of recipients', async () => {
            const result = await service.sendEmail({
                to: ['recipient1@example.com', 'recipient2@example.com'],
                subject: 'Test Subject',
                text: 'Test content',
            });

            expect(result.success).toBe(true);
        });

        it('should include attachments when provided', async () => {
            const result = await service.sendEmail({
                to: 'recipient@example.com',
                subject: 'Test with attachment',
                html: '<p>See attached</p>',
                attachments: [{
                    filename: 'test.pdf',
                    content: Buffer.from('test content'),
                }],
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendInterviewInvitation', () => {
        it('should send interview invitation email', async () => {
            const result = await service.sendInterviewInvitation({
                candidateEmail: 'candidate@example.com',
                candidateName: 'John Doe',
                jobTitle: 'Software Engineer',
                interviewDate: new Date('2024-02-15'),
                interviewTime: '10:00 AM',
                duration: 60,
                type: 'video',
                videoLink: 'https://meet.example.com/interview',
                interviewerNames: ['Jane Smith', 'Bob Johnson'],
            });

            expect(result.success).toBe(true);
        });

        it('should handle in-person interview', async () => {
            const result = await service.sendInterviewInvitation({
                candidateEmail: 'candidate@example.com',
                candidateName: 'John Doe',
                jobTitle: 'Manager',
                interviewDate: new Date('2024-02-15'),
                interviewTime: '2:00 PM',
                duration: 45,
                type: 'in_person',
                location: 'Main Office, Room 101',
                interviewerNames: ['HR Manager'],
            });

            expect(result.success).toBe(true);
        });

        it('should include ICS attachment when provided', async () => {
            const result = await service.sendInterviewInvitation({
                candidateEmail: 'candidate@example.com',
                candidateName: 'John Doe',
                jobTitle: 'Analyst',
                interviewDate: new Date('2024-02-15'),
                interviewTime: '11:00 AM',
                duration: 30,
                type: 'phone',
                interviewerNames: [],
                icsAttachment: Buffer.from('BEGIN:VCALENDAR...'),
            });

            expect(result.success).toBe(true);
        });
    });

    describe('sendInterviewReminder', () => {
        it('should send 24 hour reminder', async () => {
            const result = await service.sendInterviewReminder({
                candidateEmail: 'candidate@example.com',
                candidateName: 'John Doe',
                jobTitle: 'Developer',
                interviewDate: new Date('2024-02-15'),
                interviewTime: '10:00 AM',
                duration: 60,
                type: 'video',
                videoLink: 'https://meet.example.com/interview',
                reminderType: '24_hours',
            });

            expect(result.success).toBe(true);
        });

        it('should send 1 hour reminder', async () => {
            const result = await service.sendInterviewReminder({
                candidateEmail: 'candidate@example.com',
                candidateName: 'John Doe',
                jobTitle: 'Developer',
                interviewDate: new Date('2024-02-15'),
                interviewTime: '10:00 AM',
                duration: 60,
                type: 'in_person',
                location: 'Office Building A',
                reminderType: '1_hour',
            });

            expect(result.success).toBe(true);
        });
    });
});
