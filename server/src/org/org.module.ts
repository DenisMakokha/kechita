import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { Region } from './entities/region.entity';
import { Branch } from './entities/branch.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { JobDescription } from './entities/job-description.entity';
import { JobDescriptionService } from './job-description.service';
import { JobDescriptionController } from './job-description.controller';
import { DocumentTemplatesModule } from '../document-templates/document-templates.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Region, Branch, Department, Position, JobDescription]),
        DocumentTemplatesModule,
    ],
    controllers: [OrgController, JobDescriptionController],
    providers: [OrgService, JobDescriptionService],
    exports: [JobDescriptionService],
})
export class OrgModule { }
