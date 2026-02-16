import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SmsProvider = 'africastalking' | 'twilio' | 'custom';

export interface SmsConfig {
    enabled: boolean;
    provider: SmsProvider;
    // Africa's Talking
    at_username?: string;
    at_api_key?: string;
    at_from?: string;
    at_endpoint?: string;
    // Twilio
    twilio_sid?: string;
    twilio_auth_token?: string;
    twilio_from?: string;
    // Custom HTTP
    custom_endpoint?: string;
    custom_api_key?: string;
    custom_method?: string;
    custom_headers?: string;
    custom_body_template?: string;
}

export interface SendSmsOptions {
    to: string;
    message: string;
    from?: string;
}

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private config: SmsConfig;

    constructor(private readonly configService: ConfigService) {
        this.config = {
            enabled: this.configService.get<string>('SMS_ENABLED') === 'true',
            provider: (this.configService.get<string>('SMS_PROVIDER') || 'africastalking') as SmsProvider,
            at_username: this.configService.get<string>('AT_USERNAME'),
            at_api_key: this.configService.get<string>('AT_API_KEY'),
            at_from: this.configService.get<string>('AT_FROM'),
            at_endpoint: this.configService.get<string>('AT_SMS_ENDPOINT') || 'https://api.africastalking.com/version1/messaging',
            twilio_sid: this.configService.get<string>('TWILIO_SID'),
            twilio_auth_token: this.configService.get<string>('TWILIO_AUTH_TOKEN'),
            twilio_from: this.configService.get<string>('TWILIO_FROM'),
            custom_endpoint: this.configService.get<string>('SMS_CUSTOM_ENDPOINT'),
            custom_api_key: this.configService.get<string>('SMS_CUSTOM_API_KEY'),
            custom_method: this.configService.get<string>('SMS_CUSTOM_METHOD') || 'POST',
            custom_headers: this.configService.get<string>('SMS_CUSTOM_HEADERS') || '{}',
            custom_body_template: this.configService.get<string>('SMS_CUSTOM_BODY_TEMPLATE') || '{"to":"{{to}}","message":"{{message}}"}',
        };

        if (this.config.enabled) {
            this.logger.log(`SMS enabled via ${this.config.provider}`);
        } else {
            this.logger.warn('SMS disabled — messages will be logged only');
        }
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    getConfig(): { enabled: boolean; provider: SmsProvider; configured: boolean } {
        const configured = this.config.enabled && this.hasCredentials();
        return { enabled: this.config.enabled, provider: this.config.provider, configured };
    }

    reconfigure(newConfig: Partial<SmsConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logger.log(`SMS reconfigured: provider=${this.config.provider}, enabled=${this.config.enabled}`);
    }

    private hasCredentials(): boolean {
        switch (this.config.provider) {
            case 'africastalking': return !!(this.config.at_username && this.config.at_api_key);
            case 'twilio': return !!(this.config.twilio_sid && this.config.twilio_auth_token && this.config.twilio_from);
            case 'custom': return !!(this.config.custom_endpoint);
            default: return false;
        }
    }

    async sendSms(options: SendSmsOptions): Promise<{ success: boolean; error?: string; providerResponse?: any }> {
        if (!this.config.enabled) {
            this.logger.log(`[SMS - DISABLED] To: ${options.to}, Message: ${options.message.substring(0, 50)}...`);
            return { success: false, error: 'SMS is disabled' };
        }

        if (!this.hasCredentials()) {
            return { success: false, error: `Missing credentials for provider: ${this.config.provider}` };
        }

        switch (this.config.provider) {
            case 'africastalking': return this.sendViaAfricasTalking(options);
            case 'twilio': return this.sendViaTwilio(options);
            case 'custom': return this.sendViaCustom(options);
            default: return { success: false, error: `Unknown provider: ${this.config.provider}` };
        }
    }

    private async sendViaAfricasTalking(options: SendSmsOptions): Promise<{ success: boolean; error?: string; providerResponse?: any }> {
        const { at_username, at_api_key, at_endpoint, at_from } = this.config;
        const from = options.from || at_from;

        const body = new URLSearchParams();
        body.set('username', at_username!);
        body.set('to', options.to);
        body.set('message', options.message);
        if (from) body.set('from', from);

        try {
            const response = await fetch(at_endpoint!, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apiKey': at_api_key!,
                },
                body,
            });

            const text = await response.text();
            let payload: any = text;
            try { payload = JSON.parse(text); } catch { /* ignore */ }

            if (!response.ok) {
                this.logger.warn(`AT SMS error (${response.status}): ${text}`);
                return { success: false, error: `Provider error (${response.status})`, providerResponse: payload };
            }

            return { success: true, providerResponse: payload };
        } catch (e: any) {
            this.logger.error(`AT SMS failed: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    private async sendViaTwilio(options: SendSmsOptions): Promise<{ success: boolean; error?: string; providerResponse?: any }> {
        const { twilio_sid, twilio_auth_token, twilio_from } = this.config;
        const from = options.from || twilio_from;

        try {
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio_sid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(`${twilio_sid}:${twilio_auth_token}`).toString('base64'),
                },
                body: new URLSearchParams({ To: options.to, From: from!, Body: options.message }),
            });

            const payload = await response.json();
            if (!response.ok) {
                return { success: false, error: payload.message || `Twilio error (${response.status})`, providerResponse: payload };
            }
            return { success: true, providerResponse: payload };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    private async sendViaCustom(options: SendSmsOptions): Promise<{ success: boolean; error?: string; providerResponse?: any }> {
        const { custom_endpoint, custom_api_key, custom_method, custom_headers, custom_body_template } = this.config;

        let headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try { headers = { ...headers, ...JSON.parse(custom_headers || '{}') }; } catch { /* ignore */ }
        if (custom_api_key) headers['Authorization'] = `Bearer ${custom_api_key}`;

        const bodyStr = (custom_body_template || '{"to":"{{to}}","message":"{{message}}"}')
            .replace(/\{\{to\}\}/g, options.to)
            .replace(/\{\{message\}\}/g, options.message.replace(/"/g, '\\"'));

        try {
            const response = await fetch(custom_endpoint!, {
                method: custom_method || 'POST',
                headers,
                body: bodyStr,
            });

            const text = await response.text();
            let payload: any = text;
            try { payload = JSON.parse(text); } catch { /* ignore */ }

            if (!response.ok) {
                return { success: false, error: `Custom API error (${response.status})`, providerResponse: payload };
            }
            return { success: true, providerResponse: payload };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}
