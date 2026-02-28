import { Sequelize } from 'sequelize';
import logger from './logger';

let sequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    const url =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agent_foundry';
    sequelize = new Sequelize(url, {
      logging: false,
      pool: { max: 5, min: 1, acquire: 30000, idle: 10000 },
    });
  }
  return sequelize;
}

export async function connectDb(): Promise<void> {
  const db = getSequelize();
  await db.authenticate();
  logger.info('Database connected', { job: 'db' });
}

export async function closeDb(): Promise<void> {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
}

/** Run a SELECT and return rows as plain objects. */
export async function queryRows(sql: string, bind?: any[]): Promise<any[]> {
  const db = getSequelize();
  const [rows] = await db.query(sql, bind ? { bind } : undefined);
  return rows as any[];
}

/** Run an INSERT/UPDATE/DELETE. Returns [results, metadata]. */
export async function execSql(sql: string, bind?: any[]): Promise<any[]> {
  const db = getSequelize();
  const [results] = await db.query(sql, bind ? { bind } : undefined);
  return results as any[];
}

/** Convert an integer user ID to a deterministic UUID for tables with UUID user_id columns. */
export function intToUuid(id: number | string): string {
  const padded = String(id).padStart(12, '0');
  return `00000000-0000-4000-8000-${padded}`;
}
