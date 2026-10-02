import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcela } from '../../common/entities/parcela.entity';
import { Valvula } from '../../common/entities/valvula.entity';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Alerta } from '../../common/entities/alerta.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { WeatherService } from '../weather/weather.service';
import { SensorsService } from '../sensors/sensors.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Parcela) private parcelaRepo: Repository<Parcela>,
    @InjectRepository(Valvula) private valvulaRepo: Repository<Valvula>,
    @InjectRepository(TanqueAgua) private tanqueRepo: Repository<TanqueAgua>,
    @InjectRepository(Alerta) private alertaRepo: Repository<Alerta>,
    @InjectRepository(EventoRiego) private eventoRepo: Repository<EventoRiego>,
    private weatherService: WeatherService,
    private sensorsService: SensorsService
  ) {}

  async getSummary() {
    const parcelas = await this.parcelaRepo.find({ relations: ['cultivo'] });
    const valvulas = await this.valvulaRepo.find();
    const tanques = await this.tanqueRepo.find();
    const alertas = await this.alertaRepo.count({ where: { activa: true } });
    const recentEvents = await this.eventoRepo.find({ order: { inicio: 'DESC' }, take: 10 });
    const forecast = await this.weatherService.getForecast();
    const sensorsData = await this.sensorsService.getLatestReadings();

    return {
      parcelas: parcelas.map(p => ({
        ...p,
        sensores: sensorsData.filter(s => s.id && true) // Simplification for dashboard mock
      })),
      valvulas,
      tanques,
      activeAlertsCount: alertas,
      forecast,
      recentEvents
    };
  }
}
