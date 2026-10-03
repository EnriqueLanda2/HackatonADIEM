import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alerta } from '../../common/entities/alerta.entity';
import { NotificationsService } from '../notifications/notifications.service';

// Resultado que manda el dron al terminar de escanear una parcela con su cámara.
export interface EscaneoPlagaDto {
  parcela_id: string;
  parcela_nombre?: string;
  plaga_detectada: boolean;
  confianza?: number; // 0-1, certeza del clasificador
  plaga?: string; // nombre probable de la plaga
  severidad?: 'baja' | 'media' | 'alta' | 'critica';
  recomendacion?: string;
}

export interface EscaneoPlaga extends EscaneoPlagaDto {
  id: string;
  fecha: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class DroneService {
  private readonly ultimos = new Map<string, EscaneoPlaga>();

  constructor(
    @InjectRepository(Alerta) private readonly alertRepo: Repository<Alerta>,
    private readonly notifications: NotificationsService,
  ) {}

  listar() {
    return [...this.ultimos.values()];
  }

  async registrarEscaneo(dto: EscaneoPlagaDto): Promise<EscaneoPlaga> {
    const escaneo: EscaneoPlaga = { ...dto, id: `escaneo-${Date.now()}`, fecha: new Date().toISOString() };
    this.ultimos.set(dto.parcela_id, escaneo);
    const nombre = dto.parcela_nombre ?? 'la parcela';
    const confianza = dto.confianza != null ? ` (confianza ${Math.round(dto.confianza * 100)}%)` : '';
    const parcelaEnBd = UUID_RE.test(dto.parcela_id);

    if (dto.plaga_detectada) {
      const titulo = `🐛 Plaga detectada en ${nombre}`;
      const mensaje = `El escaneo del dron detectó ${dto.plaga ?? 'una plaga'}${confianza}. ${dto.recomendacion ?? 'Programa una fumigación con biopreparado.'}`;
      if (parcelaEnBd) {
        const existente = await this.alertRepo.findOne({ where: { tipo: 'plaga_detectada', parcela_id: dto.parcela_id, activa: true } });
        const alerta = existente ?? this.alertRepo.create({ tipo: 'plaga_detectada', parcela_id: dto.parcela_id });
        Object.assign(alerta, { titulo, mensaje, severidad: dto.severidad ?? 'alta', datos_contexto: escaneo, leida: false, activa: true });
        await this.alertRepo.save(alerta);
      }
      await this.notifications.enviar({
        clave: `plaga-${dto.parcela_id}-${escaneo.id}`,
        titulo,
        mensaje,
        tipo: 'plaga_detectada',
        severidad: dto.severidad ?? 'alta',
        parcela_id: dto.parcela_id,
        cooldown_min: 0,
      });
    } else {
      // Un escaneo limpio resuelve la alerta de plaga anterior de esa parcela.
      if (parcelaEnBd) {
        await this.alertRepo.update(
          { tipo: 'plaga_detectada', parcela_id: dto.parcela_id, activa: true },
          { activa: false, leida: true, resuelta_at: new Date() },
        );
      }
      await this.notifications.enviar({
        clave: `sin-plaga-${dto.parcela_id}-${escaneo.id}`,
        titulo: `✅ Sin plaga en ${nombre}`,
        mensaje: `El escaneo del dron no detectó plagas${confianza}.`,
        tipo: 'escaneo_limpio',
        severidad: 'baja',
        parcela_id: dto.parcela_id,
        cooldown_min: 0,
      });
    }
    return escaneo;
  }
}
