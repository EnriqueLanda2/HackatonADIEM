import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

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
