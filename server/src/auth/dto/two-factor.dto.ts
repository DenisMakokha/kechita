import { IsString, IsNotEmpty, Length } from 'class-validator';

export class Verify2FADto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'Verification code must be 6 digits' })
    token: string;
}

export class Enable2FADto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'Verification code must be 6 digits' })
    token: string;
}

export class Disable2FADto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'Verification code must be 6 digits' })
    token: string;
}
