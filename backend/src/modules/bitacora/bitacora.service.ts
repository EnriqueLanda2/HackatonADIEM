import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { UsuarioSesion } from '../auth/auth.service';

export interface EntradaBitacoraDto {
  categoria?: string;
  accion?: string;
  detalle?: string;
  tipo_riego?: string | null;
  parcela?: string | null;
  navegador?: string;
  sistema?: string;
  dispositivo?: string;
  idioma?: string;
  zona_horaria?: string;
  origen?: string;
}

const corto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null);

@Injectable()
export class BitacoraService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS bitacora (
        id UUID PRIMARY KEY,
        fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        usuario_id VARCHAR(80),
        usuario_nombre VARCHAR(150),
        rol VARCHAR(20),
        categoria VARCHAR(30) NOT NULL,
        accion VARCHAR(150) NOT NULL,
        detalle TEXT,
        tipo_riego VARCHAR(30),
        parcela VARCHAR(150),
        navegador VARCHAR(80),
        sistema VARCHAR(80),
        dispositivo VARCHAR(40),
        idioma VARCHAR(20),
        zona_horaria VARCHAR(60),
        origen VARCHAR(200),
        ip VARCHAR(64)
      )
    `);
    await this.dataSource.query('CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora (fecha DESC)');
  }

  async registrar(usuario: UsuarioSesion, dto: EntradaBitacoraDto, ip: string) {
    const id = randomUUID();
    await this.dataSource.query(
      `INSERT INTO bitacora (id, usuario_id, usuario_nombre, rol, categoria, accion, detalle, tipo_riego, parcela,
        navegador, sistema, dispositivo, idioma, zona_horaria, origen, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        id, usuario.id, usuario.nombre, usuario.rol,
        corto(dto.categoria, 30) ?? 'sistema', corto(dto.accion, 150) ?? 'Acción',
        corto(dto.detalle, 1000), corto(dto.tipo_riego, 30), corto(dto.parcela, 150),
        corto(dto.navegador, 80), corto(dto.sistema, 80), corto(dto.dispositivo, 40),
        corto(dto.idioma, 20), corto(dto.zona_horaria, 60), corto(dto.origen, 200), corto(ip, 64),
      ],
    );
    return { id };
  }

  listar(limite = 200) {
    return this.dataSource.query('SELECT * FROM bitacora ORDER BY fecha DESC LIMIT $1', [Math.min(Math.max(limite, 1), 1000)]);
  }
}
