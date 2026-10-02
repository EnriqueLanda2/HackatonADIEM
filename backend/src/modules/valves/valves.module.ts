import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValvesController } from './valves.controller';
import { ValvesService } from './valves.service';
import { Valvula } from '../../common/entities/valvula.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [TypeOrmModule.forFeature([Valvula, EventoRiego]), SensorsModule],
  controllers: [ValvesController],
  providers: [ValvesService],
  exports: [ValvesService]
})
export class ValvesModule {}
