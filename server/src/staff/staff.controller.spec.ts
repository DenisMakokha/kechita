import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { DocumentService } from './services/document.service';
import { OnboardingService } from './services/onboarding.service';

describe('StaffController', () => {
  let controller: StaffController;

  const mockStaffService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockDocumentService = {
    getDocuments: jest.fn(),
    uploadDocument: jest.fn(),
  };

  const mockOnboardingService = {
    getOnboardingStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        { provide: StaffService, useValue: mockStaffService },
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: OnboardingService, useValue: mockOnboardingService },
      ],
    }).compile();

    controller = module.get<StaffController>(StaffController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
