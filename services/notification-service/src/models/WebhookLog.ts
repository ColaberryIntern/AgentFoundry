import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface WebhookLogAttributes {
  id: string;
  webhookId: string;
  eventType: string;
  payload: object;
  responseStatus: number | null;
  responseBody: string | null;
  success: boolean;
  attempt: number;
  error: string | null;
  duration: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebhookLogCreationAttributes extends Optional<
  WebhookLogAttributes,
  | 'id'
  | 'responseStatus'
  | 'responseBody'
  | 'success'
  | 'attempt'
  | 'error'
  | 'duration'
  | 'createdAt'
  | 'updatedAt'
> {}

export class WebhookLog
  extends Model<WebhookLogAttributes, WebhookLogCreationAttributes>
  implements WebhookLogAttributes
{
  declare id: string;
  declare webhookId: string;
  declare eventType: string;
  declare payload: object;
  declare responseStatus: number | null;
  declare responseBody: string | null;
  declare success: boolean;
  declare attempt: number;
  declare error: string | null;
  declare duration: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WebhookLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    webhookId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'webhook_id',
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'event_type',
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    responseStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      field: 'response_status',
    },
    responseBody: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      field: 'response_body',
    },
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attempt: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'webhook_logs',
    timestamps: true,
    underscored: false,
  },
);

export default WebhookLog;
