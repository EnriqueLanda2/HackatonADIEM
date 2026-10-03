import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ParcelsService } from './parcels.service';
import { Parcela } from '../../common/entities/parcela.entity';

@ApiTags('parcelas')
@Controller('parcelas')
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
  @ApiOperation({ summary: 'Create new parcel' })
  create(@Body() data: Partial<Parcela>) {
    return this.parcelsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update parcel' })
  update(@Param('id') id: string, @Body() data: Partial<Parcela>) {
    return this.parcelsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete parcel' })
  remove(@Param('id') id: string) {
    return this.parcelsService.remove(id);
  }
}
