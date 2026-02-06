import { IsString, IsOptional, IsUUID } from 'class-validator';

export class ApproveDto {
    @IsOptional()
    @IsString()
    comment?: string;
}

export class RejectDto {
    @IsString()
    comment: string;
}

export class CancelDto {
    @IsOptional()
    @IsString()
    reason?: string;
}

export class DelegateDto {
    @IsUUID()
    delegateTo: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
