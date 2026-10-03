import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificacionDto, NotificationsService, PushSubscriptionDto } from './notifications.service';

@ApiTags('notificaciones')
@Controller('notificaciones')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Clave pública VAPID para suscribirse a push' })
  publicKey() {
    return { publicKey: this.notifications.getPublicKey() };
  }

  @Post('suscribir')
  @ApiOperation({ summary: 'Registrar la suscripción push de un dispositivo' })
  suscribir(@Body() body: PushSubscriptionDto) {
    if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
      throw new BadRequestException('Suscripción push inválida.');
    }
    return this.notifications.suscribir(body);
  }

  @Post('desuscribir')
  @ApiOperation({ summary: 'Eliminar la suscripción push de un dispositivo' })
  desuscribir(@Body() body: { endpoint: string }) {
    return this.notifications.desuscribir(body?.endpoint ?? '');
  }

  @Post('enviar')
  @ApiOperation({ summary: 'Enviar una notificación push a todos los dispositivos (con anti-repetición por clave)' })
  enviar(@Body() body: NotificacionDto) {
    if (!body?.clave || !body?.titulo || !body?.mensaje) {
      throw new BadRequestException('clave, titulo y mensaje son obligatorios.');
    }
    return this.notifications.enviar(body);
  }

  @Post('prueba')
  @ApiOperation({ summary: 'Enviar una notificación de prueba' })
  prueba() {
    return this.notifications.enviar({
      clave: `prueba-${Date.now()}`,
      titulo: '🌱 agromIA',
      mensaje: 'Las notificaciones push están activas en este dispositivo.',
      tipo: 'prueba',
      severidad: 'baja',
      cooldown_min: 0,
    });
  }
}
