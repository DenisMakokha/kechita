import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThanOrEqual, MoreThanOrEqual, In, IsNull, Not } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { LeaveType } from './entities/leave-type.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { LeaveRequest, LeaveRequestStatus } from './entities/leave-request.entity';
import { PublicHoliday } from './entities/public-holiday.entity';
import { ApprovalService, ApprovalCompletedEvent } from '../approval/approval.service';
import { Staff, ProbationStatus, Gender } from '../staff/entities/staff.entity';

export interface CreateLeaveRequestDto {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    reason?: string;
    is_emergency?: boolean;
    is_half_day?: boolean;
    half_day_period?: string;
    reliever_id?: string;
    handover_notes?: string;
    contact_phone?: string;
    contact_address?: string;
    attachment_url?: string;
}

export interface LeaveCalendarEntry {
    id: string;
    staffId: string;
    staffName: string;
    leaveType: string;
    leaveTypeColor?: string;
    startDate: Date;
    endDate: Date;
    status: string;
    totalDays: number;
}

export interface LeaveStats {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalDaysTaken: number;
    staffOnLeaveToday: number;
}

export interface LeaveConflict {
    conflictingRequest: {
        id: string;
        staffId: string;
        staffName: string;
        position?: string;
        department?: string;
    };
    overlappingDates: {
        start: Date;
        end: Date;
        overlapDays: number;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
}

export interface LeaveConflictAnalysis {
    hasConflicts: boolean;
    conflicts: LeaveConflict[];
    branchCoverage: {
        totalStaff: number;
        staffOnLeave: number;
        coveragePercentage: number;
    };
    departmentCoverage?: {
        totalStaff: number;
        staffOnLeave: number;
        coveragePercentage: number;
    };
    warnings: string[];
    canAutoApprove: boolean;
}

@Injectable()
export class LeaveService {
    constructor(
        @InjectRepository(LeaveType)
        private leaveTypeRepo: Repository<LeaveType>,
        @InjectRepository(LeaveBalance)
        private leaveBalanceRepo: Repository<LeaveBalance>,
        @InjectRepository(LeaveRequest)
        private leaveRequestRepo: Repository<LeaveRequest>,
        @InjectRepository(PublicHoliday)
        private holidayRepo: Repository<PublicHoliday>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        private approvalService: ApprovalService,
        private dataSource: DataSource,
    ) { }

    // ==================== APPROVAL EVENT LISTENER ====================

    @OnEvent('approval.completed')
    async handleApprovalCompleted(event: ApprovalCompletedEvent) {
        if (event.targetType !== 'leave') return;

        if (event.status === 'approved') {
            await this.onLeaveApproved(event.targetId, event.approverId);
        } else if (event.status === 'rejected') {
            await this.onLeaveRejected(event.targetId, event.comment);
        }
        console.log(`Leave ${event.targetId} status updated to ${event.status}`);
    }

    // ==================== LEAVE TYPES ====================

    async getLeaveTypes(activeOnly = true): Promise<LeaveType[]> {
        const where = activeOnly ? { is_active: true } : {};
        return this.leaveTypeRepo.find({
            where,
            order: { sort_order: 'ASC', name: 'ASC' },
        });
    }

    async getLeaveTypesForStaff(staffId: string): Promise<LeaveType[]> {
        const staff = await this.staffRepo.findOne({
            where: { id: staffId },
            relations: ['position'],
        });
        if (!staff) throw new NotFoundException('Staff not found');

        const allTypes = await this.leaveTypeRepo.find({ where: { is_active: true } });

        return allTypes.filter(type => {
            // Filter by gender if applicable
            if (type.applicable_gender && staff.gender !== type.applicable_gender) {
                return false;
            }
            // Filter by confirmation status
            if (type.requires_confirmation && staff.probation_status !== ProbationStatus.PASSED) {
                return false;
            }
            return true;
        });
    }

    async createLeaveType(data: Partial<LeaveType>): Promise<LeaveType> {
        const leaveType = this.leaveTypeRepo.create(data);
        return this.leaveTypeRepo.save(leaveType);
    }

    async updateLeaveType(id: string, data: Partial<LeaveType>): Promise<LeaveType> {
        await this.leaveTypeRepo.update(id, data);
        const updated = await this.leaveTypeRepo.findOneBy({ id });
        if (!updated) throw new NotFoundException('Leave type not found');
        return updated;
    }

