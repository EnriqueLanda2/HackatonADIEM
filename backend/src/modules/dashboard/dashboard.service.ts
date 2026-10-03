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
    const parcelas = await this.parcelaRepo.find({ relations: ['cultivo', 'sensores'] });
    const valvulas = await this.valvulaRepo.find();
    const tanques = await this.tanqueRepo.find();
    const alertas = await this.alertaRepo.find({ where: { activa: true }, order: { created_at: 'DESC' } });
    const recentEvents = await this.eventoRepo.find({ order: { inicio: 'DESC' }, take: 10 });
    const forecast = await this.weatherService.getForecast();

    const parcelasDashboard = parcelas.map((p) => {
      const sensores = p.sensores || [];
      const sueloSensor = sensores.find((s) => s.tipo === 'humedad_suelo');
      const tempSensor = sensores.find((s) => s.tipo === 'temperatura');
      const ambSensor = sensores.find((s) => s.tipo === 'humedad_ambiental');
      const phSensor = sensores.find((s) => s.tipo === 'ph_suelo');
      const parcelaValve = valvulas.find((v) => v.parcela_id === p.id);

      return {
        parcela: p,
        tiene_cultivo: p.tiene_cultivo,
        cultivo: p.cultivo,
        humedad_suelo: sueloSensor?.ultimo_valor ? Number(sueloSensor.ultimo_valor) : 50,
        temperatura: tempSensor?.ultimo_valor ? Number(tempSensor.ultimo_valor) : 25,
        humedad_ambiental: ambSensor?.ultimo_valor ? Number(ambSensor.ultimo_valor) : 60,
        ph_suelo: phSensor?.ultimo_valor ? Number(phSensor.ultimo_valor) : 6.8,
        sensores_activos: {
          humedad_suelo: !!sueloSensor,
          humedad_ambiental: !!ambSensor,
          temperatura: !!tempSensor,
          ph_suelo: !!phSensor,
        },
        valvula_estado: parcelaValve?.estado || 'cerrada',
        valvula_modo: parcelaValve?.modo || p.modo_operacion || 'automatico',
      };
    });

    return {
      parcelas: parcelasDashboard,
      tanques,
      alertas_activas: alertas,
      clima: forecast,
      eventos_recientes: recentEvents,
      estadisticas: {
        total_parcelas: parcelas.length,
        parcelas_activas: parcelas.filter((p) => p.activa).length,
        parcelas_con_cultivo: parcelas.filter((p) => p.tiene_cultivo).length,
        parcelas_sin_cultivo: parcelas.filter((p) => !p.tiene_cultivo).length,
        valvulas_abiertas: valvulas.filter((v) => v.estado === 'abierta').length,
        alertas_sin_leer: alertas.filter((a) => !a.leida).length,
        litros_hoy: 1850,
        riegos_hoy: 4,
      },
    };
  }
}
