import { Test, TestingModule } from '@nestjs/testing';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

describe('OrgController', () => {
  let controller: OrgController;

  const mockOrgService = {
    getRegions: jest.fn(),
    getBranches: jest.fn(),
    getDepartments: jest.fn(),
    getPositions: jest.fn(),
    createRegion: jest.fn(),
    createBranch: jest.fn(),
    createDepartment: jest.fn(),
    createPosition: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgController],
      providers: [
        { provide: OrgService, useValue: mockOrgService },
      ],
    }).compile();

    controller = module.get<OrgController>(OrgController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