    // ==================== LEAVE REQUESTS ====================

    async requestLeave(staffId: string, dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const staff = await queryRunner.manager.findOne(Staff, {
                where: { id: staffId },
                relations: ['position'],
            });
            if (!staff) throw new NotFoundException('Staff not found');

            const leaveType = await queryRunner.manager.findOne(LeaveType, {
                where: { id: dto.leave_type_id }
            });
            if (!leaveType) throw new NotFoundException('Leave type not found');

            // Validate leave type eligibility
            if (leaveType.applicable_gender && staff.gender !== leaveType.applicable_gender) {
                throw new BadRequestException(`This leave type is only available for ${leaveType.applicable_gender} staff`);
            }
            if (leaveType.requires_confirmation && staff.probation_status !== ProbationStatus.PASSED) {
                throw new BadRequestException('This leave type is only available for confirmed staff');
            }

            // Calculate working days (excluding weekends and holidays)
            const startDate = new Date(dto.start_date);
            const endDate = new Date(dto.end_date);

            if (endDate < startDate) {
                throw new BadRequestException('End date cannot be before start date');
            }

            // Check minimum notice period
            if (leaveType.min_days_before_request && !dto.is_emergency) {
                const today = new Date();
                const daysNotice = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (daysNotice < leaveType.min_days_before_request) {
                    throw new BadRequestException(
                        `This leave type requires at least ${leaveType.min_days_before_request} days notice`
                    );
                }
            }

            let totalDays = await this.calculateWorkingDays(startDate, endDate);
            if (dto.is_half_day) {
                totalDays = 0.5;
            }

            // Check and deduct from balance
            const year = startDate.getFullYear();
            let balance = await queryRunner.manager.findOne(LeaveBalance, {
                where: { staff: { id: staffId }, leaveType: { id: dto.leave_type_id }, year },
            });

            if (!balance) {
                // Create default balance for the year
                balance = queryRunner.manager.create(LeaveBalance, {
                    staff,
                    leaveType,
                    year,
                    entitled_days: leaveType.max_days_per_year || 0,
                    balance_days: leaveType.max_days_per_year || 0,
                });
                await queryRunner.manager.save(balance);
            }

            const availableBalance = balance.available_balance;
            if (!leaveType.allow_negative && availableBalance < totalDays) {
                throw new BadRequestException(
                    `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${totalDays} days`
                );
            }

            // Check for overlapping leave requests
            const overlapping = await queryRunner.manager.findOne(LeaveRequest, {
                where: {
                    staff: { id: staffId },
                    status: In([LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED]),
                    start_date: LessThanOrEqual(endDate),
                    end_date: MoreThanOrEqual(startDate),
                },
            });

            if (overlapping) {
                throw new BadRequestException('You already have a leave request for this period');
            }

            // Create leave request
            const leaveRequest = queryRunner.manager.create(LeaveRequest, {
                staff,
                leaveType,
                start_date: startDate,
                end_date: endDate,
                total_days: totalDays,
                status: LeaveRequestStatus.PENDING,
                is_emergency: dto.is_emergency || false,
                is_half_day: dto.is_half_day || false,
                half_day_period: dto.half_day_period,
                reason: dto.reason,
                contact_phone: dto.contact_phone,
                contact_address: dto.contact_address,
                attachment_url: dto.attachment_url,
                handover_notes: dto.handover_notes,
            });

            if (dto.reliever_id) {
                const reliever = await queryRunner.manager.findOne(Staff, { where: { id: dto.reliever_id } });
                if (reliever) leaveRequest.reliever = reliever;
            }

            const savedRequest = await queryRunner.manager.save(leaveRequest);

            // Update pending days in balance
            balance.pending_days = Number(balance.pending_days) + totalDays;
            await queryRunner.manager.save(balance);

            await queryRunner.commitTransaction();

            // Initiate approval workflow (outside transaction)
            try {
                await this.approvalService.initiateApproval('leave', savedRequest.id, 'LEAVE_DEFAULT');
            } catch (e) {
                console.warn('Leave approval flow not found:', e.message);
            }

            return savedRequest;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async cancelLeaveRequest(requestId: string, staffId: string, reason?: string): Promise<LeaveRequest> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const request = await queryRunner.manager.findOne(LeaveRequest, {
                where: { id: requestId },
                relations: ['staff', 'leaveType'],
            });

            if (!request) throw new NotFoundException('Leave request not found');
            if (request.staff.id !== staffId) {
                throw new ForbiddenException('You can only cancel your own leave requests');
            }

            const cancellableStatuses = [LeaveRequestStatus.DRAFT, LeaveRequestStatus.PENDING];
            if (!cancellableStatuses.includes(request.status)) {
                // If already approved, mark as recalled instead
                if (request.status === LeaveRequestStatus.APPROVED) {
                    request.status = LeaveRequestStatus.RECALLED;
                } else {
                    throw new BadRequestException('This leave request cannot be cancelled');
                }
            } else {
                request.status = LeaveRequestStatus.CANCELLED;
            }

            request.cancellation_reason = reason;
            request.cancelled_at = new Date();

            // Restore balance
            const year = new Date(request.start_date).getFullYear();
            const balance = await queryRunner.manager.findOne(LeaveBalance, {
                where: { staff: { id: staffId }, leaveType: { id: request.leaveType.id }, year },
            });

            if (balance) {
                if (request.status === LeaveRequestStatus.CANCELLED) {
                    balance.pending_days = Math.max(0, Number(balance.pending_days) - request.total_days);
                } else if (request.status === LeaveRequestStatus.RECALLED) {
                    balance.used_days = Math.max(0, Number(balance.used_days) - request.total_days);
                }
                await queryRunner.manager.save(balance);
            }

            const updated = await queryRunner.manager.save(request);
            await queryRunner.commitTransaction();

            return updated;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findMyRequests(staffId: string, year?: number): Promise<LeaveRequest[]> {
        const where: any = { staff: { id: staffId } };
        if (year) {
            where.start_date = MoreThanOrEqual(new Date(`${year}-01-01`));
        }
        return this.leaveRequestRepo.find({
            where,
            relations: ['leaveType', 'reliever'],
            order: { requested_at: 'DESC' },
        });
    }

    async findAllRequests(filters?: {
        status?: LeaveRequestStatus;
        branchId?: string;
        departmentId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<LeaveRequest[]> {
        const qb = this.leaveRequestRepo.createQueryBuilder('leave')
            .leftJoinAndSelect('leave.staff', 'staff')
            .leftJoinAndSelect('leave.leaveType', 'leaveType')
            .leftJoinAndSelect('leave.reliever', 'reliever')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('staff.department', 'department');

        if (filters?.status) {
            qb.andWhere('leave.status = :status', { status: filters.status });
        }
        if (filters?.branchId) {
            qb.andWhere('branch.id = :branchId', { branchId: filters.branchId });
        }
        if (filters?.departmentId) {
            qb.andWhere('department.id = :departmentId', { departmentId: filters.departmentId });
        }
        if (filters?.startDate) {
            qb.andWhere('leave.start_date >= :startDate', { startDate: filters.startDate });
        }
        if (filters?.endDate) {
            qb.andWhere('leave.end_date <= :endDate', { endDate: filters.endDate });
        }

        return qb.orderBy('leave.requested_at', 'DESC').getMany();
    }

    async getLeaveRequest(id: string): Promise<LeaveRequest> {
        const request = await this.leaveRequestRepo.findOne({
            where: { id },
            relations: ['staff', 'leaveType', 'reliever', 'finalApprover', 'cancelledBy'],
        });
        if (!request) throw new NotFoundException('Leave request not found');
        return request;
    }

    // ==================== LEAVE BALANCES ====================

    async getMyBalance(staffId: string, year?: number): Promise<LeaveBalance[]> {
        const currentYear = year || new Date().getFullYear();
        return this.leaveBalanceRepo.find({
            where: { staff: { id: staffId }, year: currentYear },
            relations: ['leaveType'],
        });
    }

    async getStaffBalance(staffId: string, leaveTypeId: string, year?: number): Promise<LeaveBalance | null> {
        const currentYear = year || new Date().getFullYear();
        return this.leaveBalanceRepo.findOne({
            where: { staff: { id: staffId }, leaveType: { id: leaveTypeId }, year: currentYear },
            relations: ['leaveType'],
        });
    }

    async adjustBalance(
        staffId: string,
        leaveTypeId: string,
        adjustmentDays: number,
        reason: string,
        adjustedBy: string,
        year?: number,
    ): Promise<LeaveBalance> {
        const currentYear = year || new Date().getFullYear();
        let balance = await this.leaveBalanceRepo.findOne({
            where: { staff: { id: staffId }, leaveType: { id: leaveTypeId }, year: currentYear },
        });

        if (!balance) {
            const staff = await this.staffRepo.findOneBy({ id: staffId });
            const leaveType = await this.leaveTypeRepo.findOneBy({ id: leaveTypeId });
            if (!staff || !leaveType) throw new NotFoundException('Staff or leave type not found');

            balance = this.leaveBalanceRepo.create({
                staff,
                leaveType,
                year: currentYear,
                entitled_days: leaveType.max_days_per_year || 0,
            });
        }

        balance.adjustment_days = Number(balance.adjustment_days) + adjustmentDays;
        balance.adjustment_reason = reason;
        balance.adjusted_by = adjustedBy;

        return this.leaveBalanceRepo.save(balance);
    }

    async initializeYearlyBalances(year: number): Promise<void> {
        // Get all active staff
        const allStaff = await this.staffRepo.find({
            where: { status: In(['active', 'probation']) },
        });

        const leaveTypes = await this.leaveTypeRepo.find({ where: { is_active: true } });

        for (const staff of allStaff) {
            for (const leaveType of leaveTypes) {
                // Check if balance already exists
                const existing = await this.leaveBalanceRepo.findOne({
                    where: { staff: { id: staff.id }, leaveType: { id: leaveType.id }, year },
                });

                if (!existing) {
                    // Check for carry forward from previous year
                    let carriedForward = 0;
                    if (leaveType.allow_carry_forward) {
                        const prevBalance = await this.leaveBalanceRepo.findOne({
                            where: { staff: { id: staff.id }, leaveType: { id: leaveType.id }, year: year - 1 },
                        });
                        if (prevBalance) {
                            const available = prevBalance.available_balance;
                            carriedForward = Math.min(available, leaveType.max_carry_forward_days || available);
                        }
                    }

                    const balance = this.leaveBalanceRepo.create({
                        staff,
                        leaveType,
                        year,
                        entitled_days: leaveType.max_days_per_year || 0,
                        carried_forward: carriedForward,
                        balance_days: (leaveType.max_days_per_year || 0) + carriedForward,
                    });
                    await this.leaveBalanceRepo.save(balance);
                }
            }
        }
    }

    // ==================== CALENDAR & REPORTS ====================

    async getLeaveCalendar(startDate: string, endDate: string, branchId?: string): Promise<LeaveCalendarEntry[]> {
        const qb = this.leaveRequestRepo.createQueryBuilder('leave')
            .leftJoinAndSelect('leave.staff', 'staff')
            .leftJoinAndSelect('leave.leaveType', 'leaveType')
            .leftJoinAndSelect('staff.branch', 'branch')
            .where('leave.status IN (:...statuses)', { statuses: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.PENDING] })
            .andWhere('leave.start_date <= :endDate', { endDate })
            .andWhere('leave.end_date >= :startDate', { startDate });

        if (branchId) {
            qb.andWhere('branch.id = :branchId', { branchId });
        }

        const leaves = await qb.getMany();

        return leaves.map(leave => ({
            id: leave.id,
            staffId: leave.staff.id,
            staffName: leave.staff.full_name,
            leaveType: leave.leaveType.name,
            leaveTypeColor: leave.leaveType.color,
            startDate: leave.start_date,
            endDate: leave.end_date,
            status: leave.status,
            totalDays: leave.total_days,
        }));
    }

    async getStaffOnLeaveToday(branchId?: string): Promise<Staff[]> {
        const today = new Date().toISOString().split('T')[0];
        const qb = this.leaveRequestRepo.createQueryBuilder('leave')
            .leftJoinAndSelect('leave.staff', 'staff')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('staff.position', 'position')
            .where('leave.status = :status', { status: LeaveRequestStatus.APPROVED })
            .andWhere('leave.start_date <= :today', { today })
            .andWhere('leave.end_date >= :today', { today });

        if (branchId) {
            qb.andWhere('branch.id = :branchId', { branchId });
        }

        const leaves = await qb.getMany();
        return leaves.map(l => l.staff);
    }

    async getLeaveStats(year?: number, branchId?: string): Promise<LeaveStats> {
        const currentYear = year || new Date().getFullYear();
        const today = new Date().toISOString().split('T')[0];

        const qb = this.leaveRequestRepo.createQueryBuilder('leave')
            .leftJoin('leave.staff', 'staff')
            .leftJoin('staff.branch', 'branch');

        if (branchId) {
            qb.andWhere('branch.id = :branchId', { branchId });
        }

        const baseQuery = qb.andWhere('EXTRACT(YEAR FROM leave.start_date) = :year', { year: currentYear });

        const total = await baseQuery.clone().getCount();
        const pending = await baseQuery.clone().andWhere('leave.status = :status', { status: LeaveRequestStatus.PENDING }).getCount();
        const approved = await baseQuery.clone().andWhere('leave.status = :status', { status: LeaveRequestStatus.APPROVED }).getCount();
        const rejected = await baseQuery.clone().andWhere('leave.status = :status', { status: LeaveRequestStatus.REJECTED }).getCount();

        const totalDaysResult = await baseQuery.clone()
            .andWhere('leave.status = :status', { status: LeaveRequestStatus.APPROVED })
            .select('SUM(leave.total_days)', 'total')
            .getRawOne();

        const onLeaveToday = await this.leaveRequestRepo.createQueryBuilder('leave')
            .leftJoin('leave.staff', 'staff')
            .leftJoin('staff.branch', 'branch')
            .where('leave.status = :status', { status: LeaveRequestStatus.APPROVED })
            .andWhere('leave.start_date <= :today', { today })
            .andWhere('leave.end_date >= :today', { today })
            .andWhere(branchId ? 'branch.id = :branchId' : '1=1', { branchId })
            .getCount();

        return {
            totalRequests: total,
            pendingRequests: pending,
            approvedRequests: approved,
            rejectedRequests: rejected,
            totalDaysTaken: Number(totalDaysResult?.total || 0),
            staffOnLeaveToday: onLeaveToday,
        };
    }

    // ==================== PUBLIC HOLIDAYS ====================

    async getPublicHolidays(year?: number): Promise<PublicHoliday[]> {
        const currentYear = year || new Date().getFullYear();
        return this.holidayRepo.find({
            where: [
                { year: currentYear, is_active: true },
                { is_recurring: true, is_active: true },
            ],
            order: { date: 'ASC' },
        });
    }

    async createPublicHoliday(data: Partial<PublicHoliday>): Promise<PublicHoliday> {
        const holiday = this.holidayRepo.create({
            ...data,
            year: data.date ? new Date(data.date).getFullYear() : new Date().getFullYear(),
        });
        return this.holidayRepo.save(holiday);
    }

    async deletePublicHoliday(id: string): Promise<void> {
        await this.holidayRepo.delete(id);
    }

    // ==================== LEAVE CONFLICT DETECTION ====================

    async checkConflicts(leaveRequestId: string): Promise<LeaveConflictAnalysis> {
        const request = await this.leaveRequestRepo.findOne({
            where: { id: leaveRequestId },
            relations: ['staff', 'staff.branch', 'staff.department', 'staff.position', 'leaveType'],
        });

        if (!request) throw new NotFoundException('Leave request not found');

        return this.analyzeConflicts(
            request.staff.id,
            request.staff.branch?.id,
            request.staff.department?.id,
            request.start_date,
            request.end_date,
            request.id,
        );
    }

    async analyzeConflicts(
        staffId: string,
        branchId?: string,
        departmentId?: string,
        startDate?: Date,
        endDate?: Date,
        excludeRequestId?: string,
    ): Promise<LeaveConflictAnalysis> {
        const start = startDate || new Date();
        const end = endDate || new Date();
        const conflicts: LeaveConflict[] = [];
        const warnings: string[] = [];

        // Find overlapping leave requests in the same branch
        const qb = this.leaveRequestRepo.createQueryBuilder('leave')
            .leftJoinAndSelect('leave.staff', 'staff')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('staff.department', 'department')
            .leftJoinAndSelect('staff.position', 'position')
            .where('leave.status IN (:...statuses)', {
                statuses: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED]
            })
            .andWhere('leave.start_date <= :endDate', { endDate: end })
            .andWhere('leave.end_date >= :startDate', { startDate: start })
            .andWhere('staff.id != :staffId', { staffId });

        if (branchId) {
            qb.andWhere('branch.id = :branchId', { branchId });
        }

        if (excludeRequestId) {
            qb.andWhere('leave.id != :excludeId', { excludeId: excludeRequestId });
        }

        const overlappingRequests = await qb.getMany();

        // Analyze each overlapping request
        for (const overlap of overlappingRequests) {
            const overlapStart = new Date(Math.max(start.getTime(), new Date(overlap.start_date).getTime()));
            const overlapEnd = new Date(Math.min(end.getTime(), new Date(overlap.end_date).getTime()));
            const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            const severity = this.calculateConflictSeverity(overlap, departmentId);
            const reason = this.getConflictReason(overlap, departmentId, severity);

            conflicts.push({
                conflictingRequest: {
                    id: overlap.id,
                    staffId: overlap.staff.id,
                    staffName: overlap.staff.full_name,
                    position: overlap.staff.position?.name,
                    department: overlap.staff.department?.name,
                },
                overlappingDates: {
                    start: overlapStart,
                    end: overlapEnd,
                    overlapDays,
                },
                severity,
                reason,
            });
        }

        // Calculate branch coverage
        let branchCoverage = { totalStaff: 0, staffOnLeave: 0, coveragePercentage: 100 };
        if (branchId) {
            const totalBranchStaff = await this.staffRepo.count({
                where: { branch: { id: branchId }, status: In(['active', 'probation']) },
            });
            const staffOnLeave = overlappingRequests.length + 1; // +1 for the current request
            branchCoverage = {
                totalStaff: totalBranchStaff,
                staffOnLeave,
                coveragePercentage: Math.max(0, ((totalBranchStaff - staffOnLeave) / totalBranchStaff) * 100),
            };

            if (branchCoverage.coveragePercentage < 50) {
                warnings.push(`Branch coverage will drop to ${branchCoverage.coveragePercentage.toFixed(0)}% during this period`);
            }
        }

        // Calculate department coverage
        let departmentCoverage: LeaveConflictAnalysis['departmentCoverage'];
        if (departmentId) {
            const totalDeptStaff = await this.staffRepo.count({
                where: { department: { id: departmentId }, status: In(['active', 'probation']) },
            });
            const deptStaffOnLeave = overlappingRequests.filter(
                r => r.staff.department?.id === departmentId
            ).length + 1;

            departmentCoverage = {
                totalStaff: totalDeptStaff,
                staffOnLeave: deptStaffOnLeave,
                coveragePercentage: Math.max(0, ((totalDeptStaff - deptStaffOnLeave) / totalDeptStaff) * 100),
            };

            if (departmentCoverage.coveragePercentage < 30) {
                warnings.push(`Department will have less than 30% coverage during this period`);
            }
        }

        // Check for critical conflicts (e.g., managers both on leave)
        const managerConflicts = conflicts.filter(c => c.severity === 'critical');
        if (managerConflicts.length > 0) {
            warnings.push('Multiple supervisory staff will be on leave simultaneously');
        }

        // Determine if auto-approve is safe
        const hasHighSeverity = conflicts.some(c => c.severity === 'high' || c.severity === 'critical');
        const canAutoApprove = !hasHighSeverity &&
            warnings.length === 0 &&
            branchCoverage.coveragePercentage >= 60;

        return {
            hasConflicts: conflicts.length > 0,
            conflicts,
            branchCoverage,
            departmentCoverage,
            warnings,
            canAutoApprove,
        };
    }

    private calculateConflictSeverity(
        overlap: LeaveRequest,
        requestingStaffDeptId?: string
    ): 'low' | 'medium' | 'high' | 'critical' {
        // Critical: Same department AND management/supervisory role
        const isSameDept = overlap.staff.department?.id === requestingStaffDeptId;
        const isSupervisory = overlap.staff.position?.name?.toLowerCase().includes('manager') ||
            overlap.staff.position?.name?.toLowerCase().includes('supervisor') ||
            overlap.staff.position?.name?.toLowerCase().includes('lead');

        if (isSameDept && isSupervisory) {
            return 'critical';
        }

        // High: Same department
        if (isSameDept) {
            return 'high';
        }

        // Medium: Supervisory role in same branch
        if (isSupervisory) {
            return 'medium';
        }

        // Low: Just same branch overlap
        return 'low';
    }

    private getConflictReason(
        overlap: LeaveRequest,
        requestingStaffDeptId?: string,
        severity: string = 'low'
    ): string {
        const staffName = overlap.staff.full_name;
        const position = overlap.staff.position?.name || 'Staff';
        const dates = `${overlap.start_date.toLocaleDateString()} - ${overlap.end_date.toLocaleDateString()}`;

        switch (severity) {
            case 'critical':
                return `${staffName} (${position}) from the same department is already on leave (${dates})`;
            case 'high':
                return `${staffName} (${position}) in your department has overlapping leave (${dates})`;
            case 'medium':
                return `${staffName} (${position}) is on leave during this period (${dates})`;
            default:
                return `${staffName} (${position}) has overlapping leave (${dates})`;
        }
    }

    async getUpcomingConflicts(branchId: string, daysAhead: number = 30): Promise<{
        date: string;
        staffOnLeave: number;
        staffNames: string[];
    }[]> {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysAhead);

        const leaves = await this.leaveRequestRepo.find({
            where: {
                staff: { branch: { id: branchId } },
                status: In([LeaveRequestStatus.APPROVED, LeaveRequestStatus.PENDING]),
                start_date: LessThanOrEqual(endDate),
                end_date: MoreThanOrEqual(startDate),
            },
            relations: ['staff'],
        });

        // Build day-by-day analysis
        const dayMap = new Map<string, Set<string>>();

        for (const leave of leaves) {
            const leaveStart = new Date(Math.max(startDate.getTime(), new Date(leave.start_date).getTime()));
            const leaveEnd = new Date(Math.min(endDate.getTime(), new Date(leave.end_date).getTime()));

            const current = new Date(leaveStart);
            while (current <= leaveEnd) {
                const dateStr = current.toISOString().split('T')[0];
                if (!dayMap.has(dateStr)) {
                    dayMap.set(dateStr, new Set());
                }
                dayMap.get(dateStr)!.add(leave.staff.full_name);
                current.setDate(current.getDate() + 1);
            }
        }

        return Array.from(dayMap.entries())
            .filter(([_, names]) => names.size > 1) // Only days with multiple people on leave
            .map(([date, names]) => ({
                date,
                staffOnLeave: names.size,
                staffNames: Array.from(names),
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // ==================== HELPERS ====================

    private async calculateWorkingDays(startDate: Date, endDate: Date): Promise<number> {
        const holidays = await this.getPublicHolidays(startDate.getFullYear());
        const holidayDates = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));

        let workingDays = 0;
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dateStr = currentDate.toISOString().split('T')[0];

            // Skip weekends (Saturday = 6, Sunday = 0) and holidays
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
                workingDays++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return workingDays;
    }

    // Called by approval service when leave is approved
    async onLeaveApproved(requestId: string, approverId: string): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const request = await queryRunner.manager.findOne(LeaveRequest, {
                where: { id: requestId },
                relations: ['staff', 'leaveType'],
            });

            if (!request) return;

            request.status = LeaveRequestStatus.APPROVED;
            request.approved_at = new Date();

            const approver = await queryRunner.manager.findOne(Staff, { where: { id: approverId } });
            if (approver) request.finalApprover = approver;

            // Move days from pending to used
            const year = new Date(request.start_date).getFullYear();
            const balance = await queryRunner.manager.findOne(LeaveBalance, {
                where: { staff: { id: request.staff.id }, leaveType: { id: request.leaveType.id }, year },
            });

            if (balance) {
                balance.pending_days = Math.max(0, Number(balance.pending_days) - request.total_days);
                balance.used_days = Number(balance.used_days) + request.total_days;
                await queryRunner.manager.save(balance);
            }

            await queryRunner.manager.save(request);
            await queryRunner.commitTransaction();

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    // Called by approval service when leave is rejected
    async onLeaveRejected(requestId: string, reason?: string): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const request = await queryRunner.manager.findOne(LeaveRequest, {
                where: { id: requestId },
                relations: ['staff', 'leaveType'],
            });

            if (!request) return;

            request.status = LeaveRequestStatus.REJECTED;
            request.rejection_reason = reason;

            // Restore pending days
            const year = new Date(request.start_date).getFullYear();
            const balance = await queryRunner.manager.findOne(LeaveBalance, {
                where: { staff: { id: request.staff.id }, leaveType: { id: request.leaveType.id }, year },
            });

            if (balance) {
                balance.pending_days = Math.max(0, Number(balance.pending_days) - request.total_days);
                await queryRunner.manager.save(balance);
            }

            await queryRunner.manager.save(request);
            await queryRunner.commitTransaction();

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
