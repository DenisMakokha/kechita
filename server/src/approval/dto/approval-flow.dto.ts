import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateApprovalFlowDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    target_type: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    branch_id?: string;

    @IsOptional()
    @IsUUID()
    region_id?: string;

    @IsOptional()
    @IsUUID()
    position_id?: string;

    @IsOptional()
    @IsUUID()
    department_id?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    priority?: number;
}

export class UpdateApprovalFlowDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    branch_id?: string;

    @IsOptional()
    @IsUUID()
    region_id?: string;

    @IsOptional()
    @IsUUID()
    position_id?: string;

    @IsOptional()
    @IsUUID()
    department_id?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    priority?: number;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
