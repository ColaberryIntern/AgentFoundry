import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserEventAttributes {
  id: string;
  userId: string;
  eventType: string;
  eventData: object | null;
  sessionId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserEventCreationAttributes extends Optional<
  UserEventAttributes,
  'id' | 'eventData' | 'sessionId' | 'createdAt' | 'updatedAt'
> {}

export class UserEvent
  extends Model<UserEventAttributes, UserEventCreationAttributes>
  implements UserEventAttributes
{
  declare id: string;
  declare userId: string;
  declare eventType: string;
  declare eventData: object | null;
  declare sessionId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UserEvent.init(
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
    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'event_type',
    },
    eventData: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      field: 'event_data',
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: 'session_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'user_events',
    timestamps: true,
    underscored: false,
  },
);

export default UserEvent;
