import { sequelize } from '../config/database';
import { Recommendation } from './Recommendation';
import { ModelRegistry } from './ModelRegistry';
import { UserInteraction } from './UserInteraction';

// Associations
ModelRegistry.hasMany(Recommendation, {
  foreignKey: 'modelId',
  as: 'recommendations',
});

Recommendation.belongsTo(ModelRegistry, {
  foreignKey: 'modelId',
  as: 'model',
});

/**
 * Initialize all models and sync the database.
 * In test mode this creates in-memory SQLite tables.
 */
async function initModels(options?: { force?: boolean }): Promise<void> {
  await sequelize.sync(options);
}

export { sequelize, Recommendation, ModelRegistry, UserInteraction, initModels };
