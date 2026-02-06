import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsIn, Min, Max } from 'class-validator';

export class CreateLeaveTypeDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    max_days_per_year?: number;

    @IsOptional()
    @IsBoolean()
    is_emergency?: boolean;

    @IsOptional()
    @IsBoolean()
    allow_negative?: boolean;

    @IsOptional()
    @IsBoolean()
    is_accrued?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    monthly_accrual_rate?: number;

    @IsOptional()
    @IsBoolean()
    allow_carry_forward?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    max_carry_forward_days?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    carry_forward_expiry_months?: number;

    @IsOptional()
    @IsIn(['male', 'female'])
    applicable_gender?: string;

    @IsOptional()
    @IsBoolean()
    requires_confirmation?: boolean;

    @IsOptional()
    @IsBoolean()
    requires_attachment?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    min_days_before_request?: number;

    @IsOptional()
    @IsNumber()
    sort_order?: number;

    @IsOptional()
    @IsString()
    color?: string;
}

export class UpdateLeaveTypeDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    max_days_per_year?: number;

    @IsOptional()
    @IsBoolean()
    is_emergency?: boolean;

    @IsOptional()
    @IsBoolean()
    allow_negative?: boolean;

    @IsOptional()
    @IsBoolean()
    is_accrued?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    monthly_accrual_rate?: number;

    @IsOptional()
    @IsBoolean()
    allow_carry_forward?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    max_carry_forward_days?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    carry_forward_expiry_months?: number;

    @IsOptional()
    @IsIn(['male', 'female', ''])
    applicable_gender?: string;

    @IsOptional()
    @IsBoolean()
    requires_confirmation?: boolean;

    @IsOptional()
    @IsBoolean()
    requires_attachment?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    min_days_before_request?: number;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsNumber()
    sort_order?: number;

    @IsOptional()
    @IsString()
    color?: string;
}
