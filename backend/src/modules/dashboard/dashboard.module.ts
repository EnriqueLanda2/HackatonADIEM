import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Parcela } from '../../common/entities/parcela.entity';
import { Valvula } from '../../common/entities/valvula.entity';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Alerta } from '../../common/entities/alerta.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { WeatherModule } from '../weather/weather.module';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcela, Valvula, TanqueAgua, Alerta, EventoRiego]),
    WeatherModule,
    SensorsModule
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
