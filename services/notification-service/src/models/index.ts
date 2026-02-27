import { sequelize } from '../config/database';
import { Notification } from './Notification';
import { Webhook } from './Webhook';
import { WebhookLog } from './WebhookLog';

// Associations
Webhook.hasMany(WebhookLog, { foreignKey: 'webhookId', as: 'logs' });
WebhookLog.belongsTo(Webhook, { foreignKey: 'webhookId', as: 'webhook' });

/**
 * Synchronise all models with the database.
 *
 * In test mode this will create tables in the in-memory SQLite instance.
 * In production/dev this should be paired with migrations.
 */
async function initModels(): Promise<void> {
  await sequelize.sync();
}

export { sequelize, Notification, Webhook, WebhookLog, initModels };
