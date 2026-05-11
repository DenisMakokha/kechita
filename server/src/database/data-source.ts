/**
 * TypeORM DataSource for migrations CLI.
 * Used by `npm run migration:generate` / `migration:run` / `migration:revert`.
 *
 * Runtime app uses the TypeOrmModule config in app.module.ts.
 * This file mirrors that config but loads entities via glob so it works at compile-time too.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv();

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
});

export default AppDataSource;
