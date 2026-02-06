import { IsString, IsNotEmpty, IsNumber, IsUUID, IsOptional } from 'class-validator';

export class AdjustBalanceDto {
    @IsUUID()
    leaveTypeId: string;

    @IsNumber()
    adjustmentDays: number;

    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsOptional()
    @IsNumber()
    year?: number;
}
