import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
