import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThan, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Shift } from '../entities/shift.entity';
import { RosterAssignment } from '../entities/roster-assignment.entity';
import { TimeEntry, TimeEntryStatus, ClockInMethod } from '../entities/time-entry.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { PublicHoliday } from '../../leave/entities/public-holiday.entity';

export interface ClockInDto {
    staff_id: string;
    method?: ClockInMethod;
    lat?: number;
    lng?: number;
    ip?: string;
    branch_id?: string;
    notes?: string;
}

export interface ClockOutDto {
    staff_id: string;
    lat?: number;
    lng?: number;
    ip?: string;
    notes?: string;
}

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        @InjectRepository(Shift) private shiftRepo: Repository<Shift>,
        @InjectRepository(RosterAssignment) private rosterRepo: Repository<RosterAssignment>,
        @InjectRepository(TimeEntry) private entryRepo: Repository<TimeEntry>,
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
        @InjectRepository(PublicHoliday) private holidayRepo: Repository<PublicHoliday>,
    ) {}

    // ─────────── Shifts ───────────
    async createShift(data: Partial<Shift>): Promise<Shift> {
        if (data.code) {
            const existing = await this.shiftRepo.findOne({ where: { code: data.code } });
            if (existing) throw new ConflictException('Shift code already exists');
        }
        const s = this.shiftRepo.create(data);
        return this.shiftRepo.save(s);
    }

    async updateShift(id: string, data: Partial<Shift>): Promise<Shift> {
        const s = await this.shiftRepo.findOne({ where: { id } });
        if (!s) throw new NotFoundException('Shift not found');
        Object.assign(s, data);
        return this.shiftRepo.save(s);
    }

    async deleteShift(id: string): Promise<void> {
        const r = await this.shiftRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Shift not found');
    }

    async listShifts(activeOnly = false): Promise<Shift[]> {
        return this.shiftRepo.find({ where: activeOnly ? { is_active: true } : {}, order: { start_time: 'ASC' } });
    }

    // ─────────── Roster ───────────
    async assignRoster(assignments: Array<{ staff_id: string; shift_id: string; date: string; is_day_off?: boolean; notes?: string }>): Promise<{ created: number; updated: number }> {
        let created = 0, updated = 0;
        for (const a of assignments) {
            const existing = await this.rosterRepo.findOne({ where: { staff_id: a.staff_id, date: a.date } });
            if (existing) {
                Object.assign(existing, a);
                await this.rosterRepo.save(existing);
                updated++;
            } else {
                const r = this.rosterRepo.create(a);
                await this.rosterRepo.save(r);
                created++;
            }
        }
        return { created, updated };
    }

    async getRoster(staffId: string, from: string, to: string): Promise<RosterAssignment[]> {
        return this.rosterRepo.find({
            where: { staff_id: staffId, date: Between(from as any, to as any) },
            relations: ['shift'],
            order: { date: 'ASC' },
        });
    }

    async getBranchRoster(branchId: string, from: string, to: string): Promise<RosterAssignment[]> {
        // Naive: load all roster entries, filter by branch via staff join
        const entries = await this.rosterRepo.createQueryBuilder('r')
            .leftJoinAndSelect('r.staff', 'staff')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('r.shift', 'shift')
            .where('staff.branch_id = :branchId', { branchId })
            .andWhere('r.date BETWEEN :from AND :to', { from, to })
            .orderBy('r.date', 'ASC')
            .getMany();
        return entries;
    }

    // ─────────── Clock In / Out ───────────
    async clockIn(dto: ClockInDto): Promise<TimeEntry> {
        const today = new Date().toISOString().slice(0, 10);
        const staff = await this.staffRepo.findOne({ where: { id: dto.staff_id }, relations: ['branch'] });
        if (!staff) throw new NotFoundException('Staff not found');

        const existing = await this.entryRepo.findOne({ where: { staff_id: dto.staff_id, date: today } });
        if (existing) {
            if (existing.status === TimeEntryStatus.OPEN) throw new ConflictException('Already clocked in today');
            throw new ConflictException('Time entry already exists for today');
        }

        // Look up roster for today
        const roster = await this.rosterRepo.findOne({ where: { staff_id: dto.staff_id, date: today }, relations: ['shift'] });

        // Public holiday / weekend detection
        const holiday = await this.holidayRepo.findOne({ where: { date: today as any } }).catch(() => null);
        const dayOfWeek = new Date(today).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Late detection
        let lateMinutes = 0;
        if (roster?.shift && !roster.is_day_off) {
            const [sh, sm] = roster.shift.start_time.split(':').map(Number);
            const scheduledStart = new Date();
            scheduledStart.setHours(sh, sm, 0, 0);
            const grace = roster.shift.grace_minutes || 0;
            const cutoff = new Date(scheduledStart.getTime() + grace * 60_000);
            const now = new Date();
            if (now > cutoff) {
                lateMinutes = Math.floor((now.getTime() - scheduledStart.getTime()) / 60_000);
            }
        }

        const entry = this.entryRepo.create({
            staff_id: dto.staff_id,
            shift_id: roster?.shift_id,
            date: today,
            clock_in_at: new Date(),
            clock_in_method: dto.method || ClockInMethod.WEB,
            clock_in_lat: dto.lat,
            clock_in_lng: dto.lng,
            clock_in_ip: dto.ip,
            branch_id: dto.branch_id || (staff as any).branch?.id,
            status: TimeEntryStatus.OPEN,
            late_minutes: lateMinutes,
            is_holiday: !!holiday,
            is_weekend: isWeekend,
            notes: dto.notes,
        });
        return this.entryRepo.save(entry);
    }

    async clockOut(dto: ClockOutDto): Promise<TimeEntry> {
        const today = new Date().toISOString().slice(0, 10);
        const entry = await this.entryRepo.findOne({
            where: { staff_id: dto.staff_id, date: today, status: TimeEntryStatus.OPEN },
            relations: ['shift'],
        });
        if (!entry) throw new NotFoundException('No open time entry for today');

        entry.clock_out_at = new Date();
        entry.clock_out_lat = dto.lat;
        entry.clock_out_lng = dto.lng;
        entry.clock_out_ip = dto.ip;
        entry.status = TimeEntryStatus.COMPLETE;

        // Calculate worked / overtime
        const workedMs = entry.clock_out_at.getTime() - new Date(entry.clock_in_at).getTime();
        const workedMin = Math.max(0, Math.floor(workedMs / 60_000));
        const breakMin = entry.shift?.break_minutes || 60;
        entry.worked_minutes = Math.max(0, workedMin - breakMin);

        // Overtime: anything beyond shift's standard hours
        if (entry.shift) {
            const [sh, sm] = entry.shift.start_time.split(':').map(Number);
            const [eh, em] = entry.shift.end_time.split(':').map(Number);
            let standardMin = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
            if (entry.shift.is_night_shift && standardMin <= 0) standardMin += 24 * 60;
            if (standardMin > 0 && entry.worked_minutes > standardMin) {
                entry.overtime_minutes = entry.worked_minutes - standardMin;
            } else if (entry.worked_minutes < standardMin) {
                entry.undertime_minutes = standardMin - entry.worked_minutes;
            }
        }

        if (dto.notes) entry.notes = (entry.notes ? entry.notes + '\n' : '') + dto.notes;

        return this.entryRepo.save(entry);
    }

    async getTodayEntry(staffId: string): Promise<TimeEntry | null> {
        const today = new Date().toISOString().slice(0, 10);
        return this.entryRepo.findOne({ where: { staff_id: staffId, date: today }, relations: ['shift'] });
    }

    async listEntries(staffId: string, from: string, to: string): Promise<TimeEntry[]> {
        return this.entryRepo.find({
            where: { staff_id: staffId, date: Between(from as any, to as any) },
            relations: ['shift'],
            order: { date: 'DESC' },
        });
    }

    async listAllEntries(from: string, to: string, branchId?: string): Promise<TimeEntry[]> {
        const qb = this.entryRepo.createQueryBuilder('e')
            .leftJoinAndSelect('e.staff', 'staff')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('e.shift', 'shift')
            .where('e.date BETWEEN :from AND :to', { from, to });
        if (branchId) qb.andWhere('staff.branch_id = :branchId', { branchId });
        return qb.orderBy('e.date', 'DESC').addOrderBy('e.clock_in_at', 'DESC').getMany();
    }

    async approveEntry(id: string, userId: string): Promise<TimeEntry> {
        const e = await this.entryRepo.findOne({ where: { id } });
        if (!e) throw new NotFoundException('Entry not found');
        e.status = TimeEntryStatus.APPROVED;
        e.approved_by_user_id = userId;
        e.approved_at = new Date();
        return this.entryRepo.save(e);
    }

    async rejectEntry(id: string, reason: string, userId: string): Promise<TimeEntry> {
        const e = await this.entryRepo.findOne({ where: { id } });
        if (!e) throw new NotFoundException('Entry not found');
        e.status = TimeEntryStatus.REJECTED;
        e.rejection_reason = reason;
        e.approved_by_user_id = userId;
        e.approved_at = new Date();
        return this.entryRepo.save(e);
    }

    async manualEntry(data: Partial<TimeEntry> & { staff_id: string; date: string; clock_in_at: Date; clock_out_at?: Date }): Promise<TimeEntry> {
        const existing = await this.entryRepo.findOne({ where: { staff_id: data.staff_id, date: data.date } });
        if (existing) throw new ConflictException('Entry already exists for this date');
        const e = this.entryRepo.create({
            ...data,
            clock_in_method: ClockInMethod.MANUAL_ADMIN,
            status: data.clock_out_at ? TimeEntryStatus.COMPLETE : TimeEntryStatus.OPEN,
        });
        if (data.clock_out_at) {
            const workedMs = data.clock_out_at.getTime() - data.clock_in_at.getTime();
            e.worked_minutes = Math.max(0, Math.floor(workedMs / 60_000));
        }
        return this.entryRepo.save(e);
    }

    // ─────────── Reports ───────────
    async monthlySummary(staffId: string, year: number, month: number): Promise<{
        days_worked: number;
        total_worked_minutes: number;
        total_overtime_minutes: number;
        total_late_minutes: number;
        total_undertime_minutes: number;
        days_absent: number;
        entries: TimeEntry[];
    }> {
        const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const end = new Date(year, month, 0).toISOString().slice(0, 10);
        const entries = await this.listEntries(staffId, start, end);

        const totals = entries.reduce(
            (acc, e) => {
                acc.days_worked++;
                acc.total_worked_minutes += e.worked_minutes;
                acc.total_overtime_minutes += e.overtime_minutes;
                acc.total_late_minutes += e.late_minutes;
                acc.total_undertime_minutes += e.undertime_minutes;
                return acc;
            },
            { days_worked: 0, total_worked_minutes: 0, total_overtime_minutes: 0, total_late_minutes: 0, total_undertime_minutes: 0 },
        );

        // Days absent: scheduled days with no entry
        const roster = await this.getRoster(staffId, start, end);
        const scheduledDays = roster.filter(r => !r.is_day_off).length;
        const days_absent = Math.max(0, scheduledDays - totals.days_worked);

        return { ...totals, days_absent, entries };
    }

    // ─────────── Auto-close at end of day ───────────
    @Cron(CronExpression.EVERY_DAY_AT_11PM)
    async autoCloseOpenEntries(): Promise<number> {
        const today = new Date().toISOString().slice(0, 10);
        const openEntries = await this.entryRepo.find({ where: { status: TimeEntryStatus.OPEN, date: today } });
        let closed = 0;
        for (const e of openEntries) {
            e.clock_out_at = new Date();
            e.status = TimeEntryStatus.AUTO_CLOSED;
            const workedMs = e.clock_out_at.getTime() - new Date(e.clock_in_at).getTime();
            e.worked_minutes = Math.max(0, Math.floor(workedMs / 60_000));
            e.notes = (e.notes ? e.notes + '\n' : '') + '[AUTO-CLOSED] No clock-out recorded';
            await this.entryRepo.save(e);
            closed++;
        }
        if (closed > 0) this.logger.warn(`Auto-closed ${closed} open time entries`);
        return closed;
    }
}
