import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { JobStatus, EmploymentType } from '../entities/job-post.entity';
import { InterviewType, InterviewOutcome } from '../entities/interview.entity';
import { CandidateSource, CandidateStatus } from '../entities/candidate.entity';
import { BackgroundCheckStatus } from '../entities/background-check.entity';

export class CreateJobPostDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    requirements?: string;

    @IsString()
    @IsOptional()
    responsibilities?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsEnum(EmploymentType)
    @IsOptional()
    employment_type?: EmploymentType;

    @IsNumber()
    @IsOptional()
    salary_min?: number;

    @IsNumber()
    @IsOptional()
    salary_max?: number;

    @IsNumber()
    @IsOptional()
    openings?: number;

    @IsDateString()
    @IsOptional()
    deadline?: string;

    @IsUUID()
    @IsOptional()
    department_id?: string;

    @IsUUID()
    @IsOptional()
    branch_id?: string;

    @IsBoolean()
    @IsOptional()
    is_internal?: boolean;

    @IsBoolean()
    @IsOptional()
    is_public?: boolean;
}

export class UpdateJobPostDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    requirements?: string;

    @IsString()
    @IsOptional()
    responsibilities?: string;

    @IsString()
    @IsOptional()
    benefits?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsEnum(EmploymentType)
    @IsOptional()
    employment_type?: EmploymentType;

    @IsNumber()
    @IsOptional()
    salary_min?: number;

    @IsNumber()
    @IsOptional()
    salary_max?: number;

    @IsDateString()
    @IsOptional()
    deadline?: string;

    @IsBoolean()
    @IsOptional()
    is_remote?: boolean;

    @IsBoolean()
    @IsOptional()
    is_urgent?: boolean;

    @IsEnum(JobStatus)
    @IsOptional()
    status?: JobStatus;
}

export class ApplyToJobDto {
    @IsString()
    @IsNotEmpty()
    first_name: string;

    @IsString()
    @IsNotEmpty()
    last_name: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    cover_letter?: string;

    @IsEnum(CandidateSource)
    @IsOptional()
    source?: CandidateSource;
}

export class UpdateCandidateDto {
    @IsString()
    @IsOptional()
    first_name?: string;

    @IsString()
    @IsOptional()
    last_name?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEnum(CandidateStatus)
    @IsOptional()
    status?: CandidateStatus;
}

export class ScheduleInterviewDto {
    @IsUUID()
    @IsNotEmpty()
    application_id: string;

    @IsEnum(InterviewType)
    @IsNotEmpty()
    type: InterviewType;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsDateString()
    @IsNotEmpty()
    scheduled_at: string;

    @IsNumber()
    @IsOptional()
    duration_minutes?: number;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    video_link?: string;

    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    interviewer_ids?: string[];

    @IsString()
    @IsOptional()
    agenda?: string;
}

export class RecordInterviewOutcomeDto {
    @IsEnum(InterviewOutcome)
    @IsNotEmpty()
    outcome: InterviewOutcome;

    @IsNumber()
    @IsOptional()
    rating?: number;

    @IsString()
    @IsOptional()
    feedback?: string;

    @IsString()
    @IsOptional()
    strengths?: string;

    @IsString()
    @IsOptional()
    weaknesses?: string;

    @IsString()
    @IsOptional()
    recommendation?: string;
}

export class CreatePipelineStageDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @IsOptional()
    order?: number;

    @IsString()
    @IsOptional()
    color?: string;

    @IsBoolean()
    @IsOptional()
    is_terminal?: boolean;
}

export class UpdatePipelineStageDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @IsOptional()
    order?: number;

    @IsString()
    @IsOptional()
    color?: string;

    @IsBoolean()
    @IsOptional()
    is_terminal?: boolean;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}

export class CreateOfferDto {
    @IsNumber()
    @IsNotEmpty()
    salary: number;

    @IsDateString()
    @IsNotEmpty()
    start_date: string;

    @IsString()
    @IsOptional()
    position_title?: string;

    @IsEnum(EmploymentType)
    @IsOptional()
    employment_type?: EmploymentType;

    @IsString()
    @IsOptional()
    benefits?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsNumber()
    @IsOptional()
    probation_months?: number;

    @IsDateString()
    @IsOptional()
    expires_at?: string;
}

// Note: UpdateBackgroundCheckDto is defined in background-check.service.ts
// Use that interface directly instead of duplicating here

export class UpdateApplicationStageDto {
    @IsString()
    @IsNotEmpty()
    stage_code: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class StarApplicationDto {
    @IsBoolean()
    starred: boolean;
}

export class RateApplicationDto {
    @IsNumber()
    rating: number;
}

export class AssignApplicationDto {
    @IsUUID()
    staff_id: string;
}

export class AddCandidateNoteDto {
    @IsString()
    @IsNotEmpty()
    content: string;
}

export class InterviewFeedbackDto {
    @IsEnum(InterviewOutcome)
    outcome: InterviewOutcome;

    @IsOptional()
    @IsNumber()
    overall_rating?: number;

    @IsOptional()
    @IsString()
    feedback?: string;

    @IsOptional()
    @IsString()
    strengths?: string;

    @IsOptional()
    @IsString()
    weaknesses?: string;

    @IsOptional()
    competency_scores?: Record<string, number>;
}

export class RescheduleInterviewDto {
    @IsDateString()
    scheduled_at: string;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class CancelInterviewDto {
    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsBoolean()
    will_reschedule?: boolean;
}

export class ReviewBackgroundCheckDto {
    @IsOptional()
    @IsString()
    notes?: string;
}

export class VerifyReferenceDto {
    @IsBoolean()
    verified: boolean;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class CreateSignatureRequestDto {
    @IsOptional()
    @IsNumber()
    expires_in_days?: number;
}

export class SignOfferDto {
    @IsEnum(['drawn', 'typed', 'uploaded'])
    signature_type: 'drawn' | 'typed' | 'uploaded';

    @IsOptional()
    @IsString()
    signature_data?: string;

    @IsOptional()
    @IsString()
    typed_name?: string;
}

export class DeclineOfferDto {
    @IsString()
    @IsNotEmpty()
    reason: string;
}
