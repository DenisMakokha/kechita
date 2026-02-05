import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { Region } from './entities/region.entity';
import { Branch } from './entities/branch.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Region, Branch, Department, Position])],
    controllers: [OrgController],
    providers: [OrgService],
})
export class OrgModule { }
