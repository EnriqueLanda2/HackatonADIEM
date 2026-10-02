import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
