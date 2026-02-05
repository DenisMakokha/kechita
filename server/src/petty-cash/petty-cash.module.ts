import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PettyCashFloat } from './entities/petty-cash-float.entity';
import { PettyCashTransaction } from './entities/petty-cash-transaction.entity';
import { PettyCashReplenishment } from './entities/petty-cash-replenishment.entity';
import { PettyCashReconciliation } from './entities/petty-cash-reconciliation.entity';
import { PettyCashService } from './petty-cash.service';
import { PettyCashController } from './petty-cash.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PettyCashFloat,
            PettyCashTransaction,
            PettyCashReplenishment,
            PettyCashReconciliation,
        ]),
    ],
    controllers: [PettyCashController],
    providers: [PettyCashService],
    exports: [PettyCashService],
})
export class PettyCashModule { }
