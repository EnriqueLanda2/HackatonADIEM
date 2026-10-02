import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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
