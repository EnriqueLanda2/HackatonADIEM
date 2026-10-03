import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as webpush from 'web-push';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface NotificacionDto {
  clave: string; // identifica la condición para no repetir la misma notificación
  titulo: string;
  mensaje: string;
  tipo?: string;
  severidad?: 'baja' | 'media' | 'alta' | 'critica';
  parcela_id?: string;
  cooldown_min?: number;
}

const COOLDOWN_DEFAULT_MIN = 30;
// Claves VAPID persistidas para que las suscripciones sigan siendo válidas tras reiniciar.
const VAPID_FILE = join(process.cwd(), '.vapid-keys.json');

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private publicKey = '';
  private readonly enviadas = new Map<string, number>();

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    this.configurarVapid();
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS push_suscripciones (
        endpoint TEXT PRIMARY KEY,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  private configurarVapid() {
    let keys = { publicKey: process.env.VAPID_PUBLIC_KEY ?? '', privateKey: process.env.VAPID_PRIVATE_KEY ?? '' };
    if (!keys.publicKey || !keys.privateKey) {
      if (existsSync(VAPID_FILE)) {
        keys = JSON.parse(readFileSync(VAPID_FILE, 'utf8'));
      } else {
        keys = webpush.generateVAPIDKeys();
        writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
        this.logger.log(`Claves VAPID generadas en ${VAPID_FILE}`);
      }
    }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:alertas@agromai.mx', keys.publicKey, keys.privateKey);
    this.publicKey = keys.publicKey;
  }

  getPublicKey() {
    return this.publicKey;
  }

  async suscribir(sub: PushSubscriptionDto) {
    await this.dataSource.query(
      `INSERT INTO push_suscripciones (endpoint, p256dh, auth) VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [sub.endpoint, sub.keys.p256dh, sub.keys.auth],
    );
    return { ok: true };
  }

  async desuscribir(endpoint: string) {
    await this.dataSource.query('DELETE FROM push_suscripciones WHERE endpoint = $1', [endpoint]);
    return { ok: true };
  }

  // Envía a todos los dispositivos suscritos; la misma clave no se repite dentro del cooldown.
  async enviar(n: NotificacionDto) {
    const cooldownMs = (n.cooldown_min ?? COOLDOWN_DEFAULT_MIN) * 60000;
    const ultima = this.enviadas.get(n.clave) ?? 0;
    if (Date.now() - ultima < cooldownMs) return { enviada: false, motivo: 'cooldown', dispositivos: 0 };
    this.enviadas.set(n.clave, Date.now());

    const subs: { endpoint: string; p256dh: string; auth: string }[] = await this.dataSource.query(
      'SELECT endpoint, p256dh, auth FROM push_suscripciones',
    );
    const payload = JSON.stringify({
      titulo: n.titulo,
      mensaje: n.mensaje,
      tipo: n.tipo ?? 'alerta',
      severidad: n.severidad ?? 'media',
      parcela_id: n.parcela_id,
      clave: n.clave,
    });

    let entregadas = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
          entregadas++;
        } catch (err: any) {
          // 404/410: el navegador revocó la suscripción
          if (err?.statusCode === 404 || err?.statusCode === 410) await this.desuscribir(s.endpoint);
          else this.logger.warn(`Push fallida (${err?.statusCode ?? 'sin código'}): ${err?.body ?? err?.message}`);
        }
      }),
    );
    return { enviada: true, dispositivos: entregadas };
  }
}
