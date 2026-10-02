import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';

@ApiTags('sensors')
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  findAll() { return this.sensorsService.findAll(); }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest reading for all sensors' })
  getLatest() {
    return this.sensorsService.getLatestReadings();
  }

  @Get('readings/:sensorId')
  @ApiOperation({ summary: 'Get readings history' })
  getHistory(@Param('sensorId') sensorId: string) {
    return this.sensorsService.getReadingsBySensor(sensorId);
  }

  @Post('readings')
  @ApiOperation({ summary: 'Receive single sensor reading' })
  receiveReading(@Body() body: { sensorId: string, value: number }) {
    return this.sensorsService.saveReading(body.sensorId, body.value);
  }

  @Post('bulk-readings')
  @ApiOperation({ summary: 'Receive bulk readings' })
  receiveBulk(@Body() data: any) {
    return this.sensorsService.saveBulkReadings(data);
  }
}
