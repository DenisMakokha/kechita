import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { AnnouncementPriority, DeliveryChannel, TargetAudience } from '../entities/announcement.entity';

export class CreateAnnouncementDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsString()
    @IsOptional()
    summary?: string;

    @IsEnum(AnnouncementPriority)
    @IsOptional()
    priority?: AnnouncementPriority;

    @IsArray()
    @IsEnum(DeliveryChannel, { each: true })
    @IsOptional()
    channels?: DeliveryChannel[];

    @IsEnum(TargetAudience)
    @IsOptional()
    target_type?: TargetAudience;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    target_role_codes?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_branch_ids?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_region_ids?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_department_ids?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_user_ids?: string[];

    @IsDateString()
    @IsOptional()
    publish_at?: string;

    @IsDateString()
    @IsOptional()
    expires_at?: string;

    @IsBoolean()
    @IsOptional()
    requires_acknowledgment?: boolean;

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    attachment_ids?: string[];
}

export class UpdateAnnouncementDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    content?: string;

    @IsString()
    @IsOptional()
    summary?: string;

    @IsEnum(AnnouncementPriority)
    @IsOptional()
    priority?: AnnouncementPriority;

    @IsArray()
    @IsEnum(DeliveryChannel, { each: true })
    @IsOptional()
    channels?: DeliveryChannel[];

    @IsEnum(TargetAudience)
    @IsOptional()
    target_type?: TargetAudience;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    target_role_codes?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_branch_ids?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_region_ids?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_department_ids?: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    target_user_ids?: string[];

    @IsDateString()
    @IsOptional()
    publish_at?: string;

    @IsDateString()
    @IsOptional()
    expires_at?: string;

    @IsBoolean()
    @IsOptional()
    requires_acknowledgment?: boolean;

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    attachment_ids?: string[];
}
