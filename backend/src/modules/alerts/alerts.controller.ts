import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List active alerts' })
  findAll() {
    return this.alertsService.findAllActive();
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  markRead(@Param('id') id: string) {
    return this.alertsService.markAsRead(id);
  }
}
