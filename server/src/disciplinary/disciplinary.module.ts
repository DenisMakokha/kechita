import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinaryCase } from './entities/disciplinary-case.entity';
import { DisciplinaryController } from './disciplinary.controller';
import { DisciplinaryService } from './disciplinary.service';

@Module({
    imports: [TypeOrmModule.forFeature([DisciplinaryCase])],
    controllers: [DisciplinaryController],
    providers: [DisciplinaryService],
    exports: [DisciplinaryService],
})
export class DisciplinaryModule {}
