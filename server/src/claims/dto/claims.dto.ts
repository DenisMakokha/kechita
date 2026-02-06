import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClaimTypeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsNumber()
    @IsOptional()
    max_amount?: number;

    @IsBoolean()
    @IsOptional()
    requires_receipt?: boolean;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsNumber()
    @IsOptional()
    display_order?: number;
}

export class UpdateClaimTypeDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsNumber()
    @IsOptional()
    max_amount?: number;

    @IsBoolean()
    @IsOptional()
    requires_receipt?: boolean;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsNumber()
    @IsOptional()
    display_order?: number;
}

export class ClaimItemDto {
    @IsUUID()
    @IsNotEmpty()
    claim_type_id: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsOptional()
    expense_date?: string;

    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsNumber()
    @IsOptional()
    unit_price?: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsString()
    @IsOptional()
    receipt_number?: string;

    @IsString()
    @IsOptional()
    vendor_name?: string;

    @IsUUID()
    @IsOptional()
    document_id?: string;
}

export class SaveClaimDraftDto {
    @IsString()
    @IsOptional()
    purpose?: string;

    @IsString()
    @IsOptional()
    period_start?: string;

    @IsString()
    @IsOptional()
    period_end?: string;

    @IsBoolean()
    @IsOptional()
    is_urgent?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ClaimItemDto)
    @IsOptional()
    items?: ClaimItemDto[];
}

export class SubmitClaimDto {
    @IsString()
    @IsOptional()
    purpose?: string;

    @IsString()
    @IsOptional()
    period_start?: string;

    @IsString()
    @IsOptional()
    period_end?: string;

    @IsBoolean()
    @IsOptional()
    is_urgent?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ClaimItemDto)
    items: ClaimItemDto[];
}

export class ClaimItemReviewDto {
    @IsUUID()
    item_id: string;

    @IsNumber()
    approved_amount: number;

    @IsString()
    status: string;

    @IsString()
    @IsOptional()
    comment?: string;
}

export class ReviewClaimItemsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ClaimItemReviewDto)
    reviews: ClaimItemReviewDto[];
}

export class RecordPaymentDto {
    @IsNumber()
    amount: number;

    @IsString()
    @IsNotEmpty()
    payment_reference: string;

    @IsString()
    @IsNotEmpty()
    payment_method: string;
}
