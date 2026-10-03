import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerta } from '../../common/entities/alerta.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DroneController } from './drone.controller';
import { DroneService } from './drone.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alerta]), NotificationsModule],
  controllers: [DroneController],
  providers: [DroneService],
})
export class DroneModule {}
