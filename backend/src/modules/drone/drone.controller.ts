import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequierePlan, RolesGuard } from '../auth/roles.guard';
import { DroneService, EscaneoPlagaDto } from './drone.service';

@ApiTags('dron')
@Controller('dron')
@UseGuards(RolesGuard)
@RequierePlan('pro')
export class DroneController {
  constructor(private readonly drone: DroneService) {}

  @Get('escaneos')
  @ApiOperation({ summary: 'Último escaneo de plagas por parcela' })
  listar() {
    return this.drone.listar();
  }

  @Post('escaneos')
  @ApiOperation({ summary: 'El dron reporta si detectó plaga (booleano) al escanear una parcela' })
  registrar(@Body() body: EscaneoPlagaDto) {
    if (!body?.parcela_id || typeof body.plaga_detectada !== 'boolean') {
      throw new BadRequestException('parcela_id y plaga_detectada (boolean) son obligatorios.');
    }
    if (body.confianza != null && (typeof body.confianza !== 'number' || body.confianza < 0 || body.confianza > 1)) {
      throw new BadRequestException('confianza debe ser un número entre 0 y 1.');
    }
    return this.drone.registrarEscaneo(body);
  }
}
