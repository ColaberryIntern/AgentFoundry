import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ConsentRecordAttributes {
  id: number;
  userId: number;
  scope: string;
  granted: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConsentRecordCreationAttributes extends Optional<
  ConsentRecordAttributes,
  'id' | 'ipAddress' | 'userAgent' | 'createdAt' | 'updatedAt'
> {}

class ConsentRecord
  extends Model<ConsentRecordAttributes, ConsentRecordCreationAttributes>
  implements ConsentRecordAttributes
{
  declare id: number;
  declare userId: number;
  declare scope: string;
  declare granted: boolean;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ConsentRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    scope: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_agent',
    },
  },
  {
    sequelize,
    tableName: 'consent_records',
    timestamps: true,
    underscored: true,
  },
);

export { ConsentRecord };
