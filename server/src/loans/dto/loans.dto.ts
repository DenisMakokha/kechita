import {
    IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum, IsUUID, Min, Max, Matches,
} from 'class-validator';
import { LoanType } from '../entities/staff-loan.entity';

export class ApplyLoanDto {
    @IsEnum(LoanType)
    loan_type: LoanType;

    @IsNumber()
    @Min(1)
    principal: number;

    @IsNumber()
    @Min(1)
    @Max(60)
    term_months: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    interest_rate?: number;

    @IsOptional()
    @IsString()
    purpose?: string;

    @IsOptional()
    @IsBoolean()
    is_urgent?: boolean;

    @IsOptional()
    @IsBoolean()
    deduct_from_salary?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(50)
    max_salary_deduction_percent?: number;

    @IsOptional()
    @IsUUID()
    guarantor_id?: string;
}

export class DisburseLoanDto {
    @IsString()
    @IsNotEmpty()
    disbursement_reference: string;

    @IsString()
    @IsNotEmpty()
    disbursement_method: string;

    @IsOptional()
    @IsString()
    first_repayment_date?: string;
}

export class RecordPaymentDto {
    @IsOptional()
    @IsUUID()
    repayment_id?: string;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsString()
    @IsNotEmpty()
    payment_reference: string;

    @IsString()
    @IsNotEmpty()
    payment_method: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class RecordPayrollDeductionDto {
    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsString()
    @Matches(/^\d{4}-\d{2}$/, { message: 'payroll_month must be in YYYY-MM format' })
    payroll_month: string;

    @IsString()
    @IsNotEmpty()
    payroll_reference: string;
}

export class ProcessPayrollDto {
    @IsString()
    @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
    month: string;

    @IsString()
    @IsNotEmpty()
    payroll_reference: string;
}
