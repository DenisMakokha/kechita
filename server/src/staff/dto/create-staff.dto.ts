import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStaffDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    first_name: string;

    @IsNotEmpty()
    last_name: string;

    @IsString()
    @IsOptional()
    personal_email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsUUID()
    role_id: string;

    @IsUUID()
    position_id: string;

    @IsUUID()
    @IsOptional()
    region_id?: string;

    @IsUUID()
    @IsOptional()
    branch_id?: string;

    @IsUUID()
    @IsOptional()
    department_id?: string;

    // Initial contract details
    @IsOptional()
    hire_date?: Date;
}
