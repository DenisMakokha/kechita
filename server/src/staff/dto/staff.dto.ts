import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { StaffStatus, Gender } from '../entities/staff.entity';

export class CreateStaffDto {
    @IsEmail()
    email: string;

    @IsString()
    first_name: string;

    @IsOptional()
    @IsString()
    middle_name?: string;

    @IsString()
    last_name: string;

    @IsOptional()
    @IsEmail()
    personal_email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsUUID()
    role_id: string;

    @IsUUID()
    position_id: string;

    @IsOptional()
    @IsUUID()
    region_id?: string;

    @IsOptional()
    @IsUUID()
    branch_id?: string;

    @IsOptional()
    @IsUUID()
    department_id?: string;

    @IsOptional()
    @IsUUID()
    manager_id?: string;

    @IsOptional()
    @IsDateString()
    hire_date?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsDateString()
    date_of_birth?: string;

    @IsOptional()
    @IsString()
    national_id?: string;

    @IsOptional()
    @IsString()
    tax_pin?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    emergency_contact_name?: string;

    @IsOptional()
    @IsString()
    emergency_contact_phone?: string;

    @IsOptional()
    @IsString()
    emergency_contact_relationship?: string;

    @IsOptional()
    @IsString()
    bank_name?: string;

    @IsOptional()
    @IsString()
    bank_account_number?: string;

    @IsOptional()
    @IsNumber()
    basic_salary?: number;

    @IsOptional()
    @IsNumber()
    probation_months?: number;

    @IsOptional()
    @IsBoolean()
    create_onboarding?: boolean;

    @IsOptional()
    @IsBoolean()
    send_welcome_email?: boolean;
}

export class UpdateStaffDto {
    @IsOptional()
    @IsString()
    first_name?: string;

    @IsOptional()
    @IsString()
    middle_name?: string;

    @IsOptional()
    @IsString()
    last_name?: string;

    @IsOptional()
    @IsEmail()
    personal_email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    alternate_phone?: string;

    @IsOptional()
    @IsUUID()
    position_id?: string;

    @IsOptional()
    @IsUUID()
    region_id?: string;

    @IsOptional()
    @IsUUID()
    branch_id?: string;

    @IsOptional()
    @IsUUID()
    department_id?: string;

    @IsOptional()
    @IsUUID()
    manager_id?: string;

    @IsOptional()
    @IsEnum(StaffStatus)
    status?: StaffStatus;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    postal_code?: string;

    @IsOptional()
    @IsString()
    emergency_contact_name?: string;

    @IsOptional()
    @IsString()
    emergency_contact_phone?: string;

    @IsOptional()
    @IsString()
    emergency_contact_relationship?: string;

    @IsOptional()
    @IsString()
    bank_name?: string;

    @IsOptional()
    @IsString()
    bank_branch?: string;

    @IsOptional()
    @IsString()
    bank_account_number?: string;

    @IsOptional()
    @IsString()
    bank_account_name?: string;

    @IsOptional()
    @IsNumber()
    basic_salary?: number;

    @IsOptional()
    @IsString()
    national_id?: string;

    @IsOptional()
    @IsString()
    tax_pin?: string;

    @IsOptional()
    @IsString()
    nssf_number?: string;

    @IsOptional()
    @IsString()
    nhif_number?: string;

    @IsOptional()
    @IsDateString()
    date_of_birth?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    marital_status?: string;

    @IsOptional()
    @IsString()
    nationality?: string;

    @IsOptional()
    @IsDateString()
    hire_date?: string;

    @IsOptional()
    @IsDateString()
    probation_start_date?: string;

    @IsOptional()
    @IsDateString()
    probation_end_date?: string;

    @IsOptional()
    @IsNumber()
    probation_months?: number;

    @IsOptional()
    @IsString()
    employment_type?: string;

    @IsOptional()
    user_id?: string | null;
}

export class StaffFilterDto {
    @IsOptional()
    status?: StaffStatus | StaffStatus[];

    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsUUID()
    regionId?: string;

    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @IsOptional()
    @IsUUID()
    positionId?: string;

    @IsOptional()
    @IsUUID()
    managerId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsBoolean()
    isProbationary?: boolean;

    @IsOptional()
    @IsString()
    role?: string;

    // Advanced search filters
    @IsOptional()
    @IsDateString()
    hireDateFrom?: string;

    @IsOptional()
    @IsDateString()
    hireDateTo?: string;

    @IsOptional()
    @IsNumber()
    minSalary?: number;

    @IsOptional()
    @IsNumber()
    maxSalary?: number;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirthFrom?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirthTo?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    sortBy?: 'first_name' | 'last_name' | 'hire_date' | 'created_at' | 'basic_salary';

    @IsOptional()
    @IsString()
    sortOrder?: 'ASC' | 'DESC';

    @IsOptional()
    @IsNumber()
    page?: number;

    @IsOptional()
    @IsNumber()
    limit?: number;
}
