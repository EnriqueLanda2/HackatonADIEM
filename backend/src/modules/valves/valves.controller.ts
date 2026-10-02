import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ValvesService } from './valves.service';

@ApiTags('valves')
@Controller('valves')
export class ValvesController {
  constructor(private readonly valvesService: ValvesService) {}

  @Get()
  @ApiOperation({ summary: 'List all valves' })
  findAll() {
    return this.valvesService.findAll();
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle valve open/close' })
  toggle(@Param('id') id: string, @Body() body: { estado: 'abierta' | 'cerrada' }) {
    return this.valvesService.toggleValve(id, body.estado);
  }

  @Post(':id/mode')
  @ApiOperation({ summary: 'Change mode (automatico/manual)' })
  setMode(@Param('id') id: string, @Body() body: { modo: 'automatico' | 'manual' }) {
    return this.valvesService.setMode(id, body.modo);
  }
}
