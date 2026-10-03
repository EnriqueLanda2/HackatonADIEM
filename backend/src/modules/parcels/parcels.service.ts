import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstalacionRiego, Parcela } from '../../common/entities/parcela.entity';
import { Sensor } from '../../common/entities/sensor.entity';

export interface CreateParcelaDto extends Partial<Parcela> {
  sensores_config?: {
    humedad_suelo?: boolean;
    humedad_suelo_valor?: number;
    humedad_ambiental?: boolean;
    humedad_ambiental_valor?: number;
    temperatura?: boolean;
    temperatura_valor?: number;
    ph_suelo?: boolean;
    ph_suelo_valor?: number;
  };
}

@Injectable()
export class ParcelsService implements OnModuleInit {
  constructor(
    @InjectRepository(Parcela)
    private parcelsRepository: Repository<Parcela>,
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
  ) {}

  // El esquema lo administra init.sql; esta columna se agrega en bases ya creadas.
  async onModuleInit() {
    await this.parcelsRepository.query('ALTER TABLE parcelas ADD COLUMN IF NOT EXISTS metodo_riego VARCHAR(20)');
    await this.parcelsRepository.query('ALTER TABLE parcelas ADD COLUMN IF NOT EXISTS instalacion_riego JSONB');
    await this.parcelsRepository.query('ALTER TABLE parcelas ADD COLUMN IF NOT EXISTS instalaciones_riego JSONB');
    // Una parcela puede tener goteo y aspersión: la instalación única anterior pasa a la lista.
    await this.parcelsRepository.query(
      `UPDATE parcelas SET instalaciones_riego = jsonb_build_array(instalacion_riego)
       WHERE instalaciones_riego IS NULL AND instalacion_riego IS NOT NULL`,
    );
  }

  private validarMetodoRiego(metodo: unknown) {
    if (metodo != null && metodo !== 'goteo' && metodo !== 'microaspersion' && metodo !== 'aspersion_presurizada' && metodo !== 'ambos') {
      throw new BadRequestException("metodo_riego debe ser 'goteo', 'microaspersion', 'aspersion_presurizada' o 'ambos'.");
    }
  }

  private validarInstalaciones(instalaciones: InstalacionRiego[] | null | undefined) {
    if (instalaciones == null) return;
    if (!Array.isArray(instalaciones)) throw new BadRequestException('instalaciones_riego debe ser una lista.');
    const metodos = new Set<string>();
    for (const instalacion of instalaciones) {
      if (instalacion.estado !== 'pendiente' && instalacion.estado !== 'instalada') {
        throw new BadRequestException("Cada instalación debe tener estado 'pendiente' o 'instalada'.");
      }
      if (instalacion.metodo !== 'goteo' && instalacion.metodo !== 'microaspersion' && instalacion.metodo !== 'aspersion_presurizada') {
        throw new BadRequestException("Cada instalación debe ser de 'goteo', 'microaspersion' o 'aspersion_presurizada'.");
      }
      if (metodos.has(instalacion.metodo)) {
        throw new BadRequestException(`La parcela ya tiene una instalación de ${instalacion.metodo}.`);
      }
      metodos.add(instalacion.metodo);
      if (!(Number(instalacion.metros_tuberia) >= 0) || !(Number(instalacion.emisores) >= 0)) {
        throw new BadRequestException('metros_tuberia y emisores deben ser números positivos.');
      }
    }
  }

  findAll(): Promise<Parcela[]> {
    return this.parcelsRepository.find({ relations: ['cultivo', 'sensores'] });
  }

  findOne(id: string): Promise<Parcela | null> {
    return this.parcelsRepository.findOne({ where: { id }, relations: ['cultivo', 'sensores'] });
  }

  async create(parcelData: CreateParcelaDto): Promise<Parcela> {
    this.validarMetodoRiego(parcelData.metodo_riego);
    this.validarInstalaciones(parcelData.instalaciones_riego);
    const { sensores_config, ...data } = parcelData;
    const parcel = this.parcelsRepository.create({
      ...data,
      tiene_cultivo: data.tiene_cultivo ?? !!data.cultivo_id,
    });
    const savedParcel = await this.parcelsRepository.save(parcel);

    if (sensores_config) {
      const sensorsToCreate: Sensor[] = [];
      const now = new Date();

      if (sensores_config.humedad_suelo) {
        sensorsToCreate.push(
          this.sensorRepository.create({
            parcela_id: savedParcel.id,
            tipo: 'humedad_suelo',
            modelo: 'Capacitivo V1.2',
            unidad: '%',
            ultimo_valor: sensores_config.humedad_suelo_valor ?? 60,
            ultima_lectura: now,
            activo: true,
          }),
        );
      }

      if (sensores_config.humedad_ambiental) {
        sensorsToCreate.push(
          this.sensorRepository.create({
            parcela_id: savedParcel.id,
            tipo: 'humedad_ambiental',
            modelo: 'DHT22 / SHT31',
            unidad: '%',
            ultimo_valor: sensores_config.humedad_ambiental_valor ?? 65,
            ultima_lectura: now,
            activo: true,
          }),
        );
      }

      if (sensores_config.temperatura) {
        sensorsToCreate.push(
          this.sensorRepository.create({
            parcela_id: savedParcel.id,
            tipo: 'temperatura',
            modelo: 'DHT22 / SHT31',
            unidad: '°C',
            ultimo_valor: sensores_config.temperatura_valor ?? 26,
            ultima_lectura: now,
            activo: true,
          }),
        );
      }

      if (sensores_config.ph_suelo) {
        sensorsToCreate.push(
          this.sensorRepository.create({
            parcela_id: savedParcel.id,
            tipo: 'ph_suelo',
            modelo: 'Sonda pH E-201-C',
            unidad: 'pH',
            valor_minimo: 0,
            valor_maximo: 14,
            ultimo_valor: sensores_config.ph_suelo_valor ?? 6.8,
            ultima_lectura: now,
            activo: true,
          }),
        );
      }

      if (sensorsToCreate.length > 0) {
        await this.sensorRepository.save(sensorsToCreate);
      }
    }

    return this.findOne(savedParcel.id) as Promise<Parcela>;
  }

  async update(id: string, parcelData: Partial<Parcela>): Promise<Parcela> {
    this.validarMetodoRiego(parcelData.metodo_riego);
    this.validarInstalaciones(parcelData.instalaciones_riego);
    await this.parcelsRepository.update(id, parcelData);
    return this.findOne(id) as Promise<Parcela>;
  }

  async remove(id: string): Promise<void> {
    await this.parcelsRepository.delete(id);
  }
}
