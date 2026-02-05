import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsUUID } from 'class-validator';

export class CreateRegionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateRegionDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class CreateBranchDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsUUID()
    @IsNotEmpty()
    region_id: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsNumber()
    @IsOptional()
    target_disbursement?: number;

    @IsNumber()
    @IsOptional()
    target_collection?: number;

    @IsNumber()
    @IsOptional()
    target_clients?: number;
}

export class UpdateBranchDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsUUID()
    @IsOptional()
    region_id?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsNumber()
    @IsOptional()
    target_disbursement?: number;

    @IsNumber()
    @IsOptional()
    target_collection?: number;

    @IsNumber()
    @IsOptional()
    target_clients?: number;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class CreateDepartmentDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsUUID()
    @IsOptional()
    parent_id?: string;
}

export class UpdateDepartmentDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsUUID()
    @IsOptional()
    parent_id?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class CreatePositionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    level?: number;

    @IsUUID()
    @IsOptional()
    department_id?: string;

    @IsUUID()
    @IsOptional()
    reports_to_id?: string;
}

export class UpdatePositionDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    level?: number;

    @IsUUID()
    @IsOptional()
    department_id?: string;

    @IsUUID()
    @IsOptional()
    reports_to_id?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
