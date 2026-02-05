import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentController } from './recruitment.controller';
import { BackgroundCheckService } from './background-check.service';
import { SignatureService } from './signature.service';
import { ContractService } from './contract.service';
import { RecruitmentSchedulerService } from './recruitment-scheduler.service';
import { JobPost } from './entities/job-post.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';
import { Candidate } from './entities/candidate.entity';
import { Application } from './entities/application.entity';
import { Interview } from './entities/interview.entity';
import { Offer } from './entities/offer.entity';
import { CandidateNote } from './entities/candidate-note.entity';
import { BackgroundCheck } from './entities/background-check.entity';
import { ReferenceCheck } from './entities/reference-check.entity';
import { OfferSignature } from './entities/offer-signature.entity';
import { Staff } from '../staff/entities/staff.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            JobPost,
            PipelineStage,
            Candidate,
            Application,
            Interview,
            Offer,
            CandidateNote,
            BackgroundCheck,
            ReferenceCheck,
            OfferSignature,
            Staff,
        ]),
    ],
    controllers: [RecruitmentController],
    providers: [
        RecruitmentService,
        BackgroundCheckService,
        SignatureService,
        ContractService,
        RecruitmentSchedulerService,
    ],
    exports: [
        RecruitmentService,
        BackgroundCheckService,
        SignatureService,
        ContractService,
        RecruitmentSchedulerService,
    ],
})
export class RecruitmentModule { }
