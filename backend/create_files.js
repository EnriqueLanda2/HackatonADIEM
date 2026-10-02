const fs = require('fs');
const path = require('path');

const BASE_DIR = '/Users/ricardomedina/Desktop/kik/HackatonADIEM/backend';

const files = {
  // 1. src/main.ts
  'src/main.ts': `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Sistema de Riego Inteligente API')
    .setDescription('API for Smart Irrigation System - Morelos')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3001);
}
bootstrap();
`,

  // 2. src/app.module.ts
  'src/app.module.ts': `import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './database/database.config';

import { CropsModule } from './modules/crops/crops.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { SensorsModule } from './modules/sensors/sensors.module';
import { ValvesModule } from './modules/valves/valves.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { IrrigationModule } from './modules/irrigation/irrigation.module';
import { WeatherModule } from './modules/weather/weather.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(databaseConfig),
    CropsModule,
    ParcelsModule,
    SensorsModule,
    ValvesModule,
    AlertsModule,
    IrrigationModule,
    WeatherModule,
    DashboardModule,
  ],
})
export class AppModule {}
`,

  // 3. src/database/database.config.ts
  'src/database/database.config.ts': `import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'riego_admin',
  password: process.env.DB_PASSWORD || 'morelos2024',
  database: process.env.DB_DATABASE || 'riego_inteligente',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // Schema is managed by init.sql
};
`,

  // 4. Entities
  'src/common/entities/cultivo.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cultivos')
export class Cultivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ length: 150, nullable: true })
  nombre_cientifico: string;

  @Column('decimal', { precision: 5, scale: 2 })
  humedad_minima: number;

  @Column('decimal', { precision: 5, scale: 2 })
  humedad_optima: number;

  @Column('decimal', { precision: 5, scale: 2 })
  humedad_maxima: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temp_minima: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temp_optima: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temp_maxima: number;

  @Column('decimal', { precision: 5, scale: 2, default: 80.0 })
  hr_alerta_hongos: number;

  @Column('int', { default: 24 })
  frecuencia_riego_horas: number;

  @Column('int', { default: 30 })
  duracion_riego_minutos: number;

  @Column({ length: 50, default: 'goteo' })
  tipo_riego: string;

  @Column('text', { nullable: true })
  descripcion: string;

  @Column({ length: 50, nullable: true })
  icono: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
`,

  'src/common/entities/parcela.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Cultivo } from './cultivo.entity';

@Entity('parcelas')
export class Parcela {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @ManyToOne(() => Cultivo)
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo;

  @Column('uuid')
  cultivo_id: string;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitud: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitud: number;

  @Column('decimal', { precision: 7, scale: 2, nullable: true })
  altitud_msnm: number;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  superficie_hectareas: number;

  @Column({ length: 50, nullable: true })
  zona_3d: string;

  @Column({ length: 7, default: '#4CAF50' })
  color_base: string;

  @Column({ default: true })
  activa: boolean;

  @Column({ length: 20, default: 'automatico' })
  modo_operacion: string;

  @Column({ length: 200, nullable: true })
  propietario: string;

  @Column('text', { nullable: true })
  notas: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
`,

  'src/common/entities/sensor.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Parcela } from './parcela.entity';

@Entity('sensores')
export class Sensor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Parcela)
  @JoinColumn({ name: 'parcela_id' })
  parcela: Parcela;

  @Column('uuid', { nullable: true })
  parcela_id: string;

  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 100, nullable: true })
  modelo: string;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  posicion_x: number;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  posicion_y: number;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  posicion_z: number;

  @Column({ default: true })
  activo: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  ultimo_valor: number;

  @Column('timestamp with time zone', { nullable: true })
  ultima_lectura: Date;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  valor_minimo: number;

  @Column('decimal', { precision: 10, scale: 2, default: 100 })
  valor_maximo: number;

  @Column({ length: 20, default: '%' })
  unidad: string;

  @Column({ length: 100, nullable: true })
  serial_hardware: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
`,

  'src/common/entities/lectura.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lecturas')
export class Lectura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sensor_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  valor: number;

  @Column({ length: 20, default: '%' })
  unidad: string;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ length: 30, default: 'sensor' })
  fuente: string;

  @Column({ default: true })
  es_valido: boolean;
}
`,

  'src/common/entities/tanque-agua.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tanques_agua')
