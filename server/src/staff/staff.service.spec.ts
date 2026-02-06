import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Position } from '../org/entities/position.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { EmploymentHistory } from './entities/employment-history.entity';
import { OnboardingService } from './services/onboarding.service';

describe('StaffService', () => {
  let service: StaffService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    })),
  };

  const mockOnboardingService = {
    initiateOnboarding: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Staff), useValue: mockRepository },
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: getRepositoryToken(Role), useValue: mockRepository },
        { provide: getRepositoryToken(Position), useValue: mockRepository },
        { provide: getRepositoryToken(Region), useValue: mockRepository },
        { provide: getRepositoryToken(Branch), useValue: mockRepository },
        { provide: getRepositoryToken(Department), useValue: mockRepository },
        { provide: getRepositoryToken(EmploymentHistory), useValue: mockRepository },
        { provide: OnboardingService, useValue: mockOnboardingService },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
