import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UsuarioSesion } from '../auth/auth.service';
import { BitacoraService, EntradaBitacoraDto } from './bitacora.service';

@ApiTags('bitacora')
@ApiBearerAuth()
@Controller('bitacora')
@UseGuards(RolesGuard)
@Roles('tecnico', 'productor')
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraService) {}

  @Get()
  @ApiOperation({ summary: 'Bitácora de procesos (más recientes primero)' })
  listar(@Query('limite') limite?: string) {
    return this.bitacora.listar(Number(limite) || 200);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un proceso: tipo de riego y navegador desde donde se hizo' })
  registrar(@Body() body: EntradaBitacoraDto, @Req() req: { usuario: UsuarioSesion; ip?: string }) {
    return this.bitacora.registrar(req.usuario, body ?? {}, req.ip ?? '');
  }
}
