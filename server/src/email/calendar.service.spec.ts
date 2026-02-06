import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
    let service: CalendarService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [CalendarService],
        }).compile();

        service = module.get<CalendarService>(CalendarService);
    });

    describe('generateICS', () => {
        it('should generate valid ICS content', () => {
            const event = {
                title: 'Test Meeting',
                startDate: new Date('2024-02-15T10:00:00Z'),
                endDate: new Date('2024-02-15T11:00:00Z'),
            };

            const ics = service.generateICS(event);

            expect(ics).toContain('BEGIN:VCALENDAR');
            expect(ics).toContain('END:VCALENDAR');
            expect(ics).toContain('BEGIN:VEVENT');
            expect(ics).toContain('END:VEVENT');
            expect(ics).toContain('SUMMARY:Test Meeting');
        });

        it('should include description when provided', () => {
            const event = {
                title: 'Meeting',
                description: 'Important discussion',
                startDate: new Date('2024-02-15T10:00:00Z'),
                endDate: new Date('2024-02-15T11:00:00Z'),
            };

            const ics = service.generateICS(event);

            expect(ics).toContain('DESCRIPTION:Important discussion');
        });

        it('should include location when provided', () => {
            const event = {
                title: 'Meeting',
                location: 'Conference Room A',
                startDate: new Date('2024-02-15T10:00:00Z'),
                endDate: new Date('2024-02-15T11:00:00Z'),
            };

            const ics = service.generateICS(event);

            expect(ics).toContain('LOCATION:Conference Room A');
        });

        it('should include organizer when provided', () => {
            const event = {
                title: 'Meeting',
                startDate: new Date('2024-02-15T10:00:00Z'),
                endDate: new Date('2024-02-15T11:00:00Z'),
                organizer: { name: 'John Doe', email: 'john@example.com' },
            };

            const ics = service.generateICS(event);

            expect(ics).toContain('ORGANIZER');
            expect(ics).toContain('john@example.com');
        });

        it('should include attendees when provided', () => {
            const event = {
                title: 'Meeting',
                startDate: new Date('2024-02-15T10:00:00Z'),
                endDate: new Date('2024-02-15T11:00:00Z'),
                attendees: [
                    { name: 'Jane Smith', email: 'jane@example.com', rsvp: true },
                ],
            };

            const ics = service.generateICS(event);

            expect(ics).toContain('ATTENDEE');
            expect(ics).toContain('jane@example.com');
        });

        it('should include reminder alarm when provided', () => {
            const event = {
                title: 'Meeting',
                startDate: new Date('2024-02-15T10:00:00Z'),
                endDate: new Date('2024-02-15T11:00:00Z'),
                reminder: 30,
            };

            const ics = service.generateICS(event);

            expect(ics).toContain('BEGIN:VALARM');
            expect(ics).toContain('TRIGGER:-PT30M');
            expect(ics).toContain('END:VALARM');
        });
    });

    describe('generateICSBuffer', () => {
        it('should return a Buffer', () => {
            const event = {
                title: 'Test',
                startDate: new Date('2024-02-15T10:00:00Z'),
                endDate: new Date('2024-02-15T11:00:00Z'),
            };

            const buffer = service.generateICSBuffer(event);

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString()).toContain('BEGIN:VCALENDAR');
        });
    });

    describe('generateInterviewEvent', () => {
        it('should generate video interview event', () => {
            const event = service.generateInterviewEvent({
                candidateName: 'John Doe',
                candidateEmail: 'john@example.com',
                jobTitle: 'Software Engineer',
                interviewDate: new Date('2024-02-15T10:00:00Z'),
                duration: 60,
                type: 'video',
                videoLink: 'https://meet.example.com/abc',
                interviewers: [{ name: 'HR Manager', email: 'hr@example.com' }],
            });

            expect(event.title).toContain('John Doe');
            expect(event.title).toContain('Software Engineer');
            expect(event.url).toBe('https://meet.example.com/abc');
            expect(event.attendees).toHaveLength(2);
            expect(event.reminder).toBe(30);
        });

        it('should generate in-person interview event', () => {
            const event = service.generateInterviewEvent({
                candidateName: 'Jane Smith',
                candidateEmail: 'jane@example.com',
                jobTitle: 'Manager',
                interviewDate: new Date('2024-02-15T14:00:00Z'),
                duration: 45,
                type: 'in_person',
                location: 'Main Office, Room 101',
                interviewers: [],
            });

            expect(event.location).toBe('Main Office, Room 101');
            expect(event.attendees).toHaveLength(1);
        });

        it('should generate phone interview event', () => {
            const event = service.generateInterviewEvent({
                candidateName: 'Bob Wilson',
                candidateEmail: 'bob@example.com',
                jobTitle: 'Analyst',
                interviewDate: new Date('2024-02-15T09:00:00Z'),
                duration: 30,
                type: 'phone',
                interviewers: [{ name: 'Recruiter', email: 'recruiter@example.com' }],
            });

            expect(event.location).toBe('Phone Interview');
        });

        it('should calculate end date correctly', () => {
            const startDate = new Date('2024-02-15T10:00:00Z');
            const event = service.generateInterviewEvent({
                candidateName: 'Test',
                candidateEmail: 'test@example.com',
                jobTitle: 'Test Role',
                interviewDate: startDate,
                duration: 60,
                type: 'video',
                interviewers: [],
            });

            const expectedEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
            expect(event.endDate.getTime()).toBe(expectedEnd.getTime());
        });

        it('should include organizer when provided', () => {
            const event = service.generateInterviewEvent({
                candidateName: 'Test',
                candidateEmail: 'test@example.com',
                jobTitle: 'Test Role',
                interviewDate: new Date(),
                duration: 30,
                type: 'video',
                interviewers: [],
                organizerName: 'HR Team',
                organizerEmail: 'hr@kechita.com',
            });

            expect(event.organizer?.name).toBe('HR Team');
            expect(event.organizer?.email).toBe('hr@kechita.com');
        });
    });
});
