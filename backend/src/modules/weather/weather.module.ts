import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherService } from './weather.service';
import { ConfiguracionClima } from '../../common/entities/configuracion-clima.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionClima])],
  providers: [WeatherService],
  exports: [WeatherService]
})
export class WeatherModule {}
