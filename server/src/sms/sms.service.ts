import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendSmsOptions {
    to: string;
    message: string;
    from?: string;
}

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    constructor(private readonly configService: ConfigService) { }

    isEnabled(): boolean {
        return this.configService.get<string>('SMS_ENABLED') === 'true';
    }

    async sendSms(options: SendSmsOptions): Promise<{ success: boolean; error?: string; providerResponse?: any }> {
        if (!this.isEnabled()) {
            return { success: false, error: 'SMS is disabled (set SMS_ENABLED=true to enable)' };
        }

        const username = this.configService.get<string>('AT_USERNAME');
        const apiKey = this.configService.get<string>('AT_API_KEY');
        const endpoint = this.configService.get<string>('AT_SMS_ENDPOINT') || 'https://api.africastalking.com/version1/messaging';

        if (!username || !apiKey) {
            return { success: false, error: 'Missing Africa\'s Talking credentials (AT_USERNAME, AT_API_KEY)' };
        }

        const from = options.from || this.configService.get<string>('AT_FROM');

        const body = new URLSearchParams();
        body.set('username', username);
        body.set('to', options.to);
        body.set('message', options.message);
        if (from) body.set('from', from);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apiKey': apiKey,
                },
                body,
            });

            const text = await response.text();
            let payload: any = text;
            try {
                payload = JSON.parse(text);
            } catch {
                // ignore
            }

            if (!response.ok) {
                this.logger.warn(`SMS provider error (${response.status}): ${text}`);
                return { success: false, error: `SMS provider error (${response.status})`, providerResponse: payload };
            }

            return { success: true, providerResponse: payload };
        } catch (e: any) {
            this.logger.error(`SMS send failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    }
}
