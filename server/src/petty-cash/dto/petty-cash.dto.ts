import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsDateString, IsEnum, IsObject, Min } from 'class-validator';
import { FloatTier } from '../entities/petty-cash-float.entity';
import { ExpenseCategory } from '../entities/petty-cash-transaction.entity';

export class CreateFloatDto {
    @IsUUID()
    @IsNotEmpty()
    branch_id: string;

    @IsEnum(FloatTier)
    @IsNotEmpty()
    tier: FloatTier;

    @IsUUID()
    @IsOptional()
    custodian_id?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    initial_balance?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    minimum_threshold?: number;
}

export class RecordExpenseDto {
    @IsUUID()
    @IsNotEmpty()
    float_id: string;

    @IsEnum(ExpenseCategory)
    @IsNotEmpty()
    category: ExpenseCategory;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    amount: number;

    @IsDateString()
    @IsNotEmpty()
    transaction_date: string;

    @IsString()
    @IsOptional()
    receipt_number?: string;

    @IsString()
    @IsOptional()
    vendor_name?: string;

    @IsUUID()
    @IsOptional()
    document_id?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class RequestReplenishmentDto {
    @IsUUID()
    @IsNotEmpty()
    float_id: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    amount_requested: number;

    @IsString()
    @IsOptional()
    justification?: string;

    @IsUUID('4', { each: true })
    @IsOptional()
    supporting_document_ids?: string[];
}

export class CashCountDto {
    @IsUUID()
    @IsNotEmpty()
    float_id: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    physical_count: number;

    @IsObject()
    @IsOptional()
    denomination_breakdown?: {
        notes_1000?: number;
        notes_500?: number;
        notes_200?: number;
        notes_100?: number;
        notes_50?: number;
        coins_40?: number;
        coins_20?: number;
        coins_10?: number;
        coins_5?: number;
        coins_1?: number;
    };

    @IsString()
    @IsOptional()
    variance_explanation?: string;
}

export class UpdateCustodianDto {
    @IsUUID()
    @IsNotEmpty()
    custodian_id: string;
}

export class ApproveReplenishmentDto {
    @IsString()
    @IsOptional()
    comment?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    amount_approved?: number;
}

export class DisburseReplenishmentDto {
    @IsString()
    @IsOptional()
    cheque_number?: string;

    @IsString()
    @IsOptional()
    payment_reference?: string;
}

export class VerifyReconciliationDto {
    @IsString()
    @IsOptional()
    comment?: string;
}
