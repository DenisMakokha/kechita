import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SmsService } from './sms.service';
import { SystemSetting } from '../auth/entities/system-setting.entity';

describe('SmsService', () => {
    let service: SmsService;
    let mockConfigService: { get: jest.Mock };
    let mockSettingRepo: { find: jest.Mock };

    async function setupService(configValues: Record<string, string> = {}, dbSettings: any[] = []) {
        mockConfigService = {
            get: jest.fn((key: string) => configValues[key]),
        };

        mockSettingRepo = {
            find: jest.fn().mockResolvedValue(dbSettings),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SmsService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: getRepositoryToken(SystemSetting), useValue: mockSettingRepo },
            ],
        }).compile();

        service = module.get<SmsService>(SmsService);
        await service.onModuleInit();
    }

    describe('isEnabled', () => {
        it('should return true when SMS_ENABLED is true', async () => {
            await setupService({ SMS_ENABLED: 'true' });
            expect(service.isEnabled()).toBe(true);
        });

        it('should return false when SMS_ENABLED is not true', async () => {
            await setupService({ SMS_ENABLED: 'false' });
            expect(service.isEnabled()).toBe(false);
        });

        it('should return false when SMS_ENABLED is undefined', async () => {
            await setupService({});
            expect(service.isEnabled()).toBe(false);
        });
    });

    describe('sendSms', () => {
        it('should return error when SMS is disabled', async () => {
            await setupService({});

            const result = await service.sendSms({
                to: '+254700000000',
                message: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('SMS is disabled');
        });

        it('should return error when credentials are missing', async () => {
            await setupService({ SMS_ENABLED: 'true' });

            const result = await service.sendSms({
                to: '+254700000000',
                message: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing credentials for provider');
        });

        it('should send SMS when properly configured', async () => {
            await setupService({
                SMS_ENABLED: 'true',
                SMS_PROVIDER: 'africastalking',
                AT_USERNAME: 'sandbox',
                AT_API_KEY: 'test-api-key',
                AT_SMS_ENDPOINT: 'https://api.sandbox.africastalking.com/version1/messaging',
                AT_FROM: 'KECHITA',
            });

            // Mock fetch
            const mockFetch = jest.fn().mockResolvedValue({
                ok: true,
                text: jest.fn().mockResolvedValue(JSON.stringify({
                    SMSMessageData: {
                        Message: 'Sent to 1/1 Total Cost: KES 0.8000',
                        Recipients: [{ statusCode: 101, number: '+254700000000', status: 'Success' }],
                    },
                })),
            });
            global.fetch = mockFetch;

            const result = await service.sendSms({
                to: '0700000000', // Unnormalized
                message: 'Test message',
            });

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalled();
            const callArgs = mockFetch.mock.calls[0];
            // Expect to contain the + sign prepended for AT, and formatted to international 254
            expect(callArgs[1].body.get('to')).toBe('+254700000000');
        });

        it('should handle API errors gracefully', async () => {
            await setupService({
                SMS_ENABLED: 'true',
                SMS_PROVIDER: 'africastalking',
                AT_USERNAME: 'sandbox',
                AT_API_KEY: 'invalid-key',
                AT_SMS_ENDPOINT: 'https://api.sandbox.africastalking.com/version1/messaging',
            });

            const mockFetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 401,
                text: jest.fn().mockResolvedValue('Unauthorized'),
            });
            global.fetch = mockFetch;

            const result = await service.sendSms({
                to: '+254700000000',
                message: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Provider error');
        });

        it('should handle network errors', async () => {
            await setupService({
                SMS_ENABLED: 'true',
                SMS_PROVIDER: 'africastalking',
                AT_USERNAME: 'sandbox',
                AT_API_KEY: 'test-key',
            });

            const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
            global.fetch = mockFetch;

            const result = await service.sendSms({
                to: '+254700000000',
                message: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });

        it('should use custom from number when provided', async () => {
            await setupService({
                SMS_ENABLED: 'true',
                SMS_PROVIDER: 'africastalking',
                AT_USERNAME: 'sandbox',
                AT_API_KEY: 'test-key',
            });

            const mockFetch = jest.fn().mockResolvedValue({
                ok: true,
                text: jest.fn().mockResolvedValue('{}'),
            });
            global.fetch = mockFetch;

            await service.sendSms({
                to: '+254700000000',
                message: 'Test message',
                from: 'CUSTOM',
            });

            expect(mockFetch).toHaveBeenCalled();
            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1].body.get('from')).toBe('CUSTOM');
        });
    });
});
