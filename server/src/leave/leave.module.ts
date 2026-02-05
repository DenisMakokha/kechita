import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveType } from './entities/leave-type.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { PublicHoliday } from './entities/public-holiday.entity';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { ApprovalModule } from '../approval/approval.module';
import { Staff } from '../staff/entities/staff.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            LeaveType,
            LeaveBalance,
            LeaveRequest,
            PublicHoliday,
            Staff,
        ]),
        forwardRef(() => ApprovalModule),
    ],
    controllers: [LeaveController],
    providers: [LeaveService],
    exports: [LeaveService],
})
export class LeaveModule { }
