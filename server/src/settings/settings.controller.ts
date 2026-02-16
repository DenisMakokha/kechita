import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { EmailService } from '../email/email.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly emailService: EmailService,
    ) { }

    @Get()
    @Roles('CEO', 'HR_MANAGER')
    getAll() {
        return this.settingsService.getAll();
    }

    @Get('category/:category')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    getByCategory(@Param('category') category: string) {
        return this.settingsService.getByCategory(category);
    }

    // ── Email / SMTP Settings (must be before :key) ──

    @Get('email/config')
    @Roles('CEO', 'HR_MANAGER')
    async getEmailConfig() {
        const dbSettings = await this.settingsService.getByCategory('email');
        const liveConfig = this.emailService.getConfig();
        return {
            smtp_host: dbSettings['smtp_host'] || '',
            smtp_port: dbSettings['smtp_port'] || '587',
            smtp_user: dbSettings['smtp_user'] || '',
            smtp_pass: dbSettings['smtp_pass'] ? '••••••••' : '',
            smtp_from_email: dbSettings['smtp_from_email'] || liveConfig.fromEmail,
            smtp_from_name: dbSettings['smtp_from_name'] || liveConfig.fromName,
            smtp_secure: dbSettings['smtp_secure'] || 'false',
            configured: liveConfig.configured,
        };
    }

    @Put('email/config')
    @Roles('CEO')
    async updateEmailConfig(@Body() body: {
        smtp_host: string;
        smtp_port: string;
        smtp_user?: string;
        smtp_pass?: string;
        smtp_from_email: string;
        smtp_from_name: string;
        smtp_secure?: string;
    }) {
        const entries = [
            { key: 'smtp_host', value: body.smtp_host, category: 'email' },
            { key: 'smtp_port', value: body.smtp_port, category: 'email' },
            { key: 'smtp_user', value: body.smtp_user || '', category: 'email' },
            { key: 'smtp_from_email', value: body.smtp_from_email, category: 'email' },
            { key: 'smtp_from_name', value: body.smtp_from_name, category: 'email' },
            { key: 'smtp_secure', value: body.smtp_secure || 'false', category: 'email' },
        ];
        if (body.smtp_pass && !body.smtp_pass.includes('••')) {
            entries.push({ key: 'smtp_pass', value: body.smtp_pass, category: 'email' });
        }
        await this.settingsService.bulkSet(entries);

        const port = parseInt(body.smtp_port || '587', 10);
        const savedPass = body.smtp_pass && !body.smtp_pass.includes('••')
            ? body.smtp_pass
            : (await this.settingsService.get('smtp_pass')) || '';
        this.emailService.reconfigure({
            host: body.smtp_host,
            port,
            user: body.smtp_user,
            pass: savedPass,
            fromEmail: body.smtp_from_email,
            fromName: body.smtp_from_name,
            secure: body.smtp_secure === 'true',
        });

        return { message: 'Email settings updated and applied' };
    }

    @Post('email/test-connection')
    @Roles('CEO', 'HR_MANAGER')
    async testEmailConnection() {
        return this.emailService.testConnection();
    }

    @Post('email/send-test')
    @Roles('CEO')
    async sendTestEmail(@Body() body: { to: string }) {
        return this.emailService.sendEmail({
            to: body.to,
            subject: 'Kechita - Test Email',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #7c3aed, #db2777); color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h2 style="margin: 0;">Kechita Capital</h2>
                    </div>
                    <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 10px 10px;">
                        <p>This is a test email from your Kechita system.</p>
                        <p>If you received this, your SMTP settings are configured correctly! ✅</p>
                        <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Sent at: ${new Date().toISOString()}</p>
                    </div>
                </div>
            `,
        });
    }

    // ── Generic key-based settings (must be last — :key is a catch-all) ──

    @Get(':key')
    @Roles('CEO', 'HR_MANAGER', 'ACCOUNTANT')
    get(@Param('key') key: string) {
        return this.settingsService.get(key);
    }

    @Put(':key')
    @Roles('CEO', 'HR_MANAGER')
    set(
        @Param('key') key: string,
        @Body() body: { value: any; category?: string; description?: string },
    ) {
        return this.settingsService.set(key, body.value, body.category, body.description);
    }

    @Post('bulk')
    @Roles('CEO', 'HR_MANAGER')
    bulkSet(@Body() body: { entries: { key: string; value: any; category?: string; description?: string }[] }) {
        return this.settingsService.bulkSet(body.entries);
    }

    @Delete(':key')
    @Roles('CEO')
    remove(@Param('key') key: string) {
        return this.settingsService.remove(key);
    }
}
