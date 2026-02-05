import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsBoolean, IsString } from 'class-validator';

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
    @IsString()
    reason?: string;
}
