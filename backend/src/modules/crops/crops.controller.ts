import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CropsService } from './crops.service';
import { Cultivo } from '../../common/entities/cultivo.entity';

@ApiTags('cultivos')
@Controller('cultivos')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Get()
  @ApiOperation({ summary: 'List all crops' })
  findAll() {
    return this.cropsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crop by ID' })
  findOne(@Param('id') id: string) {
    return this.cropsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new crop' })
  create(@Body() cropData: Partial<Cultivo>) {
    return this.cropsService.create(cropData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update crop' })
  update(@Param('id') id: string, @Body() cropData: Partial<Cultivo>) {
    return this.cropsService.update(id, cropData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete crop' })
  remove(@Param('id') id: string) {
    return this.cropsService.remove(id);
  }
}
