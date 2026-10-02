import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Valvula } from '../../common/entities/valvula.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { SensorsGateway } from '../sensors/sensors.gateway';

@Injectable()
export class ValvesService {
  constructor(
    @InjectRepository(Valvula) private valveRepo: Repository<Valvula>,
    @InjectRepository(EventoRiego) private eventoRepo: Repository<EventoRiego>,
    private gateway: SensorsGateway
  ) {}

  findAll() {
    return this.valveRepo.find();
  }

  async toggleValve(id: string, estado: 'abierta' | 'cerrada', razon: string = 'manual') {
    const valve = await this.valveRepo.findOneBy({ id });
    if (!valve) return null;

    valve.estado = estado;
    if (estado === 'abierta') {
      valve.ultima_apertura = new Date();
    } else {
      valve.ultimo_cierre = new Date();
    }
    
    await this.valveRepo.save(valve);
    
    // Log event
    const evento = this.eventoRepo.create({
      valvula_id: valve.id,
      parcela_id: valve.parcela_id,
      tipo: valve.modo,
      accion: estado === 'abierta' ? 'apertura' : 'cierre',
      razon: razon
    });
    await this.eventoRepo.save(evento);

    this.gateway.emitValveUpdate({ id: valve.id, estado: valve.estado });
    return valve;
  }

  async setMode(id: string, modo: 'automatico' | 'manual') {
    const valve = await this.valveRepo.findOneBy({ id });
    if (!valve) return null;
    valve.modo = modo;
    await this.valveRepo.save(valve);
    this.gateway.emitValveUpdate({ id: valve.id, modo: valve.modo });
    return valve;
  }
}
