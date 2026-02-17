import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class UpdateUserRolesDto {
    @IsString()
    role_code: string;
}

export class UpdateUserPasswordDto {
    @IsString()
    @MinLength(8)
    new_password: string;
}
