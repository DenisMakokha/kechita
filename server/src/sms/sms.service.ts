import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SmsProvider = 'africastalking' | 'mobulk' | 'custom';

export interface SmsConfig {
    enabled: boolean;
    provider: SmsProvider;
    // Africa's Talking
    at_username?: string;
    at_api_key?: string;
    at_from?: string;
    at_endpoint?: string;
    // Mobulk Africa
    mobulk_access_key?: string;
    mobulk_api_key?: string;
    mobulk_client_id?: string;
    mobulk_sender_id?: string;
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

    private static readonly MOBULK_SMS_URL = 'https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS';
    private static readonly MOBULK_BALANCE_URL = 'https://api.onfonmedia.co.ke/v1/sms/Balance';

    constructor(private readonly configService: ConfigService) {
        this.config = {
            enabled: this.configService.get<string>('SMS_ENABLED') === 'true',
            provider: (this.configService.get<string>('SMS_PROVIDER') || 'africastalking') as SmsProvider,
            at_username: this.configService.get<string>('AT_USERNAME'),
            at_api_key: this.configService.get<string>('AT_API_KEY'),
            at_from: this.configService.get<string>('AT_FROM'),
            at_endpoint: this.configService.get<string>('AT_SMS_ENDPOINT') || 'https://api.africastalking.com/version1/messaging',
            mobulk_access_key: this.configService.get<string>('MOBULK_ACCESS_KEY'),
            mobulk_api_key: this.configService.get<string>('MOBULK_API_KEY'),
            mobulk_client_id: this.configService.get<string>('MOBULK_CLIENT_ID'),
            mobulk_sender_id: this.configService.get<string>('MOBULK_SENDER_ID'),
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
            case 'mobulk': return !!(this.config.mobulk_access_key && this.config.mobulk_api_key && this.config.mobulk_client_id);
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
            case 'mobulk': return this.sendViaMobulk(options);
            case 'custom': return this.sendViaCustom(options);
            default: return { success: false, error: `Unknown provider: ${this.config.provider}` };
        }
    }

    /**
     * Check SMS credit balance (Mobulk Africa)
     */
    async checkBalance(): Promise<{ success: boolean; credits?: string; error?: string; providerResponse?: any }> {
        if (this.config.provider !== 'mobulk') {
            return { success: false, error: 'Credit balance check is only available for Mobulk Africa provider' };
        }

        const { mobulk_access_key, mobulk_api_key, mobulk_client_id } = this.config;
        if (!mobulk_access_key || !mobulk_api_key || !mobulk_client_id) {
            return { success: false, error: 'Missing Mobulk Africa credentials' };
        }

        try {
            const url = `${SmsService.MOBULK_BALANCE_URL}?ApiKey=${encodeURIComponent(mobulk_api_key)}&ClientId=${encodeURIComponent(mobulk_client_id)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'AccessKey': mobulk_access_key,
                },
            });

            const payload = await response.json();

            if (payload.ErrorCode !== 0) {
                this.logger.warn(`Mobulk balance error: ${payload.ErrorDescription}`);
                return { success: false, error: payload.ErrorDescription || 'Balance check failed', providerResponse: payload };
            }

            const credits = payload.Data?.[0]?.Credits || '0';
            return { success: true, credits, providerResponse: payload };
        } catch (e: any) {
            this.logger.error(`Mobulk balance check failed: ${e.message}`);
            return { success: false, error: e.message };
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

    private async sendViaMobulk(options: SendSmsOptions): Promise<{ success: boolean; error?: string; providerResponse?: any }> {
        const { mobulk_access_key, mobulk_api_key, mobulk_client_id, mobulk_sender_id } = this.config;
        const senderId = options.from || mobulk_sender_id || 'KECHITA';

        const payload = {
            SenderId: senderId,
            IsUnicode: false,
            IsFlash: false,
            MessageParameters: [
                { Number: options.to, Text: options.message },
            ],
            ApiKey: mobulk_api_key,
            ClientId: mobulk_client_id,
        };

        try {
            const response = await fetch(SmsService.MOBULK_SMS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'AccessKey': mobulk_access_key!,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.ErrorCode !== 0) {
                this.logger.warn(`Mobulk SMS error: ${result.ErrorDescription}`);
                return { success: false, error: result.ErrorDescription || 'Send failed', providerResponse: result };
            }

            return { success: true, providerResponse: result };
        } catch (e: any) {
            this.logger.error(`Mobulk SMS failed: ${e.message}`);
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
