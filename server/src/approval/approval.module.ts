import { Module, forwardRef, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ApprovalFlow } from './entities/approval-flow.entity';
import { ApprovalFlowStep } from './entities/approval-flow-step.entity';
import { ApprovalInstance } from './entities/approval-instance.entity';
import { ApprovalAction } from './entities/approval-action.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { Staff } from '../staff/entities/staff.entity';

@Global()
@Module({
    imports: [
        EventEmitterModule.forRoot(),
        TypeOrmModule.forFeature([
            ApprovalFlow,
            ApprovalFlowStep,
            ApprovalInstance,
            ApprovalAction,
            Staff,
        ]),
    ],
    controllers: [ApprovalController],
    providers: [ApprovalService],
    exports: [ApprovalService],
})
export class ApprovalModule { }
