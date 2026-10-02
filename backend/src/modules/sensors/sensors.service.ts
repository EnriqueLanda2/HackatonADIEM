import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from '../../common/entities/sensor.entity';
import { Lectura } from '../../common/entities/lectura.entity';
import { SensorsGateway } from './sensors.gateway';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(Sensor) private sensorRepo: Repository<Sensor>,
    @InjectRepository(Lectura) private lecturaRepo: Repository<Lectura>,
    private gateway: SensorsGateway,
    @Inject(forwardRef(() => AlertsService)) private alertsService: AlertsService
  ) {}

  findAll() {
    return this.sensorRepo.find();
  }

  async getLatestReadings() {
    const sensors = await this.sensorRepo.find();
    return sensors.map(s => ({ id: s.id, type: s.tipo, value: s.ultimo_valor, timestamp: s.ultima_lectura }));
  }

  async getReadingsBySensor(sensorId: string) {
    return this.lecturaRepo.find({
      where: { sensor_id: sensorId },
      order: { timestamp: 'DESC' },
      take: 100
    });
  }

  async saveReading(sensorId: string, valor: number) {
    let sensor;
    try {
      sensor = await this.sensorRepo.findOneBy({ id: sensorId });
    } catch(e) {}
    if (!sensor) return null;

    const reading = this.lecturaRepo.create({ sensor_id: sensorId, valor, unidad: sensor.unidad });
    await this.lecturaRepo.save(reading);

    sensor.ultimo_valor = valor;
    sensor.ultima_lectura = new Date();
    await this.sensorRepo.save(sensor);

    this.gateway.emitSensorUpdate({ sensorId, valor, timestamp: sensor.ultima_lectura });
    
    // Check for alerts based on new readings
    if (sensor.tipo === 'humedad_ambiental' && valor > 80) {
      await this.alertsService.generateAlert('prevencion_organica', sensor.parcela_id, { valor_actual: valor });
    }
    
    return reading;
  }

  async saveBulkReadings(data: any) {
    // Map keys to sensors dynamically or fallback to simple assignment.
    // E.g. data = { humedad_cana: 45, humedad_tomate: 60 ... }
    // This is a mockup for mapping arduino data to DB sensors
    const results = [];
    const sensors = await this.sensorRepo.find();
    
    for (const [key, val] of Object.entries(data)) {
       // simple match: if key contains 'cana' and sensor is in parcela with cana...
       // For hackathon, just save to a matched sensor by type or create reading
       const sensor = sensors.find(s => s.tipo.includes(key.split('_')[0]) || key.includes(s.tipo));
       if (sensor) {
         results.push(await this.saveReading(sensor.id, Number(val)));
       }
    }
    return { success: true, count: results.length, data: results };
  }
}
