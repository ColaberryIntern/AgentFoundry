import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type NotificationType = 'compliance_alert' | 'report_ready' | 'system' | 'role_change';

export interface NotificationAttributes {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationCreationAttributes extends Optional<
  NotificationAttributes,
  'id' | 'isRead' | 'metadata' | 'createdAt' | 'updatedAt'
> {}

export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare id: string;
  declare userId: string;
  declare type: NotificationType;
  declare title: string;
  declare message: string;
  declare isRead: boolean;
  declare metadata: Record<string, unknown> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Notification.init(
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
    type: {
      type: DataTypes.ENUM('compliance_alert', 'report_ready', 'system', 'role_change'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['user_id', 'is_read'], name: 'idx_notif_user_read' },
      { fields: ['createdAt'], name: 'idx_notif_created_at' },
    ],
  },
);

export default Notification;
