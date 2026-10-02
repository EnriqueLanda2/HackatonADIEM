import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParcelsService } from '../parcels/parcels.service';
import { ValvesService } from '../valves/valves.service';
import { WeatherService } from '../weather/weather.service';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Sensor } from '../../common/entities/sensor.entity';

@Injectable()
export class IrrigationService {
  private readonly logger = new Logger(IrrigationService.name);

  constructor(
    private parcelsService: ParcelsService,
    private valvesService: ValvesService,
    private weatherService: WeatherService,
    @InjectRepository(TanqueAgua) private tanqueRepo: Repository<TanqueAgua>,
    @InjectRepository(Sensor) private sensorRepo: Repository<Sensor>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.debug('Running irrigation decision engine...');
    
    // Fallback logic for demo
    try {
      const forecast = await this.weatherService.getForecast();
      const rainExpected = forecast.probabilidad_lluvia > 50;

      const tanques = await this.tanqueRepo.find();
      const tanqueP = tanques.length > 0 ? tanques[0] : null;
      const waterOk = tanqueP ? tanqueP.nivel_actual_porcentaje > tanqueP.nivel_critico_porcentaje : true;

      const parcels = await this.parcelsService.findAll();
      const valves = await this.valvesService.findAll();

      for (const parcel of parcels) {
        if (!parcel.activa || parcel.modo_operacion !== 'automatico') continue;

        const crop = parcel.cultivo;
        if (!crop) continue;

        const soilSensors = await this.sensorRepo.find({ where: { parcela_id: parcel.id, tipo: 'humedad_suelo' } });
        if (soilSensors.length === 0) continue;

        const avgMoisture = soilSensors.reduce((acc, s) => acc + (s.ultimo_valor || 0), 0) / soilSensors.length;

        const parcelValve = valves.find(v => v.parcela_id === parcel.id);
        if (!parcelValve || parcelValve.modo !== 'automatico') continue;

        if (avgMoisture < crop.humedad_minima) {
          if (!rainExpected && waterOk && parcelValve.estado === 'cerrada') {
            this.logger.log(`Opening valve ${parcelValve.id} for parcel ${parcel.nombre}`);
            await this.valvesService.toggleValve(parcelValve.id, 'abierta', 'decision_motor_auto');
          }
        } else if (avgMoisture >= crop.humedad_optima) {
          if (parcelValve.estado === 'abierta') {
            this.logger.log(`Closing valve ${parcelValve.id} for parcel ${parcel.nombre}`);
            await this.valvesService.toggleValve(parcelValve.id, 'cerrada', 'decision_motor_auto');
          }
        }
      }
    } catch (e) {
      this.logger.error('Error in decision engine', e);
    }
  }
}
