import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';

export class CreateLeaveRequestDto {
    @IsUUID()
    leave_type_id: string;

    @IsDateString()
    start_date: string;

    @IsDateString()
    end_date: string;

    @IsOptional()
    @IsBoolean()
    is_emergency?: boolean;

    @IsOptional()
    @IsBoolean()
    is_half_day?: boolean;

    @IsOptional()
    @IsIn(['morning', 'afternoon'])
    half_day_period?: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsUUID()
    reliever_id?: string;

    @IsOptional()
    @IsString()
    handover_notes?: string;

    @IsOptional()
    @IsString()
    contact_phone?: string;

    @IsOptional()
    @IsString()
    contact_address?: string;

    @IsOptional()
    @IsString()
    attachment_url?: string;
}
