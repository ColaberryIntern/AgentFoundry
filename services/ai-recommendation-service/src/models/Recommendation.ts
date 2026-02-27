import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type RecommendationType =
  | 'compliance_gap'
  | 'regulatory_prediction'
  | 'optimization'
  | 'risk_alert';
export type RecommendationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationStatus = 'active' | 'accepted' | 'dismissed' | 'expired';

export interface RecommendationAttributes {
  id: string;
  userId: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number;
  severity: RecommendationSeverity;
  category: string | null;
  metadata: Record<string, unknown> | null;
  modelId: string | null;
  modelVersion: string | null;
  status: RecommendationStatus;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationCreationAttributes extends Optional<
  RecommendationAttributes,
  | 'id'
  | 'severity'
  | 'category'
  | 'metadata'
  | 'modelId'
  | 'modelVersion'
  | 'status'
  | 'expiresAt'
  | 'createdAt'
  | 'updatedAt'
> {}

export class Recommendation
  extends Model<RecommendationAttributes, RecommendationCreationAttributes>
  implements RecommendationAttributes
{
  declare id: string;
  declare userId: string;
  declare type: RecommendationType;
  declare title: string;
  declare description: string;
  declare confidence: number;
  declare severity: RecommendationSeverity;
  declare category: string | null;
  declare metadata: Record<string, unknown> | null;
  declare modelId: string | null;
  declare modelVersion: string | null;
  declare status: RecommendationStatus;
  declare expiresAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Recommendation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('compliance_gap', 'regulatory_prediction', 'optimization', 'risk_alert'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    modelId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    modelVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'accepted', 'dismissed', 'expired'),
      defaultValue: 'active',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'recommendations',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id', 'type', 'status'], name: 'idx_rec_user_type_status' },
      { fields: ['created_at'], name: 'idx_rec_created_at' },
    ],
  },
);
