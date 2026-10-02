import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('alertas')
export class Alerta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  parcela_id: string;

  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 20, default: 'media' })
  severidad: string;

  @Column({ length: 200 })
  titulo: string;

  @Column('text')
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @Column({ default: true })
  activa: boolean;

  @Column('jsonb', { nullable: true })
  datos_contexto: any;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column('timestamp with time zone', { nullable: true })
  resuelta_at: Date;
}
