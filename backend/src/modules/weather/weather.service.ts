import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionClima } from '../../common/entities/configuracion-clima.entity';

@Injectable()
export class WeatherService {
  constructor(
    @InjectRepository(ConfiguracionClima) private configRepo: Repository<ConfiguracionClima>
  ) {}

  async getForecast() {
    let latest = await this.configRepo.findOne({
      where: {},
      order: { consultado_at: 'DESC' }
    });

    if (!latest || Date.now() - latest.consultado_at.getTime() > 3600000) {
       // Mock for Morelos if no api key or out of date
       const mockProb = Math.random() * 100;
       latest = this.configRepo.create({
         pronostico_lluvia_12h: mockProb > 60,
         probabilidad_lluvia: mockProb,
         temperatura_exterior: 25 + Math.random() * 10,
         humedad_relativa_exterior: 40 + Math.random() * 40,
         fuente_api: 'mock_openweathermap',
         datos_raw: { mock: true }
       });
       await this.configRepo.save(latest);
    }

    return latest;
  }
}
