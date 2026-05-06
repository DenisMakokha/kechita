import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ContractType } from '../entities/staff-contract.entity';

export class CreateContractDto {
    @IsEnum(ContractType)
    @IsNotEmpty()
    contract_type: ContractType;

    @IsDateString()
    @IsNotEmpty()
    start_date: string;

    @IsOptional()
    @IsDateString()
    end_date?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    salary?: number;

    @IsOptional()
    @IsString()
    salary_currency?: string;

    @IsOptional()
    @IsString()
    job_title?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    terms?: string;

    @IsOptional()
    @IsString()
    special_conditions?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(365)
    notice_period_days?: number;
}

export class UpdateContractDto {
    @IsOptional()
    @IsEnum(ContractType)
    contract_type?: ContractType;

    @IsOptional()
    @IsDateString()
    start_date?: string;

    @IsOptional()
    @IsDateString()
    end_date?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    salary?: number;

    @IsOptional()
    @IsString()
    job_title?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    terms?: string;

    @IsOptional()
    @IsString()
    special_conditions?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    notice_period_days?: number;
}
