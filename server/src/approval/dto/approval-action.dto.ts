import { IsString, IsOptional, IsUUID, IsArray, ArrayMinSize } from 'class-validator';

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

export class BulkApproveDto {
    @IsArray()
    @IsUUID('4', { each: true })
    @ArrayMinSize(1)
    instanceIds: string[];

    @IsOptional()
    @IsString()
    comment?: string;
}

export class BulkRejectDto {
    @IsArray()
    @IsUUID('4', { each: true })
    @ArrayMinSize(1)
    instanceIds: string[];

    @IsString()
    comment: string;
}
