import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IrrigationService } from './irrigation.service';
import { ParcelsModule } from '../parcels/parcels.module';
import { ValvesModule } from '../valves/valves.module';
import { WeatherModule } from '../weather/weather.module';
import { SensorsModule } from '../sensors/sensors.module';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Sensor } from '../../common/entities/sensor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TanqueAgua, Sensor]),
    ParcelsModule,
    ValvesModule,
    WeatherModule,
    SensorsModule
  ],
  providers: [IrrigationService],
})
export class IrrigationModule {}
