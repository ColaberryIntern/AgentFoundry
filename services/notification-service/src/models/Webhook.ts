import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export const VALID_WEBHOOK_EVENTS = [
  'compliance.check.completed',
  'compliance.status.changed',
  'report.generated',
  'regulation.updated',
  'agent.deployed',
  'agent.error',
] as const;

export type WebhookEventType = (typeof VALID_WEBHOOK_EVENTS)[number];

export interface WebhookAttributes {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  description: string | null;
  failureCount: number;
  lastTriggeredAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebhookCreationAttributes extends Optional<
  WebhookAttributes,
  'id' | 'isActive' | 'description' | 'failureCount' | 'lastTriggeredAt' | 'createdAt' | 'updatedAt'
> {}

export class Webhook
  extends Model<WebhookAttributes, WebhookCreationAttributes>
  implements WebhookAttributes
{
  declare id: string;
  declare userId: string;
  declare url: string;
  declare secret: string;
  declare events: string[];
  declare isActive: boolean;
  declare description: string | null;
  declare failureCount: number;
  declare lastTriggeredAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Webhook.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failure_count',
    },
    lastTriggeredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'last_triggered_at',
    },
  },
  {
    sequelize,
    tableName: 'webhooks',
    timestamps: true,
    underscored: false,
  },
);

export default Webhook;
