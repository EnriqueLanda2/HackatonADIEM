import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database/database.config';

import { CropsModule } from './modules/crops/crops.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { ValvesModule } from './modules/valves/valves.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { IrrigationModule } from './modules/irrigation/irrigation.module';
import { WeatherModule } from './modules/weather/weather.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DroneModule } from './modules/drone/drone.module';
import { BitacoraModule } from './modules/bitacora/bitacora.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(databaseConfig),
    AuthModule,
    CropsModule,
    ParcelsModule,
    SensorsModule,
    ValvesModule,
    AlertsModule,
    IrrigationModule,
    WeatherModule,
    DashboardModule,
    NotificationsModule,
    DroneModule,
    BitacoraModule,
  ],
})
export class AppModule {}
