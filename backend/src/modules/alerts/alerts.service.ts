import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alerta } from '../../common/entities/alerta.entity';
import { SensorsGateway } from '../sensors/sensors.gateway';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alerta) private alertRepo: Repository<Alerta>,
    @Inject(forwardRef(() => SensorsGateway)) private gateway: SensorsGateway
  ) {}

  findAllActive() {
    return this.alertRepo.find({ where: { activa: true }, order: { created_at: 'DESC' } });
  }

  async markAsRead(id: string) {
    // Las alertas generadas en el dashboard (ids no UUID) no existen en la base.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    const alert = await this.alertRepo.findOneBy({ id });
    if (!alert) return null;
    alert.leida = true;
    alert.activa = false;
    alert.resuelta_at = new Date();
    await this.alertRepo.save(alert);
    return alert;
  }

  async generateAlert(tipo: string, parcela_id: string, contexto: any) {
    // Check if similar active alert already exists to prevent spam
    const existing = await this.alertRepo.findOne({ where: { tipo, parcela_id, activa: true } });
    if (existing) return existing;

    let titulo = 'Alerta del Sistema';
    let mensaje = '';
    let severidad = 'media';

    switch (tipo) {
      case 'prevencion_organica':
        titulo = 'Riesgo de Hongos (Humedad Ambiental Alta)';
        mensaje = 'Humedad ambiental alta prolongada. Se recomienda aplicar repelente orgánico (estiércol y resina de árbol).';
        severidad = 'media';
        break;
      case 'nivel_reserva':
        titulo = 'Nivel Crítico de Reserva de Agua';
        mensaje = 'El tanque está por debajo del 20%. Riegos no críticos suspendidos.';
        severidad = 'critica';
        break;
      case 'humedad_critica':
        titulo = 'Humedad de Suelo Crítica';
        mensaje = 'Niveles de humedad peligrosamente bajos para el cultivo.';
        severidad = 'alta';
        break;
    }

    const alert = this.alertRepo.create({ tipo, parcela_id, titulo, mensaje, severidad, datos_contexto: contexto });
    await this.alertRepo.save(alert);
    this.gateway.emitAlert(alert);
    return alert;
  }
}
