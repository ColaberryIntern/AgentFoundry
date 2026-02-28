import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type SettingType = 'toggle' | 'slider' | 'select' | 'number';

export type SettingCategory = 'autonomy' | 'guardrails' | 'scheduling' | 'marketplace';

export interface OrchestratorSettingAttributes {
  id: string;
  settingKey: string;
  settingValue: unknown;
  settingType: SettingType;
  category: SettingCategory;
  label: string;
  description: string | null;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: unknown;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrchestratorSettingCreationAttributes extends Optional<
  OrchestratorSettingAttributes,
  'id' | 'description' | 'minValue' | 'maxValue' | 'updatedBy' | 'createdAt' | 'updatedAt'
> {}

export class OrchestratorSetting
  extends Model<OrchestratorSettingAttributes, OrchestratorSettingCreationAttributes>
  implements OrchestratorSettingAttributes
{
  declare id: string;
  declare settingKey: string;
  declare settingValue: unknown;
  declare settingType: SettingType;
  declare category: SettingCategory;
  declare label: string;
  declare description: string | null;
  declare minValue: number | null;
  declare maxValue: number | null;
  declare defaultValue: unknown;
  declare updatedBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrchestratorSetting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    settingKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'setting_key',
    },
    settingValue: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'setting_value',
    },
    settingType: {
      type: DataTypes.ENUM('toggle', 'slider', 'select', 'number'),
      allowNull: false,
      field: 'setting_type',
    },
    category: {
      type: DataTypes.ENUM('autonomy', 'guardrails', 'scheduling', 'marketplace'),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    minValue: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'min_value',
    },
    maxValue: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'max_value',
    },
    defaultValue: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'default_value',
    },
    updatedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'updated_by',
    },
  },
  {
    sequelize,
    tableName: 'orchestrator_settings',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['setting_key'], unique: true, name: 'idx_settings_key' },
      { fields: ['category'], name: 'idx_settings_category' },
    ],
  },
);

export default OrchestratorSetting;
