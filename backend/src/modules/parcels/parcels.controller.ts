import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UsuarioSesion } from '../auth/auth.service';

// El productor administra su parcela, lo que siembra y con qué sistema instalado riega;
// instalar tuberías y los datos físicos son del técnico.
const CAMPOS_PRODUCTOR = new Set(['nombre', 'activa', 'tiene_cultivo', 'cultivo_id', 'notas', 'estado_descanso', 'metodo_riego']);
import { ParcelsService } from './parcels.service';
import { Parcela } from '../../common/entities/parcela.entity';

@ApiTags('parcelas')
@Controller('parcelas')
@UseGuards(RolesGuard)
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get()
  @ApiOperation({ summary: 'List all parcels' })
  findAll() {
    return this.parcelsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get parcel by ID' })
  findOne(@Param('id') id: string) {
    return this.parcelsService.findOne(id);
  }

  @Post()
  @Roles('tecnico')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new parcel' })
  create(@Body() data: Partial<Parcela>) {
    return this.parcelsService.create(data);
  }

  @Put(':id')
  @Roles('tecnico', 'productor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update parcel (productor: sembradío; técnico: todo, incluida la tubería)' })
  update(@Param('id') id: string, @Body() data: Partial<Parcela>, @Req() req: { usuario: UsuarioSesion }) {
    if (req.usuario.rol !== 'tecnico') {
      const restringidos = Object.keys(data ?? {}).filter((campo) => !CAMPOS_PRODUCTOR.has(campo));
      if (restringidos.length) {
        throw new ForbiddenException(`Solo el técnico puede cambiar: ${restringidos.join(', ')}.`);
      }
    }
    return this.parcelsService.update(id, data);
  }

  @Delete(':id')
  @Roles('tecnico')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete parcel' })
  remove(@Param('id') id: string) {
    return this.parcelsService.remove(id);
  }
}
