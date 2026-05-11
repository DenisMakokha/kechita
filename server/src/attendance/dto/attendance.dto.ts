import { IsString, IsOptional, IsBoolean, IsUUID, IsDateString, IsNumber, IsEnum, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClockInMethod } from '../entities/time-entry.entity';

export class CreateShiftDto {
    @IsString() code: string;
    @IsString() name: string;
    @IsString() start_time: string;
    @IsString() end_time: string;
    @IsOptional() @IsInt() @Min(0) @Max(240) break_minutes?: number;
    @IsOptional() @IsInt() @Min(0) @Max(60) grace_minutes?: number;
    @IsOptional() @IsBoolean() is_night_shift?: boolean;
    @IsOptional() @IsBoolean() is_active?: boolean;
    @IsOptional() @IsString() notes?: string;
}

export class UpdateShiftDto {
    @IsOptional() @IsString() name?: string;
    @IsOptional() @IsString() start_time?: string;
    @IsOptional() @IsString() end_time?: string;
    @IsOptional() @IsInt() break_minutes?: number;
    @IsOptional() @IsInt() grace_minutes?: number;
    @IsOptional() @IsBoolean() is_night_shift?: boolean;
    @IsOptional() @IsBoolean() is_active?: boolean;
    @IsOptional() @IsString() notes?: string;
}

export class RosterRowDto {
    @IsUUID() staff_id: string;
    @IsUUID() shift_id: string;
    @IsDateString() date: string;
    @IsOptional() @IsBoolean() is_day_off?: boolean;
    @IsOptional() @IsString() notes?: string;
}

export class AssignRosterDto {
    @IsArray() @ValidateNested({ each: true }) @Type(() => RosterRowDto)
    assignments: RosterRowDto[];
}

export class ClockInRequestDto {
    @IsOptional() @IsEnum(ClockInMethod) method?: ClockInMethod;
    @IsOptional() @IsNumber() lat?: number;
    @IsOptional() @IsNumber() lng?: number;
    @IsOptional() @IsUUID() branch_id?: string;
    @IsOptional() @IsString() notes?: string;
}

export class ClockOutRequestDto {
    @IsOptional() @IsNumber() lat?: number;
    @IsOptional() @IsNumber() lng?: number;
    @IsOptional() @IsString() notes?: string;
}

export class ManualEntryDto {
    @IsUUID() staff_id: string;
    @IsDateString() date: string;
    @IsDateString() clock_in_at: string;
    @IsOptional() @IsDateString() clock_out_at?: string;
    @IsOptional() @IsUUID() shift_id?: string;
    @IsOptional() @IsString() notes?: string;
}

export class RejectEntryDto {
    @IsString() reason: string;
}
