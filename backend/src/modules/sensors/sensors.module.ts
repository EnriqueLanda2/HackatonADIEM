import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { Sensor } from '../../common/entities/sensor.entity';
import { Lectura } from '../../common/entities/lectura.entity';
import { SensorsGateway } from './sensors.gateway';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor, Lectura]),
    forwardRef(() => AlertsModule)
  ],
  controllers: [SensorsController],
  providers: [SensorsService, SensorsGateway],
  exports: [SensorsService, SensorsGateway]
})
export class SensorsModule {}
