import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { RecruitmentService } from './recruitment.service';
import { SignatureService } from './signature.service';

@Injectable()
export class RecruitmentSchedulerService {
    private readonly logger = new Logger(RecruitmentSchedulerService.name);

    constructor(
        private recruitmentService: RecruitmentService,
        private signatureService: SignatureService,
        private schedulerRegistry: SchedulerRegistry,
    ) { }

    /**
     * Send interview reminders every hour
     * Checks for interviews scheduled within the next 24 hours
     * and sends appropriate reminders (24h or 1h before)
     */
    @Cron(CronExpression.EVERY_HOUR)
    async handleInterviewReminders() {
        this.logger.log('Running scheduled interview reminders...');

        try {
            const result = await this.recruitmentService.sendInterviewReminders();
            this.logger.log(`Interview reminders sent: ${result.sent} successful, ${result.errors} failed`);
        } catch (error) {
            this.logger.error('Failed to send interview reminders', error);
        }
    }

    /**
     * Send interview reminders at 8 AM daily
     * This is a more convenient time for morning interviews
     */
    @Cron('0 8 * * *') // 8:00 AM every day
    async handleMorningInterviewReminders() {
        this.logger.log('Running morning interview reminders...');

        try {
            const result = await this.recruitmentService.sendInterviewReminders();
            this.logger.log(`Morning reminders: ${result.sent} sent, ${result.errors} failed`);
        } catch (error) {
            this.logger.error('Failed to send morning interview reminders', error);
        }
    }

    /**
     * Expire pending offer signatures daily at midnight
     * Marks signatures as expired if past their expiry date
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleExpireSignatures() {
        this.logger.log('Checking for expired offer signatures...');

        try {
            const expiredCount = await this.signatureService.expirePendingSignatures();
            this.logger.log(`Expired ${expiredCount} offer signatures`);
        } catch (error) {
            this.logger.error('Failed to expire signatures', error);
        }
    }

    /**
     * Clean up old background check data weekly
     * Archive completed checks older than 2 years
     */
    @Cron(CronExpression.EVERY_WEEK)
    async handleWeeklyCleanup() {
        this.logger.log('Running weekly recruitment data cleanup...');
        // Placeholder for future cleanup tasks
        // - Archive old applications
        // - Clean up expired interview slots
        // - Generate weekly recruitment reports
    }

    /**
     * Generate daily recruitment dashboard statistics
     * Runs at 6 AM to prepare data for the day
     */
    @Cron('0 6 * * *') // 6:00 AM every day
    async handleDailyStats() {
        this.logger.log('Generating daily recruitment statistics...');
        // Future enhancement: Generate and cache daily statistics
        // This could populate a cache or send a summary email to HR
    }

    /**
     * Send follow-up emails for candidates who haven't responded to offers
     * Runs daily at 10 AM
     */
    @Cron('0 10 * * *') // 10:00 AM every day
    async handleOfferFollowUps() {
        this.logger.log('Checking for pending offer follow-ups...');

        try {
            const pending = await this.signatureService.getPendingSignatures();

            for (const signature of pending) {
                const daysPending = Math.floor(
                    (Date.now() - signature.created_at.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Send reminder on day 3 and day 5
                if (daysPending === 3 || daysPending === 5) {
                    this.logger.log(`Sending offer reminder for signature ${signature.id} (${daysPending} days pending)`);
                    // The follow-up email could be added here
                }
            }
        } catch (error) {
            this.logger.error('Failed to process offer follow-ups', error);
        }
    }

    /**
     * Get all registered cron jobs
     */
    getCronJobs() {
        const jobs = this.schedulerRegistry.getCronJobs();
        const cronList: { name: string; nextDate: string }[] = [];

        jobs.forEach((job, key) => {
            cronList.push({
                name: key,
                nextDate: job.nextDate()?.toISO() || 'N/A',
            });
        });

        return cronList;
    }
}
