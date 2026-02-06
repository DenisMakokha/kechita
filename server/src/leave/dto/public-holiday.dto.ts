import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePublicHolidayDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsDateString()
    @Transform(({ value }) => new Date(value))
    date: Date;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_recurring?: boolean;
}

export class UpdatePublicHolidayDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_recurring?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
