import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, MaxLength, Min, Max } from 'class-validator';

export class CreateDocumentTypeDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsBoolean()
    @IsOptional()
    is_required?: boolean;

    @IsBoolean()
    @IsOptional()
    requires_expiry?: boolean;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(365)
    default_expiry_days?: number;

    @IsNumber()
    @IsOptional()
    @Min(7)
    expiry_warning_days?: number;

    @IsString()
    @IsOptional()
    allowed_extensions?: string;

    @IsNumber()
    @IsOptional()
    @Min(0.1)
    @Max(50)
    max_size_mb?: number;

    @IsNumber()
    @IsOptional()
    sort_order?: number;
}

export class UpdateDocumentTypeDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsBoolean()
    @IsOptional()
    is_required?: boolean;

    @IsBoolean()
    @IsOptional()
    requires_expiry?: boolean;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(365)
    default_expiry_days?: number;

    @IsNumber()
    @IsOptional()
    @Min(7)
    expiry_warning_days?: number;

    @IsString()
    @IsOptional()
    allowed_extensions?: string;

    @IsNumber()
    @IsOptional()
    @Min(0.1)
    @Max(50)
    max_size_mb?: number;

    @IsNumber()
    @IsOptional()
    sort_order?: number;
}
