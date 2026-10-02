import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';
import { Cultivo } from '../../common/entities/cultivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cultivo])],
  controllers: [CropsController],
  providers: [CropsService],
})
export class CropsModule {}
