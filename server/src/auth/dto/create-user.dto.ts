import { IsEmail, IsString, MinLength, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    role_codes?: string[];

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
