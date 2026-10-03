import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, Plan, Rol } from './auth.service';

const ROLES_KEY = 'roles';
const PLAN_KEY = 'plan';

// Restringe una ruta a usuarios con el plan indicado (p. ej. el dron es solo del plan Pro).
export const RequierePlan = (plan: Plan) => SetMetadata(PLAN_KEY, plan);

// Restringe una ruta a los roles indicados; exige una sesión válida.
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const plan = this.reflector.getAllAndOverride<Plan>(PLAN_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length && !plan) return true;

    const request = context.switchToHttp().getRequest();
    const [tipo, token] = (request.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Inicia sesión para realizar esta acción.');

    const usuario = this.auth.verificarToken(token);
    if (plan && usuario.plan !== plan) {
      throw new ForbiddenException('Esta función requiere el plan Pro.');
    }
    if (roles?.length && !roles.includes(usuario.rol)) {
      throw new ForbiddenException(
        roles.length === 1 && roles[0] === 'tecnico' ? 'Solo el técnico puede realizar esta acción.' : 'Tu rol no tiene permiso para esta acción.',
      );
    }
    request.usuario = usuario;
    return true;
  }
}
