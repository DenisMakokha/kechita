import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';
import { Claim } from './entities/claim.entity';
import { ClaimType } from './entities/claim-type.entity';
import { ClaimItem } from './entities/claim-item.entity';
import { ApprovalModule } from '../approval/approval.module';
import { Staff } from '../staff/entities/staff.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Claim, ClaimType, ClaimItem, Staff]),
        ApprovalModule,
    ],
    controllers: [ClaimsController],
    providers: [ClaimsService],
    exports: [ClaimsService],
})
export class ClaimsModule { }
