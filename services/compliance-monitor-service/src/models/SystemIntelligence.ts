import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type IntelligenceMetricType =
  | 'health'
  | 'coverage'
  | 'compliance_exposure'
  | 'drift'
  | 'expansion_opportunity';

export interface SystemIntelligenceAttributes {
  id: string;
  metricType: IntelligenceMetricType;
  score: number;
  details: Record<string, unknown> | null;
  computedBy: string;
  computedAt: Date;
  createdAt?: Date;
}

export interface SystemIntelligenceCreationAttributes extends Optional<
  SystemIntelligenceAttributes,
  'id' | 'details' | 'computedAt' | 'createdAt'
> {}

export class SystemIntelligence
  extends Model<SystemIntelligenceAttributes, SystemIntelligenceCreationAttributes>
  implements SystemIntelligenceAttributes
{
  declare id: string;
  declare metricType: IntelligenceMetricType;
  declare score: number;
  declare details: Record<string, unknown> | null;
  declare computedBy: string;
  declare computedAt: Date;
  declare readonly createdAt: Date;
}

SystemIntelligence.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    metricType: {
      type: DataTypes.ENUM(
        'health',
        'coverage',
        'compliance_exposure',
        'drift',
        'expansion_opportunity',
      ),
      allowNull: false,
      field: 'metric_type',
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    computedBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'computed_by',
    },
    computedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'computed_at',
    },
  },
  {
    sequelize,
    tableName: 'system_intelligence',
    timestamps: true,
    updatedAt: false,
    underscored: false,
    indexes: [
      { fields: ['metric_type'], name: 'idx_intel_metric_type' },
      { fields: ['computed_by'], name: 'idx_intel_computed_by' },
      { fields: ['computed_at'], name: 'idx_intel_computed_at' },
    ],
  },
);

export default SystemIntelligence;
