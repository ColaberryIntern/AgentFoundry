import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferenceAttributes {
  id: number;
  userId: number;
  theme: ThemePreference;
  layoutPreferences: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserPreferenceCreationAttributes extends Optional<
  UserPreferenceAttributes,
  'id' | 'theme' | 'layoutPreferences' | 'createdAt' | 'updatedAt'
> {}

class UserPreference
  extends Model<UserPreferenceAttributes, UserPreferenceCreationAttributes>
  implements UserPreferenceAttributes
{
  declare id: number;
  declare userId: number;
  declare theme: ThemePreference;
  declare layoutPreferences: Record<string, unknown>;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UserPreference.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id',
    },
    theme: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'system',
      validate: {
        isIn: [['light', 'dark', 'system']],
      },
    },
    layoutPreferences: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      field: 'layout_preferences',
    },
  },
  {
    sequelize,
    tableName: 'user_preferences',
    timestamps: true,
    underscored: true,
  },
);

export { UserPreference };
