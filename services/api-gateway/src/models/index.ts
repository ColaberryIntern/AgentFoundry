import { sequelize } from '../config/database';
import { SearchHistory } from './SearchHistory';
import { UserEvent } from './UserEvent';
import { Feedback } from './Feedback';

/**
 * Synchronize all models with the database.
 *
 * In test mode this creates tables in the SQLite in-memory database.
 * In production this should be handled by migrations.
 */
async function initModels(): Promise<void> {
  await sequelize.sync();
}

export { sequelize, SearchHistory, UserEvent, Feedback, initModels };
