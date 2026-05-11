import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsDateString, IsEmail, IsInt, Min, Max } from 'class-validator';
import { DependentRelationship } from '../entities/dependent.entity';
import { ProbationRecommendation } from '../entities/probation-review.entity';
import { SalaryChangeType } from '../entities/salary-history.entity';

export class CreateNextOfKinDto {
    @IsString() full_name: string;
    @IsString() relationship: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsString() alternate_phone?: string;
    @IsOptional() @IsEmail() email?: string;
    @IsOptional() @IsString() national_id?: string;
    @IsOptional() @IsString() address?: string;
    @IsOptional() @IsBoolean() is_primary?: boolean;
    @IsOptional() @IsNumber() benefit_share_percent?: number;
}

export class UpdateNextOfKinDto {
    @IsOptional() @IsString() full_name?: string;
    @IsOptional() @IsString() relationship?: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsString() alternate_phone?: string;
    @IsOptional() @IsEmail() email?: string;
    @IsOptional() @IsString() national_id?: string;
    @IsOptional() @IsString() address?: string;
    @IsOptional() @IsBoolean() is_primary?: boolean;
    @IsOptional() @IsNumber() benefit_share_percent?: number;
}

export class CreateDependentDto {
    @IsString() full_name: string;
    @IsEnum(DependentRelationship) relationship: DependentRelationship;
    @IsOptional() @IsDateString() date_of_birth?: string;
    @IsOptional() @IsString() gender?: string;
    @IsOptional() @IsString() national_id?: string;
    @IsOptional() @IsBoolean() medical_eligible?: boolean;
    @IsOptional() @IsBoolean() is_disabled?: boolean;
}

export class UpdateDependentDto {
    @IsOptional() @IsString() full_name?: string;
    @IsOptional() @IsEnum(DependentRelationship) relationship?: DependentRelationship;
    @IsOptional() @IsDateString() date_of_birth?: string;
    @IsOptional() @IsString() gender?: string;
    @IsOptional() @IsString() national_id?: string;
    @IsOptional() @IsBoolean() medical_eligible?: boolean;
    @IsOptional() @IsBoolean() is_disabled?: boolean;
}

export class AdjustSalaryDto {
    @IsNumber() new_salary: number;
    @IsOptional() @IsEnum(SalaryChangeType) change_type?: SalaryChangeType;
    @IsOptional() @IsDateString() effective_date?: string;
    @IsOptional() @IsString() reason?: string;
}

export class CreateProbationReviewDto {
    @IsOptional() @IsDateString() review_date?: string;
    @IsOptional() @IsInt() @Min(1) @Max(5) overall_rating?: number;
    @IsOptional() @IsString() strengths?: string;
    @IsOptional() @IsString() development_areas?: string;
    @IsOptional() @IsString() manager_comments?: string;
    @IsOptional() @IsEnum(ProbationRecommendation) recommendation?: ProbationRecommendation;
    @IsOptional() @IsDateString() extended_until?: string;
}

export class AcknowledgeReviewDto {
    @IsOptional() @IsString() comments?: string;
}
