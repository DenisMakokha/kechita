import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThanOrEqual, Between } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Staff, StaffStatus, ProbationStatus } from './entities/staff.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Position } from '../org/entities/position.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { EmploymentHistory } from './entities/employment-history.entity';
import { OnboardingService } from './services/onboarding.service';
import { CreateStaffDto, UpdateStaffDto, StaffFilterDto } from './dto/staff.dto';
import { generateTempPassword as generateTempPasswordSecure } from '../common/id-utils';

// Re-export for convenience
export { CreateStaffDto, UpdateStaffDto, StaffFilterDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Role)
        private roleRepo: Repository<Role>,
        @InjectRepository(Position)
        private positionRepo: Repository<Position>,
        @InjectRepository(Region)
        private regionRepo: Repository<Region>,
        @InjectRepository(Branch)
        private branchRepo: Repository<Branch>,
        @InjectRepository(Department)
        private departmentRepo: Repository<Department>,
        @InjectRepository(EmploymentHistory)
        private employmentHistoryRepo: Repository<EmploymentHistory>,
        private onboardingService: OnboardingService,
    ) { }

    // ==================== STAFF CREATION (ONBOARDING) ====================

    async create(createStaffDto: CreateStaffDto, createdBy?: string): Promise<Staff> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Check if User exists
            const existingUser = await queryRunner.manager.findOne(User, {
                where: { email: createStaffDto.email }
            });
            if (existingUser) {
                throw new BadRequestException('User with this email already exists');
            }

            // 2. Fetch dependencies
            const role = await queryRunner.manager.findOne(Role, { where: { id: createStaffDto.role_id } });
            if (!role) throw new BadRequestException('Invalid Role ID');

            const position = await queryRunner.manager.findOne(Position, { where: { id: createStaffDto.position_id } });
            if (!position) throw new BadRequestException('Invalid Position ID');

            // 3. Generate employee number
            const employeeNumber = await this.generateEmployeeNumber();

            // 4. Create User with temporary password
            const tempPassword = this.generateTempPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            const user = queryRunner.manager.create(User, {
                email: createStaffDto.email,
                password_hash: hashedPassword,
                is_active: true,
                roles: [role],
            });
            const savedUser = await queryRunner.manager.save(user);

            // 5. Calculate probation dates
            const hireDate = createStaffDto.hire_date ? new Date(createStaffDto.hire_date) : new Date();
            const probationMonths = createStaffDto.probation_months || 3;
            const probationEndDate = new Date(hireDate);
            probationEndDate.setMonth(probationEndDate.getMonth() + probationMonths);

            // 6. Create Staff Profile
            const staff = queryRunner.manager.create(Staff, {
                user: savedUser,
                employee_number: employeeNumber,
                first_name: createStaffDto.first_name,
                middle_name: createStaffDto.middle_name,
                last_name: createStaffDto.last_name,
                personal_email: createStaffDto.personal_email,
                phone: createStaffDto.phone,
                gender: createStaffDto.gender as any,
                date_of_birth: createStaffDto.date_of_birth,
                national_id: createStaffDto.national_id,
                tax_pin: createStaffDto.tax_pin,
                address: createStaffDto.address,
                city: createStaffDto.city,
                emergency_contact_name: createStaffDto.emergency_contact_name,
                emergency_contact_phone: createStaffDto.emergency_contact_phone,
                emergency_contact_relationship: createStaffDto.emergency_contact_relationship,
                bank_name: createStaffDto.bank_name,
                bank_account_number: createStaffDto.bank_account_number,
                basic_salary: createStaffDto.basic_salary,
                status: StaffStatus.ONBOARDING,
                position: position,
                hire_date: hireDate,
                probation_start_date: hireDate,
                probation_end_date: probationEndDate,
                probation_months: probationMonths,
                probation_status: ProbationStatus.IN_PROGRESS,
                created_by: createdBy,
            });

            // Set optional relations
            if (createStaffDto.region_id) {
                const region = await queryRunner.manager.findOne(Region, { where: { id: createStaffDto.region_id } });
                if (region) staff.region = region;
            }
            if (createStaffDto.branch_id) {
                const branch = await queryRunner.manager.findOne(Branch, { where: { id: createStaffDto.branch_id } });
                if (branch) staff.branch = branch;
            }
            if (createStaffDto.department_id) {
                const department = await queryRunner.manager.findOne(Department, { where: { id: createStaffDto.department_id } });
                if (department) staff.department = department;
            }
            if (createStaffDto.manager_id) {
                const manager = await queryRunner.manager.findOne(Staff, { where: { id: createStaffDto.manager_id } });
                if (manager) staff.manager = manager;
            }

            const savedStaff = await queryRunner.manager.save(staff);

            // 7. Create initial employment history record
            const historyRecord = queryRunner.manager.create(EmploymentHistory, {
                staff: savedStaff,
                position: position,
                branch: staff.branch,
                employment_type: 'full-time',
                start_date: hireDate,
            });
            await queryRunner.manager.save(historyRecord);

            await queryRunner.commitTransaction();

            // 8. Create onboarding instance (outside transaction for optional)
            if (createStaffDto.create_onboarding !== false) {
                try {
                    await this.onboardingService.createInstance(savedStaff.id, undefined, createdBy);
                } catch (e) {
                    console.warn('No onboarding template found for staff:', e.message);
                }
            }

            return this.findOne(savedStaff.id);

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    // ==================== STAFF RETRIEVAL ====================

    async findAll(filter?: StaffFilterDto): Promise<Staff[]> {
        const qb = this.staffRepo.createQueryBuilder('staff')
            .leftJoinAndSelect('staff.user', 'user')
            .leftJoinAndSelect('staff.position', 'position')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('staff.region', 'region')
            .leftJoinAndSelect('staff.department', 'department')
            .leftJoinAndSelect('staff.manager', 'manager');

        if (filter?.status) {
            if (Array.isArray(filter.status)) {
                qb.andWhere('staff.status IN (:...statuses)', { statuses: filter.status });
            } else {
                qb.andWhere('staff.status = :status', { status: filter.status });
            }
        }

        if (filter?.branchId) {
            qb.andWhere('staff.branch_id = :branchId', { branchId: filter.branchId });
        }

        if (filter?.regionId) {
            qb.andWhere('staff.region_id = :regionId', { regionId: filter.regionId });
        }

        if (filter?.departmentId) {
            qb.andWhere('staff.department_id = :departmentId', { departmentId: filter.departmentId });
        }

        if (filter?.positionId) {
            qb.andWhere('staff.position_id = :positionId', { positionId: filter.positionId });
        }

        if (filter?.managerId) {
            qb.andWhere('staff.manager_id = :managerId', { managerId: filter.managerId });
        }

        if (filter?.isProbationary) {
            qb.andWhere('staff.probation_status IN (:...probStatuses)', {
                probStatuses: [ProbationStatus.IN_PROGRESS, ProbationStatus.EXTENDED]
            });
        }

        if (filter?.search) {
            qb.andWhere(
                '(staff.first_name ILIKE :search OR staff.last_name ILIKE :search OR staff.employee_number ILIKE :search OR user.email ILIKE :search)',
                { search: `%${filter.search}%` }
            );
        }

        if (filter?.role) {
            const roles = filter.role.split(',');
            qb.innerJoin('user.roles', 'role')
                .andWhere('role.name IN (:...roles)', { roles });
        }


        return qb.orderBy('staff.first_name', 'ASC').getMany();
    }

    async findOne(id: string): Promise<Staff> {
        const staff = await this.staffRepo.findOne({
            where: { id },
            relations: ['user', 'user.roles', 'position', 'branch', 'region', 'department', 'manager', 'documents', 'documents.documentType', 'documents.document'],
        });
        if (!staff) throw new NotFoundException('Staff not found');
        return staff;
    }

    async findByUserId(userId: string): Promise<Staff | null> {
        return this.staffRepo.findOne({
            where: { user: { id: userId } },
            relations: ['user', 'position', 'branch', 'region', 'department'],
        });
    }

    async findByEmployeeNumber(employeeNumber: string): Promise<Staff | null> {
        return this.staffRepo.findOne({
            where: { employee_number: employeeNumber },
            relations: ['user', 'position', 'branch', 'region', 'department'],
        });
    }

    // ==================== STAFF UPDATE ====================

    async update(id: string, dto: UpdateStaffDto, updatedBy?: string): Promise<Staff> {
        const staff = await this.findOne(id);
        const oldPosition = staff.position;
        const oldBranch = staff.branch;

        // Update basic fields
        if (dto.first_name) staff.first_name = dto.first_name;
        if (dto.middle_name !== undefined) staff.middle_name = dto.middle_name;
        if (dto.last_name) staff.last_name = dto.last_name;
        if (dto.personal_email !== undefined) staff.personal_email = dto.personal_email;
        if (dto.phone !== undefined) staff.phone = dto.phone;
        if (dto.alternate_phone !== undefined) staff.alternate_phone = dto.alternate_phone;
        if (dto.address !== undefined) staff.address = dto.address;
        if (dto.city !== undefined) staff.city = dto.city;
        if (dto.postal_code !== undefined) staff.postal_code = dto.postal_code;
        if (dto.emergency_contact_name !== undefined) staff.emergency_contact_name = dto.emergency_contact_name;
        if (dto.emergency_contact_phone !== undefined) staff.emergency_contact_phone = dto.emergency_contact_phone;
        if (dto.emergency_contact_relationship !== undefined) staff.emergency_contact_relationship = dto.emergency_contact_relationship;
        if (dto.bank_name !== undefined) staff.bank_name = dto.bank_name;
        if (dto.bank_branch !== undefined) staff.bank_branch = dto.bank_branch;
        if (dto.bank_account_number !== undefined) staff.bank_account_number = dto.bank_account_number;
        if (dto.bank_account_name !== undefined) staff.bank_account_name = dto.bank_account_name;
        if (dto.basic_salary !== undefined) staff.basic_salary = dto.basic_salary;
        if (dto.national_id !== undefined) staff.national_id = dto.national_id;
        if (dto.tax_pin !== undefined) staff.tax_pin = dto.tax_pin;
        if (dto.nssf_number !== undefined) staff.nssf_number = dto.nssf_number;
        if (dto.nhif_number !== undefined) staff.nhif_number = dto.nhif_number;
        if (dto.status) staff.status = dto.status;

        staff.updated_by = updatedBy;

        // Update relations
        if (dto.position_id) {
            const pos = await this.positionRepo.findOneBy({ id: dto.position_id });
            if (pos) staff.position = pos;
        }
        if (dto.region_id) {
            staff.region = await this.regionRepo.findOneBy({ id: dto.region_id }) ?? undefined;
        }
        if (dto.branch_id) {
            staff.branch = await this.branchRepo.findOneBy({ id: dto.branch_id }) ?? undefined;
        }
        if (dto.department_id) {
            staff.department = await this.departmentRepo.findOneBy({ id: dto.department_id }) ?? undefined;
        }
        if (dto.manager_id) {
            staff.manager = await this.staffRepo.findOneBy({ id: dto.manager_id }) ?? undefined;
        }

        // Create employment history if position or branch changed
        if ((dto.position_id && oldPosition?.id !== dto.position_id) ||
            (dto.branch_id && oldBranch?.id !== dto.branch_id)) {

            // End previous history record
            const lastHistory = await this.employmentHistoryRepo.findOne({
                where: { staff: { id: staff.id }, end_date: null as any },
                order: { start_date: 'DESC' },
            });
            if (lastHistory) {
                lastHistory.end_date = new Date();
                await this.employmentHistoryRepo.save(lastHistory);
            }

            // Create new history record
            const newHistory = this.employmentHistoryRepo.create({
                staff,
                position: staff.position,
                branch: staff.branch,
                employment_type: 'full-time',
                start_date: new Date(),
            });
            await this.employmentHistoryRepo.save(newHistory);
        }

        return this.staffRepo.save(staff);
    }

    // ==================== PROBATION MANAGEMENT ====================

    async updateProbationStatus(
        id: string,
        status: ProbationStatus,
        notes?: string,
        extendedUntil?: Date,
    ): Promise<Staff> {
        const staff = await this.findOne(id);
        staff.probation_status = status;
        staff.probation_notes = notes;

        if (status === ProbationStatus.EXTENDED && extendedUntil) {
            staff.probation_extended_until = extendedUntil;
            staff.probation_end_date = extendedUntil;
        }

        if (status === ProbationStatus.PASSED) {
            staff.status = StaffStatus.ACTIVE;
            staff.confirmation_date = new Date();
        }

        if (status === ProbationStatus.FAILED) {
            staff.status = StaffStatus.TERMINATED;
            staff.termination_date = new Date();
            staff.termination_reason = 'Failed probation';
        }

        return this.staffRepo.save(staff);
    }

    async getUpcomingProbationReviews(daysAhead: number = 30): Promise<Staff[]> {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return this.staffRepo.find({
            where: {
                probation_status: In([ProbationStatus.IN_PROGRESS, ProbationStatus.EXTENDED]),
                probation_end_date: Between(today, futureDate),
            },
            relations: ['user', 'position', 'branch', 'manager'],
            order: { probation_end_date: 'ASC' },
        });
    }

    async getOverdueProbationReviews(): Promise<Staff[]> {
        return this.staffRepo.find({
            where: {
                probation_status: In([ProbationStatus.IN_PROGRESS, ProbationStatus.EXTENDED]),
                probation_end_date: LessThanOrEqual(new Date()),
            },
            relations: ['user', 'position', 'branch', 'manager'],
        });
    }

    // ==================== STAFF ACTIVATION/DEACTIVATION ====================

    async activateStaff(id: string): Promise<Staff> {
        const staff = await this.findOne(id);
        staff.status = staff.probation_status === ProbationStatus.PASSED ? StaffStatus.ACTIVE : StaffStatus.PROBATION;
        staff.user.is_active = true;
        await this.userRepo.save(staff.user);
        return this.staffRepo.save(staff);
    }

    async deactivateStaff(id: string, reason?: string): Promise<Staff> {
        const staff = await this.findOne(id);
        staff.status = StaffStatus.SUSPENDED;
        staff.user.is_active = false;
        await this.userRepo.save(staff.user);
        return this.staffRepo.save(staff);
    }

    async terminateStaff(id: string, reason: string, terminationDate?: Date): Promise<Staff> {
        const staff = await this.findOne(id);
        staff.status = StaffStatus.TERMINATED;
        staff.termination_date = terminationDate || new Date();
        staff.termination_reason = reason;
        staff.user.is_active = false;
        await this.userRepo.save(staff.user);

        // End employment history
        const lastHistory = await this.employmentHistoryRepo.findOne({
            where: { staff: { id: staff.id }, end_date: null as any },
        });
        if (lastHistory) {
            lastHistory.end_date = staff.termination_date;
            await this.employmentHistoryRepo.save(lastHistory);
        }

        return this.staffRepo.save(staff);
    }

    // ==================== TEAM/HIERARCHY ====================

    async getDirectReports(managerId: string): Promise<Staff[]> {
        return this.staffRepo.find({
            where: { manager: { id: managerId } },
            relations: ['position', 'branch'],
        });
    }

    async getTeamHierarchy(managerId: string): Promise<Staff[]> {
        // Recursive CTE to get all reports under a manager
        const result = await this.staffRepo.query(`
            WITH RECURSIVE team AS (
                SELECT id, first_name, last_name, manager_id, 0 as level
                FROM staff 
                WHERE manager_id = $1
                
                UNION ALL
                
                SELECT s.id, s.first_name, s.last_name, s.manager_id, t.level + 1
                FROM staff s
                INNER JOIN team t ON s.manager_id = t.id
                WHERE t.level < 10
            )
            SELECT * FROM team
        `, [managerId]);

        // Fetch full staff objects
        if (result.length === 0) return [];
        const ids = result.map((r: any) => r.id);
        return this.staffRepo.find({
            where: { id: In(ids) },
            relations: ['position', 'branch', 'manager'],
        });
    }

    // ==================== STATISTICS ====================

    async getStaffStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byProbationStatus: Record<string, number>;
        byBranch: { branchId: string; branchName: string; count: number }[];
        upcomingProbationReviews: number;
    }> {
        const total = await this.staffRepo.count();

        const statusCounts = await this.staffRepo
            .createQueryBuilder('staff')
            .select('staff.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('staff.status')
            .getRawMany();

        const probationCounts = await this.staffRepo
            .createQueryBuilder('staff')
            .select('staff.probation_status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('staff.probation_status')
            .getRawMany();

        const branchCounts = await this.staffRepo
            .createQueryBuilder('staff')
            .leftJoin('staff.branch', 'branch')
            .select('branch.id', 'branchId')
            .addSelect('branch.name', 'branchName')
            .addSelect('COUNT(*)', 'count')
            .where('branch.id IS NOT NULL')
            .groupBy('branch.id, branch.name')
            .getRawMany();

        const upcomingReviews = await this.getUpcomingProbationReviews(30);

        return {
            total,
            byStatus: statusCounts.reduce((acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }), {}),
            byProbationStatus: probationCounts.reduce((acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }), {}),
            byBranch: branchCounts.map((b: any) => ({
                branchId: b.branchId,
                branchName: b.branchName,
                count: parseInt(b.count),
            })),
            upcomingProbationReviews: upcomingReviews.length,
        };
    }

    // ==================== HELPERS ====================

    private async generateEmployeeNumber(): Promise<string> {
        const year = new Date().getFullYear().toString().slice(-2);
        const lastStaff = await this.staffRepo
            .createQueryBuilder('staff')
            .where('staff.employee_number LIKE :pattern', { pattern: `KEC${year}%` })
            .orderBy('staff.employee_number', 'DESC')
            .getOne();

        let nextNumber = 1;
        if (lastStaff?.employee_number) {
            const lastNumber = parseInt(lastStaff.employee_number.slice(-4));
            nextNumber = lastNumber + 1;
        }

        return `KEC${year}${nextNumber.toString().padStart(4, '0')}`;
    }

    private generateTempPassword(): string {
        return generateTempPasswordSecure(10);
    }
}
