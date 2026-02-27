import { Sequelize, Options } from 'sequelize';

/**
 * Builds Sequelize configuration from environment variables.
 *
 * - In test mode (NODE_ENV=test): uses SQLite in-memory for fast, isolated tests.
 * - In production/development: uses DATABASE_URL if provided, otherwise
 *   falls back to individual DB_HOST / DB_USER / DB_PASSWORD / DB_NAME vars.
 */
function buildConfig(): Options {
  if (process.env.NODE_ENV === 'test') {
    return {
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
    };
  }

  // Prefer DATABASE_URL (standard for containerized / cloud deployments)
  if (process.env.DATABASE_URL) {
    return {
      dialect: 'postgres',
      logging: false,
    };
  }

  // Individual connection parameters
  return {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agent_foundry_gateway',
    logging: false,
  };
}

const config = buildConfig();

const sequelize =
  process.env.DATABASE_URL && process.env.NODE_ENV !== 'test'
    ? new Sequelize(process.env.DATABASE_URL, config)
    : new Sequelize(config);

export { sequelize };
