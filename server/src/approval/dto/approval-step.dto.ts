import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsNumber, IsEnum, Min } from 'class-validator';
import { ApproverType } from '../entities/approval-flow-step.entity';

export class CreateApprovalStepDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    step_order?: number;

    @IsOptional()
    @IsString()
    name?: string;

    @IsEnum(ApproverType)
    approver_type: ApproverType;

    @IsOptional()
    @IsString()
    approver_role_code?: string;

    @IsOptional()
    @IsUUID()
    specific_approver_id?: string;

    @IsOptional()
    @IsBoolean()
    is_final?: boolean;

    @IsOptional()
    @IsBoolean()
    can_skip?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    auto_approve_hours?: number;

    @IsOptional()
    @IsString()
    escalation_role_code?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    escalation_hours?: number;

    @IsOptional()
    @IsString()
    instructions?: string;
}

export class UpdateApprovalStepDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    step_order?: number;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEnum(ApproverType)
    approver_type?: ApproverType;

    @IsOptional()
    @IsString()
    approver_role_code?: string;

    @IsOptional()
    @IsUUID()
    specific_approver_id?: string;

    @IsOptional()
    @IsBoolean()
    is_final?: boolean;

    @IsOptional()
    @IsBoolean()
    can_skip?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(0)
    auto_approve_hours?: number;

    @IsOptional()
    @IsString()
    escalation_role_code?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    escalation_hours?: number;

    @IsOptional()
    @IsString()
    instructions?: string;
}
