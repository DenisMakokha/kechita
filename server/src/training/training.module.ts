import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingProgram } from './entities/training-program.entity';
import { TrainingSession } from './entities/training-session.entity';
import { TrainingEnrollment } from './entities/training-enrollment.entity';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
    imports: [TypeOrmModule.forFeature([TrainingProgram, TrainingSession, TrainingEnrollment])],
    controllers: [TrainingController],
    providers: [TrainingService],
    exports: [TrainingService],
})
export class TrainingModule {}
