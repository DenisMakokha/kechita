import { IsEmail, IsString, MinLength, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class UpdateUserRolesDto {
    @IsArray()
    @IsString({ each: true })
    role_codes: string[];
}

export class UpdateUserPasswordDto {
    @IsString()
    @MinLength(8)
    new_password: string;
}
