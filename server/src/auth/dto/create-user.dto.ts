import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    })
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    role_code?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
