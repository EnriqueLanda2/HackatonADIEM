import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from './roles.guard';
import { AuthService, UsuarioSesion } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión (técnico o productor)' })
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body?.email, body?.password);
  }

  @Get('me')
  @ApiOperation({ summary: 'Usuario de la sesión actual' })
  me(@Headers('authorization') authorization = '') {
    return this.auth.verificarToken(authorization.replace(/^Bearer\s+/i, ''));
  }

  @Post('plan')
  @UseGuards(RolesGuard)
  @Roles('tecnico', 'productor')
  @ApiOperation({ summary: "Cambiar la suscripción ('basico' sin dron o 'pro' con dron); devuelve la sesión actualizada" })
  cambiarPlan(@Body() body: { plan: string }, @Req() req: { usuario: UsuarioSesion }) {
    return this.auth.cambiarPlan(req.usuario, body?.plan);
  }
}