export class TanqueAgua {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 50, default: 'cisterna' })
  tipo: string;

  @Column('decimal', { precision: 12, scale: 2 })
  capacidad_litros: number;

  @Column('decimal', { precision: 5, scale: 2, default: 100 })
  nivel_actual_porcentaje: number;

  @Column('decimal', { precision: 5, scale: 2, default: 20 })
  nivel_critico_porcentaje: number;

  @Column('decimal', { precision: 5, scale: 2, default: 35 })
  nivel_alerta_porcentaje: number;

  @Column('uuid', { nullable: true })
  sensor_id: string;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitud: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitud: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
`,

  'src/common/entities/valvula.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('valvulas')
export class Valvula {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  parcela_id: string;

  @Column('uuid', { nullable: true })
  tanque_id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  posicion_x: number;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  posicion_y: number;

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  posicion_z: number;

  @Column({ length: 20, default: 'cerrada' })
  estado: string;

  @Column({ length: 20, default: 'automatico' })
  modo: string;

  @Column('int', { nullable: true })
  pin_rele: number;

  @Column({ length: 10, default: '12V' })
  voltaje: string;

  @Column('timestamp with time zone', { nullable: true })
  ultima_apertura: Date;

  @Column('timestamp with time zone', { nullable: true })
  ultimo_cierre: Date;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
`,

  'src/common/entities/evento-riego.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('eventos_riego')
export class EventoRiego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  parcela_id: string;

  @Column('uuid')
  valvula_id: string;

  @Column({ length: 30 })
  tipo: string;

  @Column({ length: 20 })
  accion: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  humedad_suelo_al_evento: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  nivel_tanque_al_evento: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temperatura_al_evento: number;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  inicio: Date;

  @Column('timestamp with time zone', { nullable: true })
  fin: Date;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  duracion_minutos: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  litros_estimados: number;

  @Column('text', { nullable: true })
  razon: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
