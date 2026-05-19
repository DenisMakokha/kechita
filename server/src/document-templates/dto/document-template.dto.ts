import {
    IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, IsObject,
    ValidateNested, Min, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    DocumentTemplateKind, DocumentTemplateScope, TemplatePageMargins,
} from '../entities/document-template.entity';

export class MarginsDto implements TemplatePageMargins {
    @IsInt() @Min(0) top: number;
    @IsInt() @Min(0) right: number;
    @IsInt() @Min(0) bottom: number;
    @IsInt() @Min(0) left: number;
}

export class CreateDocumentTemplateDto {
    @IsEnum(DocumentTemplateKind)
    kind: DocumentTemplateKind;

    @IsEnum(DocumentTemplateScope)
    @IsOptional()
    scope?: DocumentTemplateScope;

    @IsString()
    @IsOptional()
    scope_value?: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    body_html: string;

    @IsString()
    @IsOptional()
    header_html?: string;

    @IsString()
    @IsOptional()
    footer_html?: string;

    @IsArray()
    @IsOptional()
    variables_schema?: Array<{ key: string; label: string; group?: string; sample?: any }>;

    @IsString()
    @IsOptional()
    page_size?: 'A4' | 'Letter';

    @IsObject()
    @ValidateNested()
    @Type(() => MarginsDto)
    @IsOptional()
    margins?: MarginsDto;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class UpdateDocumentTemplateDto {
    @IsString() @IsOptional() name?: string;
    @IsString() @IsOptional() description?: string;
    @IsString() @IsOptional() body_html?: string;
    @IsString() @IsOptional() header_html?: string;
    @IsString() @IsOptional() footer_html?: string;
    @IsArray() @IsOptional() variables_schema?: Array<{ key: string; label: string; group?: string; sample?: any }>;
    @IsString() @IsOptional() page_size?: 'A4' | 'Letter';
    @IsObject() @ValidateNested() @Type(() => MarginsDto) @IsOptional() margins?: MarginsDto;
    @IsBoolean() @IsOptional() is_active?: boolean;
}

export class PreviewTemplateDto {
    /** If provided, used directly (raw HTML, including Handlebars). */
    @IsString() @IsOptional() body_html?: string;
    @IsString() @IsOptional() header_html?: string;
    @IsString() @IsOptional() footer_html?: string;
    /** Optional kind override when previewing a draft not yet saved. */
    @IsEnum(DocumentTemplateKind) @IsOptional() kind?: DocumentTemplateKind;
    /** Optional context override; otherwise sample data for the kind is used. */
    @IsObject() @IsOptional() context?: Record<string, any>;
}
