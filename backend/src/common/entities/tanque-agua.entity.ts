import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
