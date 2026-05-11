import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { RosterAssignment } from './entities/roster-assignment.entity';
import { TimeEntry } from './entities/time-entry.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PublicHoliday } from '../leave/entities/public-holiday.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './services/attendance.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Shift, RosterAssignment, TimeEntry, Staff, PublicHoliday]),
    ],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService],
})
export class AttendanceModule {}
