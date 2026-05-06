import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { EmailService } from './email/email.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([{ now: new Date() }]),
  };

  const mockEmailService = {
    checkHealth: jest.fn().mockResolvedValue({ status: 'up', configured: true, latency: 10 }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test'),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const mockRes = { status: jest.fn().mockReturnThis() } as any;
      const result = await appController.getHealth(mockRes);
      expect(result).toHaveProperty('status');
    });
  });
});
