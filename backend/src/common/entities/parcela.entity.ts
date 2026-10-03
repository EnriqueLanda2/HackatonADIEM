import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Cultivo } from './cultivo.entity';
import { Sensor } from './sensor.entity';

export interface InstalacionRiego {
  estado: 'pendiente' | 'instalada';
  metodo: 'goteo' | 'microaspersion' | 'aspersion_presurizada';
  metros_tuberia: number;
  emisores: number;
  fecha?: string;
  tecnico?: string;
  notas?: string;
}

@Entity('parcelas')
export class Parcela {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ default: true })
  tiene_cultivo: boolean;

  @ManyToOne(() => Cultivo, { nullable: true })
  @JoinColumn({ name: 'cultivo_id' })
  cultivo: Cultivo | null;

  @Column('uuid', { nullable: true })
  cultivo_id: string | null;

  @OneToMany(() => Sensor, (sensor) => sensor.parcela)
  sensores: Sensor[];

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

  // Sistema(s) de riego en uso: goteo, aspersión o ambos; null = el recomendado por el cultivo.
  @Column({ type: 'varchar', length: 20, nullable: true })
  metodo_riego: 'goteo' | 'microaspersion' | 'aspersion_presurizada' | 'ambos' | null;

  // Tuberías instaladas por el técnico (una por sistema); null = instalación previa al registro.
  @Column({ type: 'jsonb', nullable: true })
  instalaciones_riego: InstalacionRiego[] | null;

  @Column({ length: 200, nullable: true })
  propietario: string;

  @Column('text', { nullable: true })
  notas: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
