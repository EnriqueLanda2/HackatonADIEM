import { BadRequestException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type Rol = 'tecnico' | 'productor';
export type Plan = 'basico' | 'pro';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  plan: Plan;
}

const SESION_HORAS = 12;
// Secreto para firmar tokens; se persiste para que las sesiones sobrevivan reinicios.
const SECRET_FILE = join(process.cwd(), '.auth-secret');

// Cuentas iniciales para la demo; se crean solo si la tabla está vacía.
const USUARIOS_INICIALES: { nombre: string; email: string; password: string; rol: Rol }[] = [
  { nombre: 'Técnico de campo', email: 'tecnico@agromai.mx', password: 'tecnico123', rol: 'tecnico' },
  { nombre: 'Productor Ejido Morelos', email: 'productor@agromai.mx', password: 'productor123', rol: 'productor' },
];

const b64url = (data: Buffer | string) => Buffer.from(data).toString('base64url');

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private secret = '';

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    this.secret = process.env.AUTH_SECRET || this.leerOGenerarSecreto();
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('tecnico', 'productor')),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plan VARCHAR(10) NOT NULL DEFAULT 'basico'`);
    const [{ total }] = await this.dataSource.query('SELECT COUNT(*)::int AS total FROM usuarios');
    if (total === 0) {
      for (const u of USUARIOS_INICIALES) {
        await this.dataSource.query('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4)', [
          u.nombre,
          u.email,
          this.hashPassword(u.password),
          u.rol,
        ]);
      }
      this.logger.log('Usuarios de demostración creados (técnico y productor).');
    }
  }

  private leerOGenerarSecreto(): string {
    if (existsSync(SECRET_FILE)) return readFileSync(SECRET_FILE, 'utf8').trim();
    const secreto = randomBytes(32).toString('hex');
    writeFileSync(SECRET_FILE, secreto);
    return secreto;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  }

  private verificarPassword(password: string, almacenado: string): boolean {
    const [salt, hash] = almacenado.split(':');
    if (!salt || !hash) return false;
    const calculado = scryptSync(password, salt, 64);
    const esperado = Buffer.from(hash, 'hex');
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  }

  private firmar(contenido: string): string {
    return createHmac('sha256', this.secret).update(contenido).digest('base64url');
  }

  async login(email: string, password: string) {
    const [usuario] = await this.dataSource.query(
      'SELECT id, nombre, email, rol, plan, password_hash FROM usuarios WHERE LOWER(email) = LOWER($1) AND activo = true',
      [email ?? ''],
    );
    if (!usuario || !this.verificarPassword(password ?? '', usuario.password_hash)) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    return this.crearSesion({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, plan: usuario.plan === 'pro' ? 'pro' : 'basico' });
  }

  private crearSesion(sesion: UsuarioSesion) {
    const expira = Date.now() + SESION_HORAS * 3600000;
    const payload = b64url(JSON.stringify({ ...sesion, exp: expira }));
    return { token: `${payload}.${this.firmar(payload)}`, usuario: sesion, expira: new Date(expira).toISOString() };
  }

  // Cambia el plan del usuario y emite una sesión nueva con el plan actualizado.
  async cambiarPlan(usuario: UsuarioSesion, plan: string) {
    if (plan !== 'basico' && plan !== 'pro') throw new BadRequestException("El plan debe ser 'basico' o 'pro'.");
    await this.dataSource.query('UPDATE usuarios SET plan = $1 WHERE id = $2', [plan, usuario.id]);
    return this.crearSesion({ ...usuario, plan });
  }

  // Valida la firma y la vigencia del token; devuelve el usuario de la sesión.
  verificarToken(token: string): UsuarioSesion {
    const [payload, firma] = (token ?? '').split('.');
    if (!payload || !firma) throw new UnauthorizedException('Sesión inválida.');
    const esperada = Buffer.from(this.firmar(payload));
    const recibida = Buffer.from(firma);
    if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
      throw new UnauthorizedException('Sesión inválida.');
    }
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof datos.exp !== 'number' || datos.exp < Date.now()) throw new UnauthorizedException('La sesión expiró. Inicia sesión de nuevo.');
    return { id: datos.id, nombre: datos.nombre, email: datos.email, rol: datos.rol, plan: datos.plan === 'pro' ? 'pro' : 'basico' };
  }
}
