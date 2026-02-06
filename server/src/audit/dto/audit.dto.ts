import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '../entities/audit-log.entity';

export class AuditLogFilterDto {
    @IsString()
    @IsOptional()
    userId?: string;

    @IsString()
    @IsOptional()
    staffId?: string;

    @IsEnum(AuditAction)
    @IsOptional()
    action?: AuditAction;

    @IsString()
    @IsOptional()
    entityType?: string;

    @IsString()
    @IsOptional()
    entityId?: string;

    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;

    @IsString()
    @IsOptional()
    isSuccessful?: string;

    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    @IsOptional()
    limit?: number;

    @IsInt()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    offset?: number;
}

export class StatsQueryDto {
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;
}

export class LimitQueryDto {
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    @IsOptional()
    limit?: number;
}
