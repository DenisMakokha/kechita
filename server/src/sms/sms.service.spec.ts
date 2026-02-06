import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
    let service: SmsService;
    let mockConfigService: { get: jest.Mock };

    beforeEach(async () => {
        mockConfigService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SmsService,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<SmsService>(SmsService);
    });

    describe('isEnabled', () => {
        it('should return true when SMS_ENABLED is true', () => {
            mockConfigService.get.mockReturnValue('true');

            expect(service.isEnabled()).toBe(true);
        });

        it('should return false when SMS_ENABLED is not true', () => {
            mockConfigService.get.mockReturnValue('false');

            expect(service.isEnabled()).toBe(false);
        });

        it('should return false when SMS_ENABLED is undefined', () => {
            mockConfigService.get.mockReturnValue(undefined);

            expect(service.isEnabled()).toBe(false);
        });
    });

    describe('sendSms', () => {
        it('should return error when SMS is disabled', async () => {
            mockConfigService.get.mockReturnValue(undefined);

            const result = await service.sendSms({
                to: '+254700000000',
                message: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('SMS is disabled');
        });

        it('should return error when credentials are missing', async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === 'SMS_ENABLED') return 'true';
                return undefined;
            });

            const result = await service.sendSms({
                to: '+254700000000',
                message: 'Test message',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing Africa\'s Talking credentials');
        });

        it('should send SMS when properly configured', async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                const config: Record<string, string> = {
                    SMS_ENABLED: 'true',
                    AT_USERNAME: 'sandbox',
                    AT_API_KEY: 'test-api-key',
                    AT_SMS_ENDPOINT: 'https://api.sandbox.africastalking.com/version1/messaging',
                    AT_FROM: 'KECHITA',
                };
                return config[key];
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
                to: '+254700000000',
                message: 'Test message',
            });

            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                const config: Record<string, string> = {
                    SMS_ENABLED: 'true',
                    AT_USERNAME: 'sandbox',
                    AT_API_KEY: 'invalid-key',
                    AT_SMS_ENDPOINT: 'https://api.sandbox.africastalking.com/version1/messaging',
                };
                return config[key];
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
            expect(result.error).toContain('SMS provider error');
        });

        it('should handle network errors', async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                const config: Record<string, string> = {
                    SMS_ENABLED: 'true',
                    AT_USERNAME: 'sandbox',
                    AT_API_KEY: 'test-key',
                };
                return config[key];
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
            mockConfigService.get.mockImplementation((key: string) => {
                const config: Record<string, string> = {
                    SMS_ENABLED: 'true',
                    AT_USERNAME: 'sandbox',
                    AT_API_KEY: 'test-key',
                };
                return config[key];
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
