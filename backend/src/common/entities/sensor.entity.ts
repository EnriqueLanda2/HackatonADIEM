import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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
