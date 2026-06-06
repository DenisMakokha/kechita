import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
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
import { StaffContract, ContractStatus } from './entities/staff-contract.entity';
import { StaffBankAccount, BankAccountType } from './entities/staff-bank-account.entity';
import { NextOfKin } from './entities/next-of-kin.entity';

import { OnboardingService } from './services/onboarding.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { CreateStaffDto, UpdateStaffDto, StaffFilterDto } from './dto/staff.dto';
import { generateTempPassword as generateTempPasswordSecure } from '../common/id-utils';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType, NotificationPriority } from '../notifications/entities/notification.entity';

// Re-export for convenience
export { CreateStaffDto, UpdateStaffDto, StaffFilterDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
    private readonly logger = new Logger(StaffService.name);

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
        @InjectRepository(StaffContract)
        private contractRepo: Repository<StaffContract>,
        private onboardingService: OnboardingService,
        private authService: AuthService,
        private auditService: AuditService,
        private notifications: NotificationService,
    ) { }

    /** Small helper to keep audit calls non-blocking and never break a write path. */
    private audit(data: Parameters<AuditService['log']>[0]) {
        return this.auditService.log(data).catch((e) => {
            console.warn('[StaffService] audit log failed:', e?.message);
        });
    }

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

            // 9. Send welcome email with password setup link (default: true)
            if (createStaffDto.send_welcome_email !== false) {
                this.authService.sendWelcomeToNewUser(
                    savedUser.id,
                    `${createStaffDto.first_name} ${createStaffDto.last_name}`,
                    role.name,
                ).catch(() => {/* logged inside */});
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

    async findAll(filter?: StaffFilterDto & { includeDeleted?: boolean; onlyDeleted?: boolean }): Promise<{ data: Staff[]; total: number; page: number; limit: number }> {
        const qb = this.staffRepo.createQueryBuilder('staff')
            .leftJoinAndSelect('staff.user', 'user')
            .leftJoinAndSelect('staff.position', 'position')
            .leftJoinAndSelect('staff.branch', 'branch')
            .leftJoinAndSelect('staff.region', 'region')
            .leftJoinAndSelect('staff.department', 'department')
            .leftJoinAndSelect('staff.manager', 'manager');

        if (filter?.onlyDeleted) {
            qb.withDeleted().andWhere('staff.deleted_at IS NOT NULL');
        } else if (filter?.includeDeleted) {
            qb.withDeleted();
        }

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

        // Advanced filters
        if (filter?.hireDateFrom) {
            qb.andWhere('staff.hire_date >= :hireDateFrom', { hireDateFrom: filter.hireDateFrom });
        }

        if (filter?.hireDateTo) {
            qb.andWhere('staff.hire_date <= :hireDateTo', { hireDateTo: filter.hireDateTo });
        }

        if (filter?.minSalary) {
            qb.andWhere('staff.basic_salary >= :minSalary', { minSalary: filter.minSalary });
        }

        if (filter?.maxSalary) {
            qb.andWhere('staff.basic_salary <= :maxSalary', { maxSalary: filter.maxSalary });
        }

        if (filter?.gender) {
            qb.andWhere('staff.gender = :gender', { gender: filter.gender });
        }

        if (filter?.dateOfBirthFrom) {
            qb.andWhere('staff.date_of_birth >= :dateOfBirthFrom', { dateOfBirthFrom: filter.dateOfBirthFrom });
        }

        if (filter?.dateOfBirthTo) {
            qb.andWhere('staff.date_of_birth <= :dateOfBirthTo', { dateOfBirthTo: filter.dateOfBirthTo });
        }

        if (filter?.city) {
            qb.andWhere('staff.city ILIKE :city', { city: `%${filter.city}%` });
        }

        // Get total count before pagination
        const total = await qb.getCount();

        // Sorting
        const sortBy = filter?.sortBy || 'first_name';
        const sortOrder = filter?.sortOrder || 'ASC';
        qb.orderBy(`staff.${sortBy}`, sortOrder as 'ASC' | 'DESC');

        // Pagination
        const page = filter?.page || 1;
        const limit = filter?.limit || 50;
        qb.skip((page - 1) * limit).take(limit);

        const data = await qb.getMany();

        return { data, total, page, limit };
    }

    async findOne(id: string): Promise<Staff> {
        const staff = await this.staffRepo.findOne({
            where: { id },
            relations: [
                'user', 'user.roles', 'position', 'branch', 'region', 'department', 'manager',
                'documents', 'documents.documentType', 'documents.document',
                'education', 'workExperience', 'skills', 'languages', 'assets', 'bankAccounts', 'nextOfKin'
            ],
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

    /**
     * Fallback resolver used by self-service endpoints (e.g. /staff/me/profile).
     * If a JWT carries a stale `sub` (e.g. after a database reseed) the user_id
     * lookup will miss; matching by email still recovers the right record so
     * the user isn't locked out until they re-login.
     */
    async findByUserEmail(email: string): Promise<Staff | null> {
        if (!email) return null;
        return this.staffRepo.findOne({
            where: { user: { email } },
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
        if (dto.gender !== undefined) staff.gender = dto.gender as any;
        if (dto.marital_status !== undefined) staff.marital_status = dto.marital_status;
        if (dto.religion !== undefined) staff.religion = dto.religion;
        if (dto.blood_group !== undefined) staff.blood_group = dto.blood_group;
        if (dto.nationality !== undefined) staff.nationality = dto.nationality;
        if (dto.place_of_birth !== undefined) staff.place_of_birth = dto.place_of_birth;
        if (dto.passport_number !== undefined) staff.passport_number = dto.passport_number;
        if (dto.passport_expiry !== undefined) staff.passport_expiry = dto.passport_expiry ? new Date(dto.passport_expiry) : null as any;
        if (dto.has_disability !== undefined) {
            staff.has_disability = dto.has_disability;
            if (!dto.has_disability) {
                staff.disability_details = null as any;
            } else if (dto.disability_details !== undefined) {
                staff.disability_details = dto.disability_details;
            }
        }
        if (dto.hire_date !== undefined) staff.hire_date = dto.hire_date ? new Date(dto.hire_date) : null as any;
        if (dto.confirmation_date !== undefined) staff.confirmation_date = dto.confirmation_date ? new Date(dto.confirmation_date) : null as any;
        if (dto.probation_end_date !== undefined) staff.probation_end_date = dto.probation_end_date ? new Date(dto.probation_end_date) : null as any;

        // Sync to staff_bank_accounts
        if (dto.bank_name !== undefined || dto.bank_branch !== undefined || dto.bank_account_number !== undefined || dto.bank_account_name !== undefined) {
            const bankAccountRepo = this.dataSource.getRepository(StaffBankAccount);
            let primaryBank = await bankAccountRepo.findOne({
                where: { staff_id: staff.id, is_primary: true },
            });
            const bankName = dto.bank_name !== undefined ? dto.bank_name : staff.bank_name;
            const bankBranch = dto.bank_branch !== undefined ? dto.bank_branch : staff.bank_branch;
            const accountNumber = dto.bank_account_number !== undefined ? dto.bank_account_number : staff.bank_account_number;
            const accountName = dto.bank_account_name !== undefined ? dto.bank_account_name : staff.bank_account_name;

            if (bankName || accountNumber || accountName) {
                if (!primaryBank) {
                    primaryBank = bankAccountRepo.create({
                        staff_id: staff.id,
                        is_primary: true,
                        is_active: true,
                        account_type: BankAccountType.SALARY,
                        bank_name: bankName || '',
                        bank_branch: bankBranch || undefined,
                        account_number: accountNumber || '',
                        account_name: accountName || '',
                    });
                } else {
                    if (dto.bank_name !== undefined) primaryBank.bank_name = dto.bank_name;
                    if (dto.bank_branch !== undefined) primaryBank.bank_branch = dto.bank_branch;
                    if (dto.bank_account_number !== undefined) primaryBank.account_number = dto.bank_account_number;
                    if (dto.bank_account_name !== undefined) primaryBank.account_name = dto.bank_account_name;
                }
                await bankAccountRepo.save(primaryBank);
            }
        }

        // Sync to staff_next_of_kin
        if (dto.emergency_contact_name !== undefined || dto.emergency_contact_phone !== undefined || dto.emergency_contact_relationship !== undefined) {
            const nokRepo = this.dataSource.getRepository(NextOfKin);
            let primaryNok = await nokRepo.findOne({
                where: { staff_id: staff.id, is_primary: true },
            });
            const contactName = dto.emergency_contact_name !== undefined ? dto.emergency_contact_name : staff.emergency_contact_name;
            const contactPhone = dto.emergency_contact_phone !== undefined ? dto.emergency_contact_phone : staff.emergency_contact_phone;
            const contactRel = dto.emergency_contact_relationship !== undefined ? dto.emergency_contact_relationship : staff.emergency_contact_relationship;

            if (contactName || contactPhone || contactRel) {
                if (!primaryNok) {
                    primaryNok = nokRepo.create({
                        staff_id: staff.id,
                        is_primary: true,
                        full_name: contactName || '',
                        phone: contactPhone || '',
                        relationship: contactRel || 'other',
                    });
                } else {
                    if (dto.emergency_contact_name !== undefined) primaryNok.full_name = dto.emergency_contact_name;
                    if (dto.emergency_contact_phone !== undefined) primaryNok.phone = dto.emergency_contact_phone;
                    if (dto.emergency_contact_relationship !== undefined) primaryNok.relationship = dto.emergency_contact_relationship;
                }
                await nokRepo.save(primaryNok);
            }
        }

        staff.updated_by = updatedBy;

        // Update relations (support null/empty clearing)
        if (dto.position_id !== undefined) {
            staff.position = dto.position_id ? (await this.positionRepo.findOneBy({ id: dto.position_id }) ?? staff.position) : staff.position;
        }
        if (dto.region_id !== undefined) {
            staff.region = dto.region_id ? (await this.regionRepo.findOneBy({ id: dto.region_id }) ?? undefined) : undefined;
        }
        if (dto.branch_id !== undefined) {
            staff.branch = dto.branch_id ? (await this.branchRepo.findOneBy({ id: dto.branch_id }) ?? undefined) : undefined;
        }
        if (dto.department_id !== undefined) {
            staff.department = dto.department_id ? (await this.departmentRepo.findOneBy({ id: dto.department_id }) ?? undefined) : undefined;
        }
        if (dto.manager_id !== undefined) {
            staff.manager = dto.manager_id ? (await this.staffRepo.findOneBy({ id: dto.manager_id }) ?? undefined) : undefined;
        }
        if (dto.user_id !== undefined) {
            if (dto.user_id === null) {
                (staff as any).user = null;
            } else {
                const userToLink = await this.userRepo.findOneBy({ id: dto.user_id });
                if (!userToLink) throw new BadRequestException('User not found');
                (staff as any).user = userToLink;
            }
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
        const staff = await this.staffRepo.findOne({
            where: { id },
            relations: ['user', 'manager', 'manager.user'],
        });
        if (!staff) throw new NotFoundException('Staff not found');

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

        const saved = await this.staffRepo.save(staff);

        // Send notifications
        const fullName = `${saved.first_name} ${saved.last_name}`;
        
        let title = '';
        let body = '';
        let type = NotificationType.REMINDER;
        
        if (status === ProbationStatus.PASSED) {
            title = 'Probation Passed / Confirmed';
            body = `Congratulations! Your employment has been confirmed as active starting from ${new Date().toLocaleDateString('en-GB')}.`;
            type = NotificationType.WELCOME_NEW_STAFF;
        } else if (status === ProbationStatus.EXTENDED && extendedUntil) {
            title = 'Probation Period Extended';
            body = `Your probation period has been extended until ${new Date(extendedUntil).toLocaleDateString('en-GB')}.`;
            type = NotificationType.REMINDER;
        } else if (status === ProbationStatus.FAILED) {
            title = 'Probation Review Unsuccessful';
            body = `Your probation review was unsuccessful and employment is terminated.`;
            type = NotificationType.REMINDER;
        }

        if (title && body) {
            // Notify employee (in-app)
            if (saved.user?.id) {
                try {
                    await this.notifications.create({
                        userId: saved.user.id,
                        type,
                        title,
                        body,
                        priority: NotificationPriority.HIGH,
                        referenceType: 'staff',
                        referenceId: saved.id,
                    });
                } catch (e: any) {
                    this.logger.warn(`Failed to notify employee of probation update: ${e.message}`);
                }
            }

            // Notify manager (in-app)
            if (saved.manager?.user?.id) {
                try {
                    await this.notifications.create({
                        userId: saved.manager.user.id,
                        type: NotificationType.REMINDER,
                        title: `Probation Status Update: ${fullName}`,
                        body: `${fullName}'s probation status was updated to ${status.toUpperCase()}${status === ProbationStatus.EXTENDED ? ` until ${new Date(extendedUntil!).toLocaleDateString('en-GB')}` : ''}.`,
                        priority: NotificationPriority.MEDIUM,
                        referenceType: 'staff',
                        referenceId: saved.id,
                    });
                } catch (e: any) {
                    this.logger.warn(`Failed to notify manager of probation update: ${e.message}`);
                }
            }

            // Notify HR (in-app)
            try {
                await this.notifications.notifyByRole('HR_MANAGER', {
                    type: NotificationType.REMINDER,
                    title: `Probation Status Update: ${fullName}`,
                    body: `${fullName}'s probation status was updated to ${status.toUpperCase()}${status === ProbationStatus.EXTENDED ? ` until ${new Date(extendedUntil!).toLocaleDateString('en-GB')}` : ''}.`,
                    priority: NotificationPriority.MEDIUM,
                    referenceType: 'staff',
                    referenceId: saved.id,
                });
            } catch (e: any) {
                this.logger.warn(`Failed to notify HR of probation update: ${e.message}`);
            }
        }

        return saved;
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

    async activateStaff(id: string, actorUserId?: string): Promise<Staff> {
        const staff = await this.findOne(id);
        staff.status = staff.probation_status === ProbationStatus.PASSED ? StaffStatus.ACTIVE : StaffStatus.PROBATION;
        if (staff.user) {
            staff.user.is_active = true;
            await this.userRepo.save(staff.user);
        }
        const saved = await this.staffRepo.save(staff);
        await this.audit({
            userId: actorUserId,
            staffId: id,
            action: AuditAction.ACTIVATE,
            entityType: 'Staff',
            entityId: id,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: 'Staff reactivated',
            isSuccessful: true,
        });
        return saved;
    }

    async deactivateStaff(id: string, reason?: string, actorUserId?: string): Promise<Staff> {
        const staff = await this.findOne(id);
        staff.status = StaffStatus.SUSPENDED;
        if (staff.user) {
            staff.user.is_active = false;
            await this.userRepo.save(staff.user);
        }
        const saved = await this.staffRepo.save(staff);
        await this.audit({
            userId: actorUserId,
            staffId: id,
            action: AuditAction.DEACTIVATE,
            entityType: 'Staff',
            entityId: id,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Staff suspended${reason ? `: ${reason}` : ''}`,
            metadata: reason ? { reason } : undefined,
            isSuccessful: true,
        });
        return saved;
    }

    async terminateStaff(id: string, reason: string, terminationDate?: Date, force: boolean = false, actorUserId?: string): Promise<Staff> {
        const staff = await this.findOne(id);

        // Enforce exit-clearance blockers unless force=true (CEO override)
        if (!force) {
            const blockers = await this.getTerminationBlockers(id);
            if (blockers.active_assets > 0 || blockers.pending_documents > 0) {
                throw new BadRequestException(
                    `Cannot terminate: ${blockers.active_assets} active asset(s) and ${blockers.pending_documents} unverified mandatory document(s). Use force=true to override.`,
                );
            }
        }

        staff.status = StaffStatus.TERMINATED;
        staff.termination_date = terminationDate || new Date();
        staff.termination_reason = reason;
        if (staff.user) {
            staff.user.is_active = false;
            await this.userRepo.save(staff.user);
        }

        // End employment history
        const lastHistory = await this.employmentHistoryRepo.findOne({
            where: { staff: { id: staff.id }, end_date: null as any },
        });
        if (lastHistory) {
            lastHistory.end_date = staff.termination_date;
            await this.employmentHistoryRepo.save(lastHistory);
        }

        // Terminate active contract
        await this.contractRepo.update(
            { staff: { id: staff.id }, status: ContractStatus.ACTIVE },
            {
                status: ContractStatus.TERMINATED,
                termination_date: staff.termination_date,
                termination_reason: reason,
            },
        );

        const saved = await this.staffRepo.save(staff);

        await this.audit({
            userId: actorUserId,
            staffId: id,
            action: AuditAction.DEACTIVATE,
            entityType: 'Staff',
            entityId: id,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Employment terminated${force ? ' [BLOCKERS OVERRIDDEN]' : ''}: ${reason}`,
            metadata: { reason, termination_date: staff.termination_date, force_override: force },
            isSuccessful: true,
        });

        return saved;
    }

    async reinstateStaff(id: string, reinstatementDate?: Date, actorUserId?: string): Promise<Staff> {
        const staff = await this.findOne(id);

        if (staff.status !== StaffStatus.TERMINATED) {
            throw new BadRequestException('Only terminated staff members can be reinstated.');
        }

        const effectiveDate = reinstatementDate || new Date();

        staff.status = StaffStatus.ACTIVE;
        staff.termination_date = null as any;
        staff.termination_reason = null as any;

        if (staff.user) {
            staff.user.is_active = true;
            await this.userRepo.save(staff.user);
        }

        // Create new employment history record for the reinstatement
        const newHistory = this.employmentHistoryRepo.create({
            staff: staff,
            position: staff.position,
            branch: staff.branch,
            region: staff.region,
            department: staff.department,
            employment_type: 'full-time',
            change_type: 'reinstatement',
            salary: staff.basic_salary,
            start_date: effectiveDate,
            change_reason: 'Staff reinstated into active employment.',
        });
        await this.employmentHistoryRepo.save(newHistory);

        const saved = await this.staffRepo.save(staff);

        await this.audit({
            userId: actorUserId,
            staffId: id,
            action: AuditAction.ACTIVATE,
            entityType: 'Staff',
            entityId: id,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Staff reinstated into active service`,
            metadata: { reinstatement_date: effectiveDate },
            isSuccessful: true,
        });

        return saved;
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
        deleted: number;
        byStatus: Record<string, number>;
        byProbationStatus: Record<string, number>;
        byBranch: { branchId: string; branchName: string; count: number }[];
        upcomingProbationReviews: number;
        overdueProbationReviews: number;
    }> {
        const total = await this.staffRepo.count();
        const deleted = await this.staffRepo.count({ withDeleted: true }).then(n => n - total);

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
        const overdueReviews = await this.getOverdueProbationReviews();

        return {
            total,
            deleted,
            byStatus: statusCounts.reduce((acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }), {}),
            byProbationStatus: probationCounts.reduce((acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }), {}),
            byBranch: branchCounts.map((b: any) => ({
                branchId: b.branchId,
                branchName: b.branchName,
                count: parseInt(b.count),
            })),
            upcomingProbationReviews: upcomingReviews.length,
            overdueProbationReviews: overdueReviews.length,
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

    // ==================== PROMOTION ====================

    async promoteStaff(
        staffId: string,
        data: {
            new_position_id: string;
            new_salary?: number;
            new_department_id?: string;
            new_branch_id?: string;
            effective_date?: Date;
            reason?: string;
        },
        promotedBy?: string,
    ): Promise<Staff> {
        const staff = await this.findOne(staffId);
        const effectiveDate = data.effective_date || new Date();
        const oldPosition = staff.position;
        const oldSalary = staff.basic_salary;

        const newPosition = await this.positionRepo.findOne({ where: { id: data.new_position_id } });
        if (!newPosition) throw new BadRequestException('Invalid position ID');

        // Close current employment history record
        const lastHistory = await this.employmentHistoryRepo.findOne({
            where: { staff: { id: staff.id }, end_date: null as any },
            order: { start_date: 'DESC' },
        });
        if (lastHistory) {
            lastHistory.end_date = effectiveDate;
            await this.employmentHistoryRepo.save(lastHistory);
        }

        // Update staff record
        staff.position = newPosition;
        if (data.new_salary !== undefined) staff.basic_salary = data.new_salary;
        if (data.new_department_id) {
            const dept = await this.departmentRepo.findOne({ where: { id: data.new_department_id } });
            if (dept) staff.department = dept;
        }
        if (data.new_branch_id) {
            const branch = await this.branchRepo.findOne({ where: { id: data.new_branch_id } });
            if (branch) staff.branch = branch;
        }
        staff.updated_by = promotedBy;

        const saved = await this.staffRepo.save(staff);

        // Create new employment history record for the promotion
        const newHistory = this.employmentHistoryRepo.create({
            staff: saved,
            position: newPosition,
            branch: staff.branch,
            region: staff.region,
            department: staff.department,
            employment_type: 'full-time',
            change_type: 'promotion',
            salary: data.new_salary || staff.basic_salary,
            start_date: effectiveDate,
            change_reason: data.reason || `Promoted from ${oldPosition?.name || 'N/A'} to ${newPosition.name}${oldSalary && data.new_salary ? `. Salary: ${oldSalary} → ${data.new_salary}` : ''}`,
        });
        await this.employmentHistoryRepo.save(newHistory);

        await this.audit({
            userId: promotedBy,
            staffId,
            action: AuditAction.UPDATE,
            entityType: 'Staff',
            entityId: staffId,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Promoted from ${oldPosition?.name || 'N/A'} to ${newPosition.name}`,
            oldValues: { position: oldPosition?.name, salary: oldSalary },
            newValues: { position: newPosition.name, salary: data.new_salary ?? oldSalary },
            metadata: { reason: data.reason, effective_date: effectiveDate },
            isSuccessful: true,
        });

        return this.findOne(staffId);
    }

    // ==================== HIRE CANDIDATE (Recruitment → Staff) ====================

    async hireCandidate(data: {
        candidate_first_name: string;
        candidate_last_name: string;
        candidate_email: string;
        candidate_phone?: string;
        position_id: string;
        role_id: string;
        branch_id?: string;
        region_id?: string;
        department_id?: string;
        manager_id?: string;
        basic_salary?: number;
        hire_date?: string;
        probation_months?: number;
    }, createdBy?: string): Promise<Staff> {
        // Delegate to the existing create method with candidate data pre-filled
        return this.create({
            first_name: data.candidate_first_name,
            last_name: data.candidate_last_name,
            email: data.candidate_email,
            phone: data.candidate_phone,
            position_id: data.position_id,
            role_id: data.role_id,
            branch_id: data.branch_id,
            region_id: data.region_id,
            department_id: data.department_id,
            manager_id: data.manager_id,
            basic_salary: data.basic_salary,
            hire_date: data.hire_date,
            probation_months: data.probation_months,
        } as any, createdBy);
    }

    // ==================== EMPLOYMENT HISTORY ====================

    async getEmploymentHistory(staffId: string): Promise<EmploymentHistory[]> {
        return this.employmentHistoryRepo.find({
            where: { staff: { id: staffId } },
            relations: ['position', 'region', 'branch', 'department'],
            order: { start_date: 'DESC' },
        });
    }

    async updateEmploymentHistory(
        id: string,
        data: {
            position_id?: string;
            region_id?: string;
            branch_id?: string;
            employment_type?: string;
            start_date?: Date;
            end_date?: Date;
            change_reason?: string;
        },
    ): Promise<EmploymentHistory> {
        const history = await this.employmentHistoryRepo.findOne({ where: { id }, relations: ['staff'] });
        if (!history) throw new NotFoundException('Employment history entry not found');
        if (data.position_id) {
            const pos = await this.positionRepo.findOne({ where: { id: data.position_id } });
            if (pos) history.position = pos;
        }
        if (data.region_id) {
            const reg = await this.regionRepo.findOne({ where: { id: data.region_id } });
            if (reg) history.region = reg;
        }
        if (data.branch_id) {
            const br = await this.branchRepo.findOne({ where: { id: data.branch_id } });
            if (br) history.branch = br;
        }
        if (data.employment_type !== undefined) history.employment_type = data.employment_type as any;
        if (data.start_date !== undefined) history.start_date = data.start_date;
        if (data.end_date !== undefined) history.end_date = data.end_date;
        if (data.change_reason !== undefined) history.change_reason = data.change_reason;
        return this.employmentHistoryRepo.save(history);
    }

    async deleteEmploymentHistory(id: string): Promise<void> {
        const r = await this.employmentHistoryRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Employment history entry not found');
    }

    async addEmploymentHistory(
        staffId: string,
        data: {
            position_id?: string;
            region_id?: string;
            branch_id?: string;
            employment_type?: string;
            start_date: Date;
            end_date?: Date;
            change_reason?: string;
        },
    ): Promise<EmploymentHistory> {
        const staff = await this.findOne(staffId);
        
        const history = this.employmentHistoryRepo.create({
            staff,
            start_date: data.start_date,
            end_date: data.end_date,
            employment_type: data.employment_type || 'full-time',
            change_reason: data.change_reason,
        });

        if (data.position_id) {
            const position = await this.positionRepo.findOne({ where: { id: data.position_id } });
            if (position) history.position = position;
        }
        if (data.region_id) {
            const region = await this.regionRepo.findOne({ where: { id: data.region_id } });
            if (region) history.region = region;
        }
        if (data.branch_id) {
            const branch = await this.branchRepo.findOne({ where: { id: data.branch_id } });
            if (branch) history.branch = branch;
        }

        return this.employmentHistoryRepo.save(history);
    }

    // ==================== TRANSFER ====================

    async transferStaff(
        staffId: string,
        data: {
            region_id?: string;
            branch_id?: string;
            position_id?: string;
            manager_id?: string;
            effective_date?: Date;
            reason?: string;
        },
        transferredBy?: string,
    ): Promise<Staff> {
        const staff = await this.findOne(staffId);
        const effectiveDate = data.effective_date || new Date();

        // Record current position in history before transfer
        await this.addEmploymentHistory(staffId, {
            position_id: staff.position?.id,
            region_id: staff.region?.id,
            branch_id: staff.branch?.id,
            start_date: staff.hire_date || staff.created_at,
            end_date: effectiveDate,
            change_reason: data.reason || 'Transfer',
        });

        // Update staff with new assignment
        if (data.region_id) {
            const region = await this.regionRepo.findOne({ where: { id: data.region_id } });
            if (region) staff.region = region;
        }
        if (data.branch_id) {
            const branch = await this.branchRepo.findOne({ where: { id: data.branch_id } });
            if (branch) staff.branch = branch;
        }
        if (data.position_id) {
            const position = await this.positionRepo.findOne({ where: { id: data.position_id } });
            if (position) staff.position = position;
        }
        if (data.manager_id) {
            const manager = await this.staffRepo.findOne({ where: { id: data.manager_id } });
            if (manager) staff.manager = manager;
        }

        staff.updated_by = transferredBy;
        const saved = await this.staffRepo.save(staff);
        await this.audit({
            userId: transferredBy,
            staffId,
            action: AuditAction.UPDATE,
            entityType: 'Staff',
            entityId: staffId,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Staff transferred${data.reason ? `: ${data.reason}` : ''}`,
            newValues: {
                region_id: data.region_id,
                branch_id: data.branch_id,
                position_id: data.position_id,
                manager_id: data.manager_id,
            },
            metadata: { effective_date: effectiveDate, reason: data.reason },
            isSuccessful: true,
        });
        return saved;
    }

    // ==================== PHOTO UPLOAD ====================

    async updatePhoto(staffId: string, photoUrl: string): Promise<Staff> {
        const staff = await this.findOne(staffId);
        staff.photo_url = photoUrl;
        return this.staffRepo.save(staff);
    }

    // ==================== SELF-SERVICE PROFILE UPDATE ====================

    async updateMyProfile(
        staffId: string,
        data: {
            phone?: string;
            alternate_phone?: string;
            personal_email?: string;
            address?: string;
            city?: string;
            postal_code?: string;
            emergency_contact_name?: string;
            emergency_contact_phone?: string;
            emergency_contact_relationship?: string;
            bank_name?: string;
            bank_branch?: string;
            bank_account_number?: string;
            bank_account_name?: string;
        },
    ): Promise<Staff> {
        const staff = await this.findOne(staffId);
        
        // Only allow updating personal/contact fields
        if (data.phone !== undefined) staff.phone = data.phone;
        if (data.alternate_phone !== undefined) staff.alternate_phone = data.alternate_phone;
        if (data.personal_email !== undefined) staff.personal_email = data.personal_email;
        if (data.address !== undefined) staff.address = data.address;
        if (data.city !== undefined) staff.city = data.city;
        if (data.postal_code !== undefined) staff.postal_code = data.postal_code;
        if (data.emergency_contact_name !== undefined) staff.emergency_contact_name = data.emergency_contact_name;
        if (data.emergency_contact_phone !== undefined) staff.emergency_contact_phone = data.emergency_contact_phone;
        if (data.emergency_contact_relationship !== undefined) staff.emergency_contact_relationship = data.emergency_contact_relationship;
        if (data.bank_name !== undefined) staff.bank_name = data.bank_name;
        if (data.bank_branch !== undefined) staff.bank_branch = data.bank_branch;
        if (data.bank_account_number !== undefined) staff.bank_account_number = data.bank_account_number;
        if (data.bank_account_name !== undefined) staff.bank_account_name = data.bank_account_name;

        return this.staffRepo.save(staff);
    }

    // ==================== RESIGNATION ====================

    async submitResignation(
        staffId: string,
        data: {
            reason: string;
            last_working_date: Date;
            notice_period_days?: number;
        },
        actorUserId?: string,
    ): Promise<Staff> {
        const staff = await this.findOne(staffId);

        staff.status = StaffStatus.RESIGNED;
        staff.termination_reason = data.reason;
        staff.termination_date = data.last_working_date;

        // Deactivate user account (will be re-checked once last working date passes)
        if (staff.user) {
            staff.user.is_active = false;
            await this.userRepo.save(staff.user);
        }

        // Close active employment history
        const lastHistory = await this.employmentHistoryRepo.findOne({
            where: { staff: { id: staff.id }, end_date: null as any },
        });
        if (lastHistory) {
            lastHistory.end_date = data.last_working_date;
            lastHistory.change_reason = `Resignation: ${data.reason}`;
            await this.employmentHistoryRepo.save(lastHistory);
        }

        // Mark active contract as terminated effective last working date
        await this.contractRepo.update(
            { staff: { id: staff.id }, status: ContractStatus.ACTIVE },
            {
                status: ContractStatus.TERMINATED,
                termination_date: data.last_working_date,
                termination_reason: `Resignation: ${data.reason}`,
            },
        );

        const saved = await this.staffRepo.save(staff);
        await this.audit({
            userId: actorUserId,
            staffId,
            action: AuditAction.DEACTIVATE,
            entityType: 'Staff',
            entityId: staffId,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Resignation submitted: ${data.reason}`,
            metadata: {
                reason: data.reason,
                last_working_date: data.last_working_date,
                notice_period_days: data.notice_period_days,
            },
            isSuccessful: true,
        });
        return saved;
    }

    // ==================== BULK OPERATIONS ====================

    async bulkUpdate(
        staffIds: string[],
        updates: {
            branch_id?: string;
            region_id?: string;
            department_id?: string;
            manager_id?: string;
            status?: StaffStatus;
        },
        updatedBy?: string,
    ): Promise<{ updated: number; failed: { id: string; error: string }[] }> {
        if (!staffIds?.length) throw new BadRequestException('No staff IDs provided');
        let updated = 0;
        const failed: { id: string; error: string }[] = [];
        for (const id of staffIds) {
            try {
                await this.update(id, updates as any, updatedBy);
                updated++;
            } catch (e: any) {
                failed.push({ id, error: e?.message || 'Unknown error' });
            }
        }
        return { updated, failed };
    }

    async bulkActivate(staffIds: string[]): Promise<{ updated: number; failed: { id: string; error: string }[] }> {
        if (!staffIds?.length) throw new BadRequestException('No staff IDs provided');
        let updated = 0;
        const failed: { id: string; error: string }[] = [];
        for (const id of staffIds) {
            try { await this.activateStaff(id); updated++; }
            catch (e: any) { failed.push({ id, error: e?.message || 'Unknown error' }); }
        }
        return { updated, failed };
    }

    async bulkDeactivate(staffIds: string[], reason?: string): Promise<{ updated: number; failed: { id: string; error: string }[] }> {
        if (!staffIds?.length) throw new BadRequestException('No staff IDs provided');
        let updated = 0;
        const failed: { id: string; error: string }[] = [];
        for (const id of staffIds) {
            try { await this.deactivateStaff(id, reason); updated++; }
            catch (e: any) { failed.push({ id, error: e?.message || 'Unknown error' }); }
        }
        return { updated, failed };
    }

    // ==================== CSV EXPORT ====================

    async exportCsv(filter?: StaffFilterDto): Promise<string> {
        // Reuse findAll without pagination
        const allFilter = { ...(filter || {}), page: 1, limit: 100000 };
        const { data } = await this.findAll(allFilter as any);

        const headers = [
            'Employee Number', 'First Name', 'Middle Name', 'Last Name', 'Email',
            'Phone', 'Gender', 'Date of Birth', 'National ID', 'Tax PIN',
            'Position', 'Department', 'Branch', 'Region', 'Manager',
            'Status', 'Probation Status', 'Hire Date', 'Confirmation Date',
            'Basic Salary', 'Currency', 'Bank Name', 'Bank Account',
        ];

        const escape = (v: any): string => {
            if (v === null || v === undefined) return '';
            const s = String(v);
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };

        const rows = data.map(s => [
            s.employee_number, s.first_name, s.middle_name, s.last_name, s.user?.email,
            s.phone, s.gender, s.date_of_birth, s.national_id, s.tax_pin,
            s.position?.name, s.department?.name, s.branch?.name, s.region?.name,
            s.manager ? `${s.manager.first_name} ${s.manager.last_name}` : '',
            s.status, s.probation_status, s.hire_date, s.confirmation_date,
            s.basic_salary, s.salary_currency, s.bank_name, s.bank_account_number,
        ].map(escape).join(','));

        return [headers.join(','), ...rows].join('\n');
    }

    // ==================== TERMINATION WITH CLEARANCE GUARDS ====================

    /**
     * Check exit-clearance blockers before allowing termination.
     * Returns list of blockers; empty list = cleared.
     */
    async getTerminationBlockers(staffId: string): Promise<{ active_assets: number; pending_documents: number }> {
        // Active assigned assets (raw query to avoid circular dep)
        const assetCount = await this.dataSource.query(
            `SELECT COUNT(*)::int AS c FROM asset_assignments WHERE staff_id = $1 AND status = 'assigned'`,
            [staffId],
        ).catch(() => [{ c: 0 }]);

        // Pending documents (unverified mandatory)
        const docCount = await this.dataSource.query(
            `SELECT COUNT(*)::int AS c FROM staff_documents sd
             JOIN document_types dt ON dt.id = sd.document_type_id
             WHERE sd.staff_id = $1 AND dt.is_mandatory = true AND sd.status NOT IN ('verified')`,
            [staffId],
        ).catch(() => [{ c: 0 }]);

        return {
            active_assets: assetCount[0]?.c || 0,
            pending_documents: docCount[0]?.c || 0,
        };
    }

    // ==================== SOFT DELETE ====================

    async softDelete(id: string, deletedBy?: string): Promise<void> {
        const staff = await this.findOne(id);
        // safeguard: only non-active lifecycle states can be archived
        const allowed = [StaffStatus.TERMINATED, StaffStatus.RESIGNED, StaffStatus.EX_STAFF, StaffStatus.SUSPENDED];
        if (!allowed.includes(staff.status)) {
            throw new BadRequestException(
                `Cannot archive a staff member in status "${staff.status}". Suspend, terminate, or record resignation first.`,
            );
        }
        staff.updated_by = deletedBy;
        await this.staffRepo.save(staff);
        await this.staffRepo.softDelete(id);
        await this.audit({
            userId: deletedBy,
            staffId: id,
            action: AuditAction.DELETE,
            entityType: 'Staff',
            entityId: id,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Staff archived (soft-deleted) from status "${staff.status}"`,
            metadata: { previous_status: staff.status, archive_type: 'soft_delete' },
            isSuccessful: true,
        });
    }

    async restore(id: string, actorUserId?: string): Promise<void> {
        const staff = await this.staffRepo.findOne({ where: { id }, withDeleted: true });
        await this.staffRepo.restore(id);
        if (staff) {
            await this.audit({
                userId: actorUserId,
                staffId: id,
                action: AuditAction.UPDATE,
                entityType: 'Staff',
                entityId: id,
                entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
                description: 'Staff restored from archive',
                metadata: { archive_type: 'restore' },
                isSuccessful: true,
            });
        }
    }

    /**
     * Check what historical records reference a staff member (to determine whether
     * permanent deletion is safe). Returns counts per related domain.
     */
    async getPermanentDeleteBlockers(staffId: string): Promise<{
        payroll_runs: number;
        leave_requests: number;
        loans: number;
        claims: number;
        petty_cash: number;
        attendance: number;
        documents: number;
        contracts: number;
        salary_history: number;
        employment_history: number;
        subordinates: number;
    }> {
        const q = async (sql: string): Promise<number> => {
            try {
                const r = await this.dataSource.query(sql, [staffId]);
                return r[0]?.c ?? 0;
            } catch {
                return 0; // table may not exist
            }
        };
        const [
            payroll_runs, leave_requests, loans, claims, petty_cash,
            attendance, documents, contracts, salary_history,
            employment_history, subordinates,
        ] = await Promise.all([
            q(`SELECT COUNT(*)::int AS c FROM payroll_payslips WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM leave_requests WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM loan_applications WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM claims WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM petty_cash_floats WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM attendance_records WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM staff_documents WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM staff_contracts WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM salary_history WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM employment_history WHERE staff_id = $1`),
            q(`SELECT COUNT(*)::int AS c FROM staff WHERE manager_id = $1`),
        ]);
        return {
            payroll_runs, leave_requests, loans, claims, petty_cash,
            attendance, documents, contracts, salary_history,
            employment_history, subordinates,
        };
    }

    /**
     * Hard-delete a staff record. ONLY allowed for already soft-deleted (archived) staff,
     * and only when there is no historical data that would be referentially orphaned
     * (payroll, leave, loans, claims, petty cash, attendance). Caller must pass
     * `confirmEmployeeNumber` matching the record's employee_number to prevent accidents.
     */
    async permanentDelete(
        id: string,
        opts: { confirmEmployeeNumber: string; deletedBy?: string; force?: boolean },
    ): Promise<{ deleted: true }> {
        // include soft-deleted
        const staff = await this.staffRepo.findOne({ where: { id }, withDeleted: true });
        if (!staff) throw new NotFoundException('Staff not found');
        if (!staff.deleted_at) {
            throw new BadRequestException('Staff must be archived (soft-deleted) before permanent deletion');
        }
        if (!opts.force && (!opts.confirmEmployeeNumber || opts.confirmEmployeeNumber.trim() !== (staff.employee_number || '').trim())) {
            throw new BadRequestException('Employee number confirmation does not match');
        }
        const blockers = await this.getPermanentDeleteBlockers(id);
        const total = Object.values(blockers).reduce((a, b) => a + b, 0);
        if (total > 0 && !opts.force) {
            const summary = Object.entries(blockers)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                .join(', ');
            throw new BadRequestException(
                `Cannot permanently delete: historical records still reference this staff (${summary}). Use force=true to cascade-delete all linked records.`,
            );
        }
        if (opts.force) {
            // Always cascade-nullify/delete ALL FK references regardless of blocker count
            // Table/column names verified from information_schema
            const del = (sql: string) => this.dataSource.query(sql, [id]).catch((err: any) => {
                console.error(`[permanentDelete] FAILED: ${sql} | staff=${id} | error: ${err?.message}`);
            });
            // Onboarding
            await del(`UPDATE onboarding_task_statuses SET completed_by_id = NULL WHERE completed_by_id = $1`);
            await del(`UPDATE onboarding_instances SET assigned_mentor_id = NULL WHERE assigned_mentor_id = $1`);
            await del(`DELETE FROM onboarding_task_statuses WHERE instance_id IN (SELECT id FROM onboarding_instances WHERE staff_id = $1)`);
            await del(`DELETE FROM onboarding_instances WHERE staff_id = $1`);
            // Staff records
            await del(`DELETE FROM staff_documents WHERE staff_id = $1`);
            await del(`DELETE FROM staff_contracts WHERE staff_id = $1`);
            await del(`DELETE FROM staff_salary_history WHERE staff_id = $1`);
            await del(`DELETE FROM employment_history WHERE staff_id = $1`);
            await del(`UPDATE staff_probation_reviews SET reviewer_id = NULL WHERE reviewer_id = $1`);
            await del(`DELETE FROM staff_probation_reviews WHERE staff_id = $1`);
            await del(`DELETE FROM staff_next_of_kin WHERE staff_id = $1`);
            await del(`DELETE FROM staff_dependents WHERE staff_id = $1`);
            // Assets
            await del(`DELETE FROM asset_assignments WHERE staff_id = $1`);
            // Approvals
            await del(`UPDATE approval_actions SET delegated_to_id = NULL WHERE delegated_to_id = $1`);
            await del(`DELETE FROM approval_actions WHERE approver_staff_id = $1`);
            await del(`UPDATE approval_instances SET resolved_by_id = NULL WHERE resolved_by_id = $1`);
            await del(`UPDATE approval_instances SET current_approver_id = NULL WHERE current_approver_id = $1`);
            await del(`DELETE FROM approval_instances WHERE requester_id = $1`);
            // Leave
            await del(`UPDATE leave_requests SET reliever_id = NULL WHERE reliever_id = $1`);
            await del(`UPDATE leave_requests SET cancelled_by_id = NULL WHERE cancelled_by_id = $1`);
            await del(`UPDATE leave_requests SET final_approver_id = NULL WHERE final_approver_id = $1`);
            await del(`DELETE FROM leave_balances WHERE staff_id = $1`);
            await del(`DELETE FROM leave_requests WHERE staff_id = $1`);
            // Attendance
            await del(`DELETE FROM roster_assignments WHERE staff_id = $1`);
            await del(`DELETE FROM time_entries WHERE staff_id = $1`);
            // Loans — nullify refs first, then delete owned loans
            await del(`UPDATE staff_loans SET guarantor_id = NULL WHERE guarantor_id = $1`);
            await del(`UPDATE staff_loans SET approved_by_id = NULL WHERE approved_by_id = $1`);
            await del(`UPDATE staff_loans SET rejected_by_id = NULL WHERE rejected_by_id = $1`);
            await del(`UPDATE staff_loans SET disbursed_by_id = NULL WHERE disbursed_by_id = $1`);
            await del(`UPDATE staff_loans SET created_by_id = NULL WHERE created_by_id = $1`);
            await del(`DELETE FROM staff_loans WHERE staff_id = $1`);
            // Claims — nullify refs first, then delete
            await del(`UPDATE claims SET submitted_by_id = NULL WHERE submitted_by_id = $1`);
            await del(`UPDATE claims SET approved_by_id = NULL WHERE approved_by_id = $1`);
            await del(`UPDATE claims SET rejected_by_id = NULL WHERE rejected_by_id = $1`);
            await del(`DELETE FROM claims WHERE staff_id = $1`);
            // Payroll
            await del(`DELETE FROM payslips WHERE staff_id = $1`);
            await del(`DELETE FROM staff_recurring_deductions WHERE staff_id = $1`);
            await del(`DELETE FROM staff_allowances WHERE staff_id = $1`);
            // Petty cash — nullify refs
            await del(`UPDATE petty_cash_floats SET custodian_id = NULL WHERE custodian_id = $1`);
            await del(`UPDATE petty_cash_replenishments SET requested_by_id = NULL WHERE requested_by_id = $1`);
            await del(`UPDATE petty_cash_replenishments SET approved_by_id = NULL WHERE approved_by_id = $1`);
            await del(`UPDATE petty_cash_replenishments SET disbursed_by_id = NULL WHERE disbursed_by_id = $1`);
            await del(`UPDATE petty_cash_transactions SET created_by_id = NULL WHERE created_by_id = $1`);
            await del(`UPDATE petty_cash_transactions SET approved_by_id = NULL WHERE approved_by_id = $1`);
            await del(`UPDATE petty_cash_reconciliations SET verified_by_id = NULL WHERE verified_by_id = $1`);
            await del(`UPDATE petty_cash_reconciliations SET counted_by_id = NULL WHERE counted_by_id = $1`);
            // Performance
            await del(`UPDATE reviews SET reviewer_id = NULL WHERE reviewer_id = $1`);
            await del(`DELETE FROM reviews WHERE reviewee_id = $1`);
            await del(`DELETE FROM goals WHERE staff_id = $1`);
            // Disciplinary
            await del(`UPDATE disciplinary_cases SET raised_by_staff_id = NULL WHERE raised_by_staff_id = $1`);
            await del(`DELETE FROM disciplinary_cases WHERE staff_id = $1`);
            // Training
            await del(`DELETE FROM training_enrollments WHERE staff_id = $1`);
            // Benefits
            await del(`DELETE FROM benefit_enrollments WHERE staff_id = $1`);
            // Announcements
            await del(`DELETE FROM announcement_reads WHERE staff_id = $1`);
            await del(`UPDATE announcements SET published_by_id = NULL WHERE published_by_id = $1`);
            await del(`UPDATE announcements SET created_by_id = NULL WHERE created_by_id = $1`);
            // Recruitment — nullify refs, don't delete records
            await del(`UPDATE applications SET screened_by_id = NULL WHERE screened_by_id = $1`);
            await del(`UPDATE applications SET assigned_to_id = NULL WHERE assigned_to_id = $1`);
            await del(`UPDATE interviews SET lead_interviewer_id = NULL WHERE lead_interviewer_id = $1`);
            await del(`UPDATE interviews SET created_by_staff_id = NULL WHERE created_by_staff_id = $1`);
            await del(`DELETE FROM interview_interviewers WHERE staff_id = $1`);
            await del(`UPDATE offers SET created_by_staff_id = NULL WHERE created_by_staff_id = $1`);
            await del(`UPDATE offers SET approved_by_staff_id = NULL WHERE approved_by_staff_id = $1`);
            await del(`UPDATE candidate_notes SET created_by_staff_id = NULL WHERE created_by_staff_id = $1`);
            await del(`UPDATE background_checks SET reviewed_by_id = NULL WHERE reviewed_by_id = $1`);
            await del(`UPDATE background_checks SET initiated_by_id = NULL WHERE initiated_by_id = $1`);
            await del(`UPDATE reference_checks SET contacted_by_id = NULL WHERE contacted_by_id = $1`);
            await del(`UPDATE job_posts SET created_by_staff_id = NULL WHERE created_by_staff_id = $1`);
            await del(`UPDATE job_posts SET hiring_manager_id = NULL WHERE hiring_manager_id = $1`);
            // Branch reports
            await del(`UPDATE branch_daily_reports SET submitted_by_staff_id = NULL WHERE submitted_by_staff_id = $1`);
            // Unlink subordinates
            await this.dataSource.query(`UPDATE staff SET manager_id = NULL WHERE manager_id = $1`, [id]);
        }
        // Detach the linked user account (deactivate but keep for audit trail)
        const userId = (staff as any).user_id || staff.user?.id;
        if (userId) {
            await this.userRepo.update({ id: userId }, { is_active: false }).catch(() => undefined);
        }
        // Audit BEFORE deleting so the record snapshot is preserved
        await this.audit({
            userId: opts.deletedBy,
            staffId: id,
            action: AuditAction.DELETE,
            entityType: 'Staff',
            entityId: id,
            entityName: `${staff.first_name} ${staff.last_name} (${staff.employee_number})`,
            description: `Staff PERMANENTLY DELETED (irreversible${opts.force ? ', forced cascade' : ''}). Confirmation: ${opts.confirmEmployeeNumber}`,
            metadata: {
                archive_type: opts.force ? 'hard_delete_forced' : 'hard_delete',
                previous_status: staff.status,
                employee_number: staff.employee_number,
                hire_date: staff.hire_date,
                position: (staff as any).position_id,
                branch: (staff as any).branch_id,
            },
            isSuccessful: true,
        });
        try {
            await this.staffRepo.delete(id);
        } catch (err: any) {
            console.error(`[permanentDelete] Final DELETE staff id=${id} FAILED: ${err?.message}`);
            throw err;
        }
        return { deleted: true };
    }

    async resendWelcomeEmail(staffId: string): Promise<{ success: boolean; error?: string }> {
        const staff = await this.findOne(staffId);
        if (!staff.user?.id) throw new BadRequestException('Staff has no linked user account');
        const roleName = staff.user.roles?.[0]?.name;
        return this.authService.sendWelcomeToNewUser(
            staff.user.id,
            `${staff.first_name} ${staff.last_name}`,
            roleName,
        );
    }
}
