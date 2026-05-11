import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetAssignment } from './entities/asset-assignment.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
    imports: [TypeOrmModule.forFeature([Asset, AssetAssignment])],
    controllers: [AssetsController],
    providers: [AssetsService],
    exports: [AssetsService],
})
export class AssetsModule {}
