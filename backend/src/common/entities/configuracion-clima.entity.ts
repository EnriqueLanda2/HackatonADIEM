import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