`,

  'src/common/entities/alerta.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('alertas')
export class Alerta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  parcela_id: string;

  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 20, default: 'media' })
  severidad: string;

  @Column({ length: 200 })
  titulo: string;

  @Column('text')
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @Column({ default: true })
  activa: boolean;

  @Column('jsonb', { nullable: true })
  datos_contexto: any;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column('timestamp with time zone', { nullable: true })
  resuelta_at: Date;
}
`,

  'src/common/entities/configuracion-clima.entity.ts': `import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('configuracion_clima')
export class ConfiguracionClima {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  pronostico_lluvia_12h: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  probabilidad_lluvia: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  temperatura_exterior: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  humedad_relativa_exterior: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  velocidad_viento: number;

  @Column({ length: 100, nullable: true })
  fuente_api: string;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  consultado_at: Date;

  @Column('jsonb', { nullable: true })
  datos_raw: any;
}
`,

  // 5. Crops
  'src/modules/crops/crops.module.ts': `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';
import { Cultivo } from '../../common/entities/cultivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cultivo])],
  controllers: [CropsController],
  providers: [CropsService],
})
export class CropsModule {}
`,
  'src/modules/crops/crops.service.ts': `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cultivo } from '../../common/entities/cultivo.entity';

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(Cultivo)
    private cropsRepository: Repository<Cultivo>,
  ) {}

  findAll(): Promise<Cultivo[]> {
    return this.cropsRepository.find();
  }

  findOne(id: string): Promise<Cultivo | null> {
    return this.cropsRepository.findOneBy({ id });
  }

  async create(cropData: Partial<Cultivo>): Promise<Cultivo> {
    const crop = this.cropsRepository.create(cropData);
    return this.cropsRepository.save(crop);
  }

  async update(id: string, cropData: Partial<Cultivo>): Promise<Cultivo> {
    await this.cropsRepository.update(id, cropData);
    return this.findOne(id) as Promise<Cultivo>;
  }

  async remove(id: string): Promise<void> {
    await this.cropsRepository.delete(id);
  }
}
`,
  'src/modules/crops/crops.controller.ts': `import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
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
`,

  // 6. Parcels
  'src/modules/parcels/parcels.module.ts': `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';
import { Parcela } from '../../common/entities/parcela.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parcela])],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService]
})
export class ParcelsModule {}
`,
  'src/modules/parcels/parcels.service.ts': `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcela } from '../../common/entities/parcela.entity';

@Injectable()
export class ParcelsService {
  constructor(
    @InjectRepository(Parcela)
    private parcelsRepository: Repository<Parcela>,
  ) {}

  findAll(): Promise<Parcela[]> {
    return this.parcelsRepository.find({ relations: ['cultivo'] });
  }

  findOne(id: string): Promise<Parcela | null> {
    return this.parcelsRepository.findOne({ where: { id }, relations: ['cultivo'] });
  }

  async create(parcelData: Partial<Parcela>): Promise<Parcela> {
    const parcel = this.parcelsRepository.create(parcelData);
    return this.parcelsRepository.save(parcel);
  }

  async update(id: string, parcelData: Partial<Parcela>): Promise<Parcela> {
    await this.parcelsRepository.update(id, parcelData);
    return this.findOne(id) as Promise<Parcela>;
  }

  async remove(id: string): Promise<void> {
    await this.parcelsRepository.delete(id);
  }
}
`,
  'src/modules/parcels/parcels.controller.ts': `import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
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
    return this.parelsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete parcel' })
  remove(@Param('id') id: string) {
    return this.parcelsService.remove(id);
  }
}
`,

  // 7. Sensors & Gateway
  'src/modules/sensors/sensors.module.ts': `import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { Sensor } from '../../common/entities/sensor.entity';
import { Lectura } from '../../common/entities/lectura.entity';
import { SensorsGateway } from './sensors.gateway';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor, Lectura]),
    forwardRef(() => AlertsModule)
  ],
  controllers: [SensorsController],
  providers: [SensorsService, SensorsGateway],
  exports: [SensorsService, SensorsGateway]
})
export class SensorsModule {}
`,
  'src/modules/sensors/sensors.service.ts': `import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from '../../common/entities/sensor.entity';
import { Lectura } from '../../common/entities/lectura.entity';
import { SensorsGateway } from './sensors.gateway';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(Sensor) private sensorRepo: Repository<Sensor>,
    @InjectRepository(Lectura) private lecturaRepo: Repository<Lectura>,
    private gateway: SensorsGateway,
    @Inject(forwardRef(() => AlertsService)) private alertsService: AlertsService
  ) {}

  findAll() {
    return this.sensorRepo.find();
  }

  async getLatestReadings() {
    const sensors = await this.sensorRepo.find();
    return sensors.map(s => ({ id: s.id, type: s.tipo, value: s.ultimo_valor, timestamp: s.ultima_lectura }));
  }

  async getReadingsBySensor(sensorId: string) {
    return this.lecturaRepo.find({
      where: { sensor_id: sensorId },
      order: { timestamp: 'DESC' },
      take: 100
    });
  }

  async saveReading(sensorId: string, valor: number) {
    let sensor;
    try {
      sensor = await this.sensorRepo.findOneBy({ id: sensorId });
    } catch(e) {}
    if (!sensor) return null;

    const reading = this.lecturaRepo.create({ sensor_id: sensorId, valor, unidad: sensor.unidad });
    await this.lecturaRepo.save(reading);

    sensor.ultimo_valor = valor;
    sensor.ultima_lectura = new Date();
    await this.sensorRepo.save(sensor);

    this.gateway.emitSensorUpdate({ sensorId, valor, timestamp: sensor.ultima_lectura });
    
    // Check for alerts based on new readings
    if (sensor.tipo === 'humedad_ambiental' && valor > 80) {
      await this.alertsService.generateAlert('prevencion_organica', sensor.parcela_id, { valor_actual: valor });
    }
    
    return reading;
  }

  async saveBulkReadings(data: any) {
    // Map keys to sensors dynamically or fallback to simple assignment.
    // E.g. data = { humedad_cana: 45, humedad_tomate: 60 ... }
    // This is a mockup for mapping arduino data to DB sensors
    const results = [];
    const sensors = await this.sensorRepo.find();
    
    for (const [key, val] of Object.entries(data)) {
       // simple match: if key contains 'cana' and sensor is in parcela with cana...
       // For hackathon, just save to a matched sensor by type or create reading
       const sensor = sensors.find(s => s.tipo.includes(key.split('_')[0]) || key.includes(s.tipo));
       if (sensor) {
         results.push(await this.saveReading(sensor.id, Number(val)));
       }
    }
    return { success: true, count: results.length, data: results };
  }
}
`,
  'src/modules/sensors/sensors.controller.ts': `import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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
`,
  'src/modules/sensors/sensors.gateway.ts': `import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class SensorsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  emitSensorUpdate(data: any) {
    this.server.emit('sensor-update', data);
  }

  emitValveUpdate(data: any) {
    this.server.emit('valve-update', data);
  }

  emitAlert(data: any) {
    this.server.emit('alert', data);
  }
}
`,

  // 8. Valves
  'src/modules/valves/valves.module.ts': `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValvesController } from './valves.controller';
import { ValvesService } from './valves.service';
import { Valvula } from '../../common/entities/valvula.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [TypeOrmModule.forFeature([Valvula, EventoRiego]), SensorsModule],
  controllers: [ValvesController],
  providers: [ValvesService],
  exports: [ValvesService]
})
export class ValvesModule {}
`,
  'src/modules/valves/valves.service.ts': `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Valvula } from '../../common/entities/valvula.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { SensorsGateway } from '../sensors/sensors.gateway';

@Injectable()
export class ValvesService {
  constructor(
    @InjectRepository(Valvula) private valveRepo: Repository<Valvula>,
    @InjectRepository(EventoRiego) private eventoRepo: Repository<EventoRiego>,
    private gateway: SensorsGateway
  ) {}

  findAll() {
    return this.valveRepo.find();
  }

  async toggleValve(id: string, estado: 'abierta' | 'cerrada', razon: string = 'manual') {
    const valve = await this.valveRepo.findOneBy({ id });
    if (!valve) return null;

    valve.estado = estado;
    if (estado === 'abierta') {
      valve.ultima_apertura = new Date();
    } else {
      valve.ultimo_cierre = new Date();
    }
    
    await this.valveRepo.save(valve);
    
    // Log event
    const evento = this.eventoRepo.create({
      valvula_id: valve.id,
      parcela_id: valve.parcela_id,
      tipo: valve.modo,
      accion: estado === 'abierta' ? 'apertura' : 'cierre',
      razon: razon
    });
    await this.eventoRepo.save(evento);

    this.gateway.emitValveUpdate({ id: valve.id, estado: valve.estado });
    return valve;
  }

  async setMode(id: string, modo: 'automatico' | 'manual') {
    const valve = await this.valveRepo.findOneBy({ id });
    if (!valve) return null;
    valve.modo = modo;
    await this.valveRepo.save(valve);
    this.gateway.emitValveUpdate({ id: valve.id, modo: valve.modo });
    return valve;
  }
}
`,
  'src/modules/valves/valves.controller.ts': `import { Controller, Get, Post, Param, Body } from '@nestjs/common';
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
`,

  // 9. Alerts
  'src/modules/alerts/alerts.module.ts': `import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alerta } from '../../common/entities/alerta.entity';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alerta]),
    forwardRef(() => SensorsModule)
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService]
})
export class AlertsModule {}
`,
  'src/modules/alerts/alerts.service.ts': `import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alerta } from '../../common/entities/alerta.entity';
import { SensorsGateway } from '../sensors/sensors.gateway';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alerta) private alertRepo: Repository<Alerta>,
    @Inject(forwardRef(() => SensorsGateway)) private gateway: SensorsGateway
  ) {}

  findAllActive() {
    return this.alertRepo.find({ where: { activa: true }, order: { created_at: 'DESC' } });
  }

  async markAsRead(id: string) {
    const alert = await this.alertRepo.findOneBy({ id });
    if (!alert) return null;
    alert.leida = true;
    alert.activa = false;
    alert.resuelta_at = new Date();
    await this.alertRepo.save(alert);
    return alert;
  }

  async generateAlert(tipo: string, parcela_id: string, contexto: any) {
    // Check if similar active alert already exists to prevent spam
    const existing = await this.alertRepo.findOne({ where: { tipo, parcela_id, activa: true } });
    if (existing) return existing;

    let titulo = 'Alerta del Sistema';
    let mensaje = '';
    let severidad = 'media';

    switch (tipo) {
      case 'prevencion_organica':
        titulo = 'Riesgo de Hongos (Humedad Ambiental Alta)';
        mensaje = 'Humedad ambiental alta prolongada. Se recomienda aplicar repelente orgánico (estiércol y resina de árbol).';
        severidad = 'media';
        break;
      case 'nivel_reserva':
        titulo = 'Nivel Crítico de Reserva de Agua';
        mensaje = 'El tanque está por debajo del 20%. Riegos no críticos suspendidos.';
        severidad = 'critica';
        break;
      case 'humedad_critica':
        titulo = 'Humedad de Suelo Crítica';
        mensaje = 'Niveles de humedad peligrosamente bajos para el cultivo.';
        severidad = 'alta';
        break;
    }

    const alert = this.alertRepo.create({ tipo, parcela_id, titulo, mensaje, severidad, datos_contexto: contexto });
    await this.alertRepo.save(alert);
    this.gateway.emitAlert(alert);
    return alert;
  }
}
`,
  'src/modules/alerts/alerts.controller.ts': `import { Controller, Get, Post, Param } from '@nestjs/common';
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
`,

  // 10. Irrigation (Decision Engine)
  'src/modules/irrigation/irrigation.module.ts': `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IrrigationService } from './irrigation.service';
import { ParcelsModule } from '../parcels/parcels.module';
import { ValvesModule } from '../valves/valves.module';
import { WeatherModule } from '../weather/weather.module';
import { SensorsModule } from '../sensors/sensors.module';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Sensor } from '../../common/entities/sensor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TanqueAgua, Sensor]),
    ParcelsModule,
    ValvesModule,
    WeatherModule,
    SensorsModule
  ],
  providers: [IrrigationService],
})
export class IrrigationModule {}
`,
  'src/modules/irrigation/irrigation.service.ts': `import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParcelsService } from '../parcels/parcels.service';
import { ValvesService } from '../valves/valves.service';
import { WeatherService } from '../weather/weather.service';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Sensor } from '../../common/entities/sensor.entity';

@Injectable()
export class IrrigationService {
  private readonly logger = new Logger(IrrigationService.name);

  constructor(
    private parcelsService: ParcelsService,
    private valvesService: ValvesService,
    private weatherService: WeatherService,
    @InjectRepository(TanqueAgua) private tanqueRepo: Repository<TanqueAgua>,
    @InjectRepository(Sensor) private sensorRepo: Repository<Sensor>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    this.logger.debug('Running irrigation decision engine...');
    
    // Fallback logic for demo
    try {
      const forecast = await this.weatherService.getForecast();
      const rainExpected = forecast.probabilidad_lluvia > 50;

      const tanques = await this.tanqueRepo.find();
      const tanqueP = tanques.length > 0 ? tanques[0] : null;
      const waterOk = tanqueP ? tanqueP.nivel_actual_porcentaje > tanqueP.nivel_critico_porcentaje : true;

      const parcels = await this.parcelsService.findAll();
      const valves = await this.valvesService.findAll();

      for (const parcel of parcels) {
        if (!parcel.activa || parcel.modo_operacion !== 'automatico') continue;

        const crop = parcel.cultivo;
        if (!crop) continue;

        const soilSensors = await this.sensorRepo.find({ where: { parcela_id: parcel.id, tipo: 'humedad_suelo' } });
        if (soilSensors.length === 0) continue;

        const avgMoisture = soilSensors.reduce((acc, s) => acc + (s.ultimo_valor || 0), 0) / soilSensors.length;

        const parcelValve = valves.find(v => v.parcela_id === parcel.id);
        if (!parcelValve || parcelValve.modo !== 'automatico') continue;

        if (avgMoisture < crop.humedad_minima) {
          if (!rainExpected && waterOk && parcelValve.estado === 'cerrada') {
            this.logger.log(\`Opening valve \${parcelValve.id} for parcel \${parcel.nombre}\`);
            await this.valvesService.toggleValve(parcelValve.id, 'abierta', 'decision_motor_auto');
          }
        } else if (avgMoisture >= crop.humedad_optima) {
          if (parcelValve.estado === 'abierta') {
            this.logger.log(\`Closing valve \${parcelValve.id} for parcel \${parcel.nombre}\`);
            await this.valvesService.toggleValve(parcelValve.id, 'cerrada', 'decision_motor_auto');
          }
        }
      }
    } catch (e) {
      this.logger.error('Error in decision engine', e);
    }
  }
}
`,

  // 11. Weather
  'src/modules/weather/weather.module.ts': `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherService } from './weather.service';
import { ConfiguracionClima } from '../../common/entities/configuracion-clima.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionClima])],
  providers: [WeatherService],
  exports: [WeatherService]
})
export class WeatherModule {}
`,
  'src/modules/weather/weather.service.ts': `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionClima } from '../../common/entities/configuracion-clima.entity';

@Injectable()
export class WeatherService {
  constructor(
    @InjectRepository(ConfiguracionClima) private configRepo: Repository<ConfiguracionClima>
  ) {}

  async getForecast() {
    let latest = await this.configRepo.findOne({
      where: {},
      order: { consultado_at: 'DESC' }
    });

    if (!latest || Date.now() - latest.consultado_at.getTime() > 3600000) {
       // Mock for Morelos if no api key or out of date
       const mockProb = Math.random() * 100;
       latest = this.configRepo.create({
         pronostico_lluvia_12h: mockProb > 60,
         probabilidad_lluvia: mockProb,
         temperatura_exterior: 25 + Math.random() * 10,
         humedad_relativa_exterior: 40 + Math.random() * 40,
         fuente_api: 'mock_openweathermap',
         datos_raw: { mock: true }
       });
       await this.configRepo.save(latest);
    }

    return latest;
  }
}
`,

  // 13. Dashboard
  'src/modules/dashboard/dashboard.module.ts': `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Parcela } from '../../common/entities/parcela.entity';
import { Valvula } from '../../common/entities/valvula.entity';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Alerta } from '../../common/entities/alerta.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { WeatherModule } from '../weather/weather.module';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcela, Valvula, TanqueAgua, Alerta, EventoRiego]),
    WeatherModule,
    SensorsModule
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
`,
  'src/modules/dashboard/dashboard.service.ts': `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcela } from '../../common/entities/parcela.entity';
import { Valvula } from '../../common/entities/valvula.entity';
import { TanqueAgua } from '../../common/entities/tanque-agua.entity';
import { Alerta } from '../../common/entities/alerta.entity';
import { EventoRiego } from '../../common/entities/evento-riego.entity';
import { WeatherService } from '../weather/weather.service';
import { SensorsService } from '../sensors/sensors.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Parcela) private parcelaRepo: Repository<Parcela>,
    @InjectRepository(Valvula) private valvulaRepo: Repository<Valvula>,
    @InjectRepository(TanqueAgua) private tanqueRepo: Repository<TanqueAgua>,
    @InjectRepository(Alerta) private alertaRepo: Repository<Alerta>,
    @InjectRepository(EventoRiego) private eventoRepo: Repository<EventoRiego>,
    private weatherService: WeatherService,
    private sensorsService: SensorsService
  ) {}

  async getSummary() {
    const parcelas = await this.parcelaRepo.find({ relations: ['cultivo'] });
    const valvulas = await this.valvulaRepo.find();
    const tanques = await this.tanqueRepo.find();
    const alertas = await this.alertaRepo.count({ where: { activa: true } });
    const recentEvents = await this.eventoRepo.find({ order: { inicio: 'DESC' }, take: 10 });
    const forecast = await this.weatherService.getForecast();
    const sensorsData = await this.sensorsService.getLatestReadings();

    return {
      parcelas: parcelas.map(p => ({
        ...p,
        sensores: sensorsData.filter(s => s.id && true) // Simplification for dashboard mock
      })),
      valvulas,
      tanques,
      activeAlertsCount: alertas,
      forecast,
      recentEvents
    };
  }
}
`,
  'src/modules/dashboard/dashboard.controller.ts': `import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated dashboard data' })
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
`
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(BASE_DIR, relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  console.log('Created:', fullPath);
}
