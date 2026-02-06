import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsDateString } from 'class-validator';

export class SubmitDailyReportDto {
    @IsUUID()
    @IsNotEmpty()
    branch_id: string;

    @IsDateString()
    @IsOptional()
    report_date?: string;

    @IsNumber()
    @IsOptional()
    disbursement_amount?: number;

    @IsNumber()
    @IsOptional()
    disbursement_count?: number;

    @IsNumber()
    @IsOptional()
    collection_amount?: number;

    @IsNumber()
    @IsOptional()
    collection_count?: number;

    @IsNumber()
    @IsOptional()
    new_clients?: number;

    @IsNumber()
    @IsOptional()
    active_clients?: number;

    @IsNumber()
    @IsOptional()
    outstanding_portfolio?: number;

    @IsNumber()
    @IsOptional()
    par_amount?: number;

    @IsNumber()
    @IsOptional()
    par_ratio?: number;

    @IsNumber()
    @IsOptional()
    par_1_30?: number;

    @IsNumber()
    @IsOptional()
    par_31_60?: number;

    @IsNumber()
    @IsOptional()
    par_61_90?: number;

    @IsNumber()
    @IsOptional()
    par_90_plus?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class ApproveReportDto {
    @IsString()
    @IsOptional()
    comment?: string;
}

export class SubmitKPIReportDto {
    @IsUUID()
    @IsNotEmpty()
    branch_id: string;

    @IsDateString()
    @IsNotEmpty()
    report_date: string;

    @IsNumber()
    @IsOptional()
    disbursement_amount?: number;

    @IsNumber()
    @IsOptional()
    disbursement_count?: number;

    @IsNumber()
    @IsOptional()
    collection_amount?: number;

    @IsNumber()
    @IsOptional()
    collection_count?: number;

    @IsNumber()
    @IsOptional()
    new_clients?: number;

    @IsNumber()
    @IsOptional()
    active_clients?: number;

    @IsNumber()
    @IsOptional()
    outstanding_portfolio?: number;

    @IsNumber()
    @IsOptional()
    par_amount?: number;

    @IsNumber()
    @IsOptional()
    par_1_30?: number;

    @IsNumber()
    @IsOptional()
    par_31_60?: number;

    @IsNumber()
    @IsOptional()
    par_61_90?: number;

    @IsNumber()
    @IsOptional()
    par_90_plus?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
