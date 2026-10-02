import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
