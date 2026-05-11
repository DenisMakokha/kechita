import { IsInt, Min, Max, IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsBoolean, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollRunType } from '../entities/payroll-run.entity';
import { AllowanceType, AllowanceFrequency } from '../entities/staff-allowance.entity';
import { DeductionType } from '../entities/staff-recurring-deduction.entity';

export class CreatePeriodDto {
    @IsInt() @Min(2020) @Max(2100)
    year: number;

    @IsInt() @Min(1) @Max(12)
    month: number;

    @IsOptional() @IsDateString()
    pay_date?: string;

    @IsOptional() @IsString()
    notes?: string;
}

export class CreateRunDto {
    @IsUUID()
    period_id: string;

    @IsString()
    name: string;

    @IsOptional() @IsEnum(PayrollRunType)
    run_type?: PayrollRunType;

    @IsOptional() @IsUUID()
    branch_id?: string;

    @IsOptional() @IsString()
    notes?: string;
}

export class CreateAllowanceDto {
    @IsUUID() staff_id: string;
    @IsString() label: string;
    @IsEnum(AllowanceType) type: AllowanceType;
    @IsNumber() amount: number;
    @IsOptional() @IsEnum(AllowanceFrequency) frequency?: AllowanceFrequency;
    @IsOptional() @IsBoolean() taxable?: boolean;
    @IsDateString() effective_from: string;
    @IsOptional() @IsDateString() effective_to?: string;
    @IsOptional() @IsString() notes?: string;
}

export class UpdateAllowanceDto {
    @IsOptional() @IsString() label?: string;
    @IsOptional() @IsEnum(AllowanceType) type?: AllowanceType;
    @IsOptional() @IsNumber() amount?: number;
    @IsOptional() @IsEnum(AllowanceFrequency) frequency?: AllowanceFrequency;
    @IsOptional() @IsBoolean() taxable?: boolean;
    @IsOptional() @IsDateString() effective_to?: string;
    @IsOptional() @IsBoolean() is_active?: boolean;
    @IsOptional() @IsString() notes?: string;
}

export class CreateDeductionDto {
    @IsUUID() staff_id: string;
    @IsString() label: string;
    @IsEnum(DeductionType) type: DeductionType;
    @IsNumber() amount: number;
    @IsOptional() @IsBoolean() tax_relievable?: boolean;
    @IsDateString() effective_from: string;
    @IsOptional() @IsDateString() effective_to?: string;
    @IsOptional() @IsString() notes?: string;
}

export class UpdateDeductionDto {
    @IsOptional() @IsString() label?: string;
    @IsOptional() @IsEnum(DeductionType) type?: DeductionType;
    @IsOptional() @IsNumber() amount?: number;
    @IsOptional() @IsBoolean() tax_relievable?: boolean;
    @IsOptional() @IsDateString() effective_to?: string;
    @IsOptional() @IsBoolean() is_active?: boolean;
    @IsOptional() @IsString() notes?: string;
}

export class CancelRunDto {
    @IsString() reason: string;
}
