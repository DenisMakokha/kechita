import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsUUID, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskCategory } from '../entities/onboarding-task.entity';

export class CreateTaskDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(TaskCategory)
    category?: TaskCategory;

    @IsOptional()
    @IsNumber()
    sortOrder?: number;

    @IsOptional()
    @IsBoolean()
    isRequired?: boolean;

    @IsOptional()
    @IsString()
    responsibleParty?: string;

    @IsOptional()
    @IsNumber()
    dueDaysFromStart?: number;

    @IsOptional()
    @IsString()
    requiredDocumentTypeId?: string;

    @IsOptional()
    @IsString()
    instructions?: string;

    @IsOptional()
    @IsString()
    resourceUrl?: string;
}

export class CreateTemplateDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    positionId?: string;

    @IsOptional()
    @IsUUID()
    departmentId?: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;

    @IsOptional()
    @IsNumber()
    expectedDays?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTaskDto)
    tasks: CreateTaskDto[];
}
