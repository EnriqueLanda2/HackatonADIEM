import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'riego_admin',
  password: process.env.DB_PASSWORD || 'morelos2024',
  database: process.env.DB_DATABASE || 'riego_inteligente',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // Schema is managed by init.sql
};
