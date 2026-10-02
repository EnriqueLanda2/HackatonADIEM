import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';
import { Parcela } from '../../common/entities/parcela.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parcela])],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService]
})
export class ParcelsModule {}
