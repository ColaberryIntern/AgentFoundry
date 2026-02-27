import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ApiKeyAttributes {
  id: number;
  userId: number;
  keyHash: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApiKeyCreationAttributes extends Optional<
  ApiKeyAttributes,
  'id' | 'lastUsedAt' | 'expiresAt' | 'isActive' | 'createdAt' | 'updatedAt'
> {}

class ApiKey extends Model<ApiKeyAttributes, ApiKeyCreationAttributes> implements ApiKeyAttributes {
  declare id: number;
  declare userId: number;
  declare keyHash: string;
  declare name: string;
  declare prefix: string;
  declare lastUsedAt: Date | null;
  declare expiresAt: Date | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ApiKey.init(
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
    keyHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'key_hash',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING(8),
      allowNull: false,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
  },
);

export { ApiKey };
