import { IsString, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class MarkMultipleReadDto {
    @IsArray()
    @IsUUID('4', { each: true })
    ids: string[];
}

export class UpdatePreferenceDto {
    @IsBoolean()
    @IsOptional()
    in_app_enabled?: boolean;

    @IsBoolean()
    @IsOptional()
    email_enabled?: boolean;

    @IsBoolean()
    @IsOptional()
    push_enabled?: boolean;

    @IsBoolean()
    @IsOptional()
    sms_enabled?: boolean;
}
