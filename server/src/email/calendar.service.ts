import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface CalendarEvent {
    uid?: string;
    title: string;
    description?: string;
    location?: string;
    url?: string;
    startDate: Date;
    endDate: Date;
    organizer?: {
        name: string;
        email: string;
    };
    attendees?: Array<{
        name: string;
        email: string;
        rsvp?: boolean;
    }>;
    reminder?: number; // minutes before
    status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

@Injectable()
export class CalendarService {
    /**
     * Generate an .ics calendar file content
     */
    generateICS(event: CalendarEvent): string {
        const uid = event.uid || uuidv4();
        const now = this.formatDate(new Date());
        const start = this.formatDate(event.startDate);
        const end = this.formatDate(event.endDate);

        let ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Kechita Microfinance//Staff Portal//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${now}`,
            `DTSTART:${start}`,
            `DTEND:${end}`,
            `SUMMARY:${this.escapeText(event.title)}`,
            `STATUS:${event.status || 'CONFIRMED'}`,
        ];

        if (event.description) {
            ics.push(`DESCRIPTION:${this.escapeText(event.description)}`);
        }

        if (event.location) {
            ics.push(`LOCATION:${this.escapeText(event.location)}`);
        }

        if (event.url) {
            ics.push(`URL:${event.url}`);
        }

        if (event.organizer) {
            ics.push(`ORGANIZER;CN=${this.escapeText(event.organizer.name)}:mailto:${event.organizer.email}`);
        }

        if (event.attendees) {
            for (const attendee of event.attendees) {
                const rsvp = attendee.rsvp !== false ? 'TRUE' : 'FALSE';
                ics.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=${rsvp};CN=${this.escapeText(attendee.name)}:mailto:${attendee.email}`);
            }
        }

        // Add reminder alarm
        if (event.reminder) {
            ics.push('BEGIN:VALARM');
            ics.push('ACTION:DISPLAY');
            ics.push(`DESCRIPTION:Reminder: ${event.title}`);
            ics.push(`TRIGGER:-PT${event.reminder}M`);
            ics.push('END:VALARM');
        }

        ics.push('END:VEVENT');
        ics.push('END:VCALENDAR');

        return ics.join('\r\n');
    }

    /**
     * Generate an .ics file as a Buffer for email attachment
     */
    generateICSBuffer(event: CalendarEvent): Buffer {
        const icsContent = this.generateICS(event);
        return Buffer.from(icsContent, 'utf-8');
    }

    /**
     * Generate an interview calendar event
     */
    generateInterviewEvent(data: {
        candidateName: string;
        candidateEmail: string;
        jobTitle: string;
        interviewDate: Date;
        duration: number; // in minutes
        type: 'video' | 'in_person' | 'phone';
        location?: string;
        videoLink?: string;
        interviewers: Array<{ name: string; email: string }>;
        organizerName?: string;
        organizerEmail?: string;
    }): CalendarEvent {
        const startDate = new Date(data.interviewDate);
        const endDate = new Date(startDate.getTime() + data.duration * 60 * 1000);

        const locationText = data.type === 'video'
            ? data.videoLink || 'Video Call'
            : data.type === 'in_person'
                ? data.location || 'Office'
                : 'Phone Interview';

        const description = [
            `Interview for: ${data.jobTitle}`,
            `Candidate: ${data.candidateName}`,
            `Type: ${data.type === 'video' ? 'Video Interview' : data.type === 'in_person' ? 'In-Person' : 'Phone'}`,
            data.videoLink ? `Video Link: ${data.videoLink}` : '',
        ].filter(Boolean).join('\\n');

        const attendees: Array<{ name: string; email: string; rsvp: boolean }> = [
            { name: data.candidateName, email: data.candidateEmail, rsvp: true },
            ...data.interviewers.map(i => ({ ...i, rsvp: true })),
        ];

        return {
            title: `Interview: ${data.candidateName} - ${data.jobTitle}`,
            description,
            location: locationText,
            url: data.videoLink,
            startDate,
            endDate,
            organizer: data.organizerEmail ? {
                name: data.organizerName || 'HR Team',
                email: data.organizerEmail,
            } : undefined,
            attendees,
            reminder: 30, // 30 minutes before
            status: 'CONFIRMED',
        };
    }

    /**
     * Format date to iCalendar format (YYYYMMDDTHHMMSSZ)
     */
    private formatDate(date: Date): string {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    /**
     * Escape special characters in iCalendar text
     */
    private escapeText(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }
}
