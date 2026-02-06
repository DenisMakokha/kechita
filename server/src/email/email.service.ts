import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content?: Buffer | string;
        path?: string;
        contentType?: string;
    }>;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
}

export interface EmailTemplate {
    name: string;
    subject: string;
    html: string;
    text?: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(private configService: ConfigService) {
        const smtpHost = this.configService.get('SMTP_HOST') || 'smtp.gmail.com';
        const smtpPort = this.configService.get('SMTP_PORT') || 587;
        const smtpUser = this.configService.get('SMTP_USER');
        const smtpPass = this.configService.get('SMTP_PASS');

        this.fromEmail = this.configService.get('SMTP_FROM_EMAIL') || 'noreply@kechita.com';
        this.fromName = this.configService.get('SMTP_FROM_NAME') || 'Kechita Microfinance';

        this.transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: smtpUser && smtpPass ? {
                user: smtpUser,
                pass: smtpPass,
            } : undefined,
        });

        // Verify connection on startup
        if (smtpUser && smtpPass) {
            this.transporter.verify()
                .then(() => this.logger.log('SMTP connection established'))
                .catch((err) => this.logger.warn('SMTP connection failed:', err.message));
        } else {
            this.logger.warn('SMTP credentials not configured - emails will be logged only');
        }
    }

    async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const mailOptions = {
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                attachments: options.attachments,
                cc: options.cc,
                bcc: options.bcc,
                replyTo: options.replyTo,
            };

            // If no SMTP configured, log the email instead
            if (!this.configService.get('SMTP_USER')) {
                this.logger.log(`[Email - DEV MODE] To: ${mailOptions.to}, Subject: ${mailOptions.subject}`);
                return { success: true, messageId: 'dev-mode-' + Date.now() };
            }

            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent: ${info.messageId} to ${mailOptions.to}`);
            return { success: true, messageId: info.messageId };
        } catch (error: any) {
            this.logger.error(`Failed to send email: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // ==================== INTERVIEW EMAILS ====================

    async sendInterviewInvitation(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        interviewDate: Date;
        interviewTime: string;
        duration: number;
        type: 'video' | 'in_person' | 'phone';
        location?: string;
        videoLink?: string;
        interviewerNames: string[];
        companyName?: string;
        icsAttachment?: Buffer;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const locationInfo = data.type === 'video'
            ? `<a href="${data.videoLink}">Join Video Call</a>`
            : data.type === 'in_person'
                ? `Location: ${data.location}`
                : 'Phone interview - we will call you';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
        .btn { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Interview Invitation</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>We are pleased to invite you for an interview for the position of <strong>${data.jobTitle}</strong> at ${data.companyName || 'Kechita Microfinance'}.</p>
            
            <div class="details">
                <h3>📅 Interview Details</h3>
                <p><strong>Date:</strong> ${data.interviewDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> ${data.interviewTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Type:</strong> ${data.type === 'video' ? 'Video Interview' : data.type === 'in_person' ? 'In-Person Interview' : 'Phone Interview'}</p>
                <p>${locationInfo}</p>
                ${data.interviewerNames.length > 0 ? `<p><strong>Interviewers:</strong> ${data.interviewerNames.join(', ')}</p>` : ''}
            </div>
            
            <p>Please confirm your attendance by replying to this email.</p>
            
            ${data.type === 'video' && data.videoLink ? `<a href="${data.videoLink}" class="btn">Join Video Call</a>` : ''}
            
            <p style="margin-top: 30px;">We look forward to meeting you!</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>`;

        const attachments = data.icsAttachment ? [{
            filename: 'interview.ics',
            content: data.icsAttachment,
            contentType: 'text/calendar',
        }] : [];

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Interview Invitation - ${data.jobTitle} at ${data.companyName || 'Kechita Microfinance'}`,
            html,
            attachments,
        });
    }

    async sendInterviewReminder(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        interviewDate: Date;
        interviewTime: string;
        duration: number;
        type: 'video' | 'in_person' | 'phone';
        location?: string;
        videoLink?: string;
        reminderType: '24_hours' | '1_hour';
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const reminderText = data.reminderType === '24_hours' ? 'tomorrow' : 'in 1 hour';
        const locationInfo = data.type === 'video'
            ? `<a href="${data.videoLink}">Join Video Call</a>`
            : data.type === 'in_person'
                ? `Location: ${data.location}`
                : 'Phone interview - we will call you';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Interview Reminder</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>This is a friendly reminder that your interview for the <strong>${data.jobTitle}</strong> position is scheduled <strong>${reminderText}</strong>.</p>
            
            <div class="details">
                <h3>📅 Interview Details</h3>
                <p><strong>Date:</strong> ${data.interviewDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> ${data.interviewTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Type:</strong> ${data.type === 'video' ? 'Video Interview' : data.type === 'in_person' ? 'In-Person Interview' : 'Phone Interview'}</p>
                <p>${locationInfo}</p>
            </div>
            
            <p><strong>Tips for your interview:</strong></p>
            <ul>
                <li>Be in a quiet place with stable internet (for video calls)</li>
                <li>Have a copy of your resume handy</li>
                <li>Prepare questions about the role and company</li>
                <li>Join or be available 5 minutes before the scheduled time</li>
            </ul>
            
            ${data.type === 'video' && data.videoLink ? `<a href="${data.videoLink}" class="btn">Join Video Call</a>` : ''}
            
            <p style="margin-top: 30px;">Good luck! We look forward to speaking with you.</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated reminder. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `⏰ Interview Reminder - ${data.jobTitle} (${reminderText})`,
            html,
        });
    }

    async sendInterviewRescheduled(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        originalDate: Date;
        newDate: Date;
        newTime: string;
        duration: number;
        type: 'video' | 'in_person' | 'phone';
        location?: string;
        videoLink?: string;
        reason?: string;
        icsAttachment?: Buffer;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const locationInfo = data.type === 'video'
            ? `<a href="${data.videoLink}">Join Video Call</a>`
            : data.type === 'in_person'
                ? `Location: ${data.location}`
                : 'Phone interview - we will call you';

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .old-schedule { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0; text-decoration: line-through; color: #991b1b; }
        .new-schedule { background: #dcfce7; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #22c55e; }
        .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Interview Rescheduled</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>Your interview for the <strong>${data.jobTitle}</strong> position has been rescheduled.</p>
            
            ${data.reason ? `<p><em>Reason: ${data.reason}</em></p>` : ''}
            
            <div class="old-schedule">
                <strong>Previous Date:</strong> ${data.originalDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            
            <div class="new-schedule">
                <h3>✅ New Interview Details</h3>
                <p><strong>Date:</strong> ${data.newDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> ${data.newTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Type:</strong> ${data.type === 'video' ? 'Video Interview' : data.type === 'in_person' ? 'In-Person Interview' : 'Phone Interview'}</p>
                <p>${locationInfo}</p>
            </div>
            
            <p>Please update your calendar accordingly. If the new time doesn't work for you, please contact us as soon as possible.</p>
            
            ${data.type === 'video' && data.videoLink ? `<a href="${data.videoLink}" class="btn">Join Video Call</a>` : ''}
            
            <p style="margin-top: 30px;">We apologize for any inconvenience and look forward to speaking with you.</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message from our recruitment system.</p>
        </div>
    </div>
</body>
</html>`;

        const attachments = data.icsAttachment ? [{
            filename: 'interview_updated.ics',
            content: data.icsAttachment,
            contentType: 'text/calendar',
        }] : [];

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `📅 Interview Rescheduled - ${data.jobTitle}`,
            html,
            attachments,
        });
    }

    async sendInterviewCancelled(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        originalDate: Date;
        reason?: string;
        willReschedule?: boolean;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #64748b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .cancelled { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Interview Cancelled</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>We regret to inform you that your interview for the <strong>${data.jobTitle}</strong> position has been cancelled.</p>
            
            <div class="cancelled">
                <p><strong>Original Date:</strong> ${data.originalDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            </div>
            
            ${data.willReschedule ? `
                <p>We would like to reschedule the interview with you. Our HR team will reach out shortly with new available times.</p>
            ` : `
                <p>We apologize for any inconvenience this may cause. If you have any questions, please don't hesitate to contact our HR team.</p>
            `}
            
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message from our recruitment system.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Interview Cancelled - ${data.jobTitle}`,
            html,
        });
    }

    // ==================== REGRET EMAILS ====================

    async sendRegretEmail(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        reason?: string;
        encourageReapply?: boolean;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #64748b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Application Update</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>Thank you for your interest in the <strong>${data.jobTitle}</strong> position at ${data.companyName || 'Kechita Microfinance'} and for taking the time to apply.</p>
            
            <p>After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.</p>
            
            ${data.reason ? `<p><em>${data.reason}</em></p>` : ''}
            
            <p>This decision does not diminish the value of your experience and skills. The competition for this role was particularly strong.</p>
            
            ${data.encourageReapply !== false ? `
            <p>We encourage you to keep an eye on our careers page for future opportunities that may be a better fit for your profile. We would welcome your application for other positions.</p>
            ` : ''}
            
            <p>We wish you the very best in your job search and future career endeavors.</p>
            
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message from our recruitment system.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Application Update - ${data.jobTitle}`,
            html,
        });
    }

    // ==================== OFFER LETTER EMAIL ====================

    async sendOfferLetter(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        salary: number;
        currency: string;
        startDate: Date;
        expirationDate: Date;
        offerPdfBuffer?: Buffer;
        signatureLink?: string;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
        .btn { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎊 Congratulations!</h1>
            <p>Job Offer</p>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>We are thrilled to extend an offer for the position of <strong>${data.jobTitle}</strong> at ${data.companyName || 'Kechita Microfinance'}!</p>
            
            <div class="details">
                <h3>💼 Offer Details</h3>
                <p><strong>Position:</strong> ${data.jobTitle}</p>
                <p><strong>Salary:</strong> ${data.currency} ${data.salary.toLocaleString()} per month</p>
                <p><strong>Start Date:</strong> ${data.startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This offer is valid until ${data.expirationDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Please respond before this date.
            </div>
            
            <p>Please find the detailed offer letter attached to this email. Review it carefully and let us know if you have any questions.</p>
            
            ${data.signatureLink ? `<a href="${data.signatureLink}" class="btn">Sign Offer Letter</a>` : ''}
            
            <p style="margin-top: 30px;">We are excited about the possibility of you joining our team!</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please reply to this email if you have any questions.</p>
        </div>
    </div>
</body>
</html>`;

        const attachments = data.offerPdfBuffer ? [{
            filename: `Offer_Letter_${data.candidateName.replace(/\s+/g, '_')}.pdf`,
            content: data.offerPdfBuffer,
            contentType: 'application/pdf',
        }] : [];

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Job Offer - ${data.jobTitle} at ${data.companyName || 'Kechita Microfinance'}`,
            html,
            attachments,
        });
    }

    async sendNotificationEmail(data: {
        email: string;
        name: string;
        subject: string;
        title: string;
        message: string;
        actionUrl?: string;
        actionText?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Kechita Microfinance</h2>
        </div>
        <div class="content">
            <p>Dear ${data.name},</p>
            <h3>${data.title}</h3>
            <p>${data.message}</p>
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="btn">${data.actionText || 'View Details'}</a>` : ''}
            <p style="margin-top: 30px;">Best regards,<br>Kechita Microfinance</p>
        </div>
        <div class="footer">
            <p>This is an automated notification from Kechita Staff Portal.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.email,
            subject: data.subject,
            html,
        });
    }

    // ==================== BACKGROUND CHECK EMAILS ====================

    async sendBackgroundCheckInitiated(data: {
        candidateEmail: string;
        candidateName: string;
        checkType: string;
        jobTitle: string;
        expectedDays?: number;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0891b2 0%, #22d3ee 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Background Verification</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>As part of the hiring process for the <strong>${data.jobTitle}</strong> position at ${data.companyName || 'Kechita Microfinance'}, we have initiated a background verification check.</p>
            
            <div class="info-box">
                <h3>Verification Details</h3>
                <p><strong>Type:</strong> ${data.checkType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                ${data.expectedDays ? `<p><strong>Expected Duration:</strong> ${data.expectedDays} business days</p>` : ''}
            </div>
            
            <p>This is a standard procedure for all candidates. You may be contacted by our verification partner for additional information if needed.</p>
            
            <p>If you have any questions about this process, please don't hesitate to reach out to our HR team.</p>
            
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message from our recruitment system.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Background Verification Initiated - ${data.jobTitle}`,
            html,
        });
    }

    async sendBackgroundCheckComplete(data: {
        candidateEmail: string;
        candidateName: string;
        checkType: string;
        result: 'clear' | 'flagged' | 'inconclusive';
        jobTitle: string;
        nextSteps?: string;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const resultColors = {
            clear: '#10b981',
            flagged: '#ef4444',
            inconclusive: '#f59e0b',
        };
        const resultMessages = {
            clear: 'Your background check has been completed successfully with no issues found.',
            flagged: 'Your background check has been completed. Our HR team will be in touch to discuss the results.',
            inconclusive: 'Your background check has been completed with some items requiring clarification. Our HR team will reach out soon.',
        };

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${resultColors[data.result]} 0%, ${resultColors[data.result]}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${data.result === 'clear' ? '✅' : data.result === 'flagged' ? '⚠️' : '❓'} Background Check Complete</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>${resultMessages[data.result]}</p>
            ${data.nextSteps ? `<p><strong>Next Steps:</strong> ${data.nextSteps}</p>` : ''}
            <p>Thank you for your patience during this process.</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message from our recruitment system.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Background Check Complete - ${data.jobTitle}`,
            html,
        });
    }

    // ==================== REFERENCE CHECK EMAILS ====================

    async sendReferenceRequest(data: {
        referenceEmail: string;
        referenceName: string;
        candidateName: string;
        jobTitle: string;
        relationship: string;
        referenceFormUrl?: string;
        deadline?: Date;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
        .btn { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 Reference Request</h1>
        </div>
        <div class="content">
            <p>Dear ${data.referenceName},</p>
            <p><strong>${data.candidateName}</strong> has applied for the position of <strong>${data.jobTitle}</strong> at ${data.companyName || 'Kechita Microfinance'} and has listed you as a professional reference.</p>
            
            <div class="info-box">
                <p><strong>Candidate:</strong> ${data.candidateName}</p>
                <p><strong>Position Applied:</strong> ${data.jobTitle}</p>
                <p><strong>Your Relationship:</strong> ${data.relationship}</p>
                ${data.deadline ? `<p><strong>Response Needed By:</strong> ${data.deadline.toLocaleDateString()}</p>` : ''}
            </div>
            
            <p>We would greatly appreciate if you could take a few minutes to provide feedback about ${data.candidateName}'s work performance, skills, and character.</p>
            
            ${data.referenceFormUrl ? `<a href="${data.referenceFormUrl}" class="btn">Complete Reference Form</a>` : `<p>Please reply to this email with your feedback or let us know a convenient time for a brief phone call.</p>`}
            
            <p style="margin-top: 30px;">Your input is invaluable in helping us make an informed hiring decision. All information provided will be kept confidential.</p>
            
            <p>Thank you for your time and assistance.</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message. If you believe you received this in error, please disregard.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.referenceEmail,
            subject: `Reference Request for ${data.candidateName} - ${data.companyName || 'Kechita Microfinance'}`,
            html,
        });
    }

    async sendReferenceThankYou(data: {
        referenceEmail: string;
        referenceName: string;
        candidateName: string;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🙏 Thank You!</h1>
        </div>
        <div class="content">
            <p>Dear ${data.referenceName},</p>
            <p>Thank you for taking the time to provide a reference for <strong>${data.candidateName}</strong>.</p>
            <p>Your feedback is invaluable in helping us make well-informed hiring decisions. We truly appreciate your assistance.</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is an automated message from our recruitment system.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.referenceEmail,
            subject: `Thank You for Your Reference - ${data.companyName || 'Kechita Microfinance'}`,
            html,
        });
    }

    // ==================== OFFER SIGNATURE EMAILS ====================

    async sendOfferSignatureRequest(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        signatureUrl: string;
        expiresAt: Date;
        salary: number;
        currency: string;
        startDate: Date;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .offer-summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
        .btn { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; font-size: 16px; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✍️ Sign Your Offer Letter</h1>
        </div>
        <div class="content">
            <p>Dear ${data.candidateName},</p>
            <p>Congratulations! Your offer letter for the position of <strong>${data.jobTitle}</strong> at ${data.companyName || 'Kechita Microfinance'} is ready for your signature.</p>
            
            <div class="offer-summary">
                <h3>Offer Summary</h3>
                <p><strong>Position:</strong> ${data.jobTitle}</p>
                <p><strong>Salary:</strong> ${data.currency} ${data.salary.toLocaleString()} per month</p>
                <p><strong>Start Date:</strong> ${data.startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This signature link expires on ${data.expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Please sign before this date.
            </div>
            
            <p>Please click the button below to review and sign your offer letter electronically:</p>
            
            <div style="text-align: center;">
                <a href="${data.signatureUrl}" class="btn">Review & Sign Offer</a>
            </div>
            
            <p style="margin-top: 30px;">If you have any questions about your offer, please don't hesitate to reach out to our HR team.</p>
            
            <p>We're excited to welcome you to the team!</p>
            <p>Best regards,<br>HR Team<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>This is a secure link generated specifically for you. Please do not share it with others.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Action Required: Sign Your Offer Letter - ${data.jobTitle}`,
            html,
        });
    }

    async sendOfferSigned(data: {
        candidateEmail: string;
        candidateName: string;
        jobTitle: string;
        startDate: Date;
        companyName?: string;
        hrEmail?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
        .next-steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .next-steps h3 { color: #059669; margin-top: 0; }
        .next-steps ul { padding-left: 20px; }
        .next-steps li { margin-bottom: 10px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to the Team!</h1>
        </div>
        <div class="content">
            <div class="celebration">🎊</div>
            <p>Dear ${data.candidateName},</p>
            <p>Congratulations! We have received your signed offer letter for the position of <strong>${data.jobTitle}</strong>. We're thrilled to welcome you to ${data.companyName || 'Kechita Microfinance'}!</p>
            
            <div class="next-steps">
                <h3>📋 Next Steps</h3>
                <ul>
                    <li><strong>Start Date:</strong> ${data.startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                    <li>Our HR team will send you onboarding documents shortly</li>
                    <li>You'll receive details about your first day, including reporting time and location</li>
                    <li>Prepare required documents (ID, bank details, certificates)</li>
                </ul>
            </div>
            
            <p>If you have any questions before your start date, please contact our HR team${data.hrEmail ? ` at <a href="mailto:${data.hrEmail}">${data.hrEmail}</a>` : ''}.</p>
            
            <p>We look forward to working with you!</p>
            <p>Best regards,<br>The ${data.companyName || 'Kechita Microfinance'} Team</p>
        </div>
        <div class="footer">
            <p>This is an automated confirmation. A copy has been sent to our HR team.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.candidateEmail,
            subject: `Welcome to ${data.companyName || 'Kechita Microfinance'} - Offer Accepted!`,
            html,
            cc: data.hrEmail,
        });
    }

    async sendOfferDeclined(data: {
        hrEmails: string[];
        candidateName: string;
        candidateEmail: string;
        jobTitle: string;
        reason?: string;
        companyName?: string;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>⚠️ Offer Declined</h2>
        </div>
        <div class="content">
            <p>This is an automated notification that a candidate has declined their job offer.</p>
            
            <div class="details">
                <p><strong>Candidate:</strong> ${data.candidateName}</p>
                <p><strong>Email:</strong> ${data.candidateEmail}</p>
                <p><strong>Position:</strong> ${data.jobTitle}</p>
                ${data.reason ? `<p><strong>Reason Given:</strong> ${data.reason}</p>` : '<p><em>No reason provided</em></p>'}
            </div>
            
            <p>Please take necessary action to update the recruitment pipeline and consider re-approaching other candidates.</p>
            
            <p>Recruitment System<br>${data.companyName || 'Kechita Microfinance'}</p>
        </div>
        <div class="footer">
            <p>Automated notification from the Recruitment System.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.hrEmails,
            subject: `⚠️ Offer Declined - ${data.candidateName} (${data.jobTitle})`,
            html,
        });
    }

    // ==================== PASSWORD RESET EMAIL ====================

    async sendPasswordResetEmail(data: {
        email: string;
        name: string;
        resetUrl: string;
        expiresInMinutes: number;
    }): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .btn { display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; font-size: 14px; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        .code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <p>Dear ${data.name},</p>
            <p>We received a request to reset your password for your Kechita Staff Portal account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${data.resetUrl}" class="btn">Reset Password</a>
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This link will expire in ${data.expiresInMinutes} minutes. If you don't reset your password within this time, you'll need to request a new link.
            </div>
            
            <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span class="code" style="word-break: break-all;">${data.resetUrl}</span>
            </p>
            
            <p>Best regards,<br>Kechita Microfinance</p>
        </div>
        <div class="footer">
            <p>This is an automated security message. Please do not reply to this email.</p>
            <p>If you didn't request this, please contact support immediately.</p>
        </div>
    </div>
</body>
</html>`;

        return this.sendEmail({
            to: data.email,
            subject: '🔐 Password Reset Request - Kechita Staff Portal',
            html,
        });
    }
}
