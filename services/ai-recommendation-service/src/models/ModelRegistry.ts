import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ModelType =
  | 'random_forest'
  | 'lstm'
  | 'isolation_forest'
  | 'genetic_algorithm'
  | 'arima'
  | 'hierarchical_clustering'
  | 'collaborative_filtering'
  | 'bert';

export type ModelStatus = 'training' | 'ready' | 'deployed' | 'deprecated';

export interface ModelRegistryAttributes {
  id: string;
  name: string;
  version: string;
  type: ModelType;
  status: ModelStatus;
  accuracy: number | null;
  metrics: Record<string, unknown> | null;
  artifactPath: string | null;
  parameters: Record<string, unknown> | null;
  trainingDataInfo: Record<string, unknown> | null;
  deployedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelRegistryCreationAttributes extends Optional<
  ModelRegistryAttributes,
  | 'id'
  | 'status'
  | 'accuracy'
  | 'metrics'
  | 'artifactPath'
  | 'parameters'
  | 'trainingDataInfo'
  | 'deployedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

export class ModelRegistry
  extends Model<ModelRegistryAttributes, ModelRegistryCreationAttributes>
  implements ModelRegistryAttributes
{
  declare id: string;
  declare name: string;
  declare version: string;
  declare type: ModelType;
  declare status: ModelStatus;
  declare accuracy: number | null;
  declare metrics: Record<string, unknown> | null;
  declare artifactPath: string | null;
  declare parameters: Record<string, unknown> | null;
  declare trainingDataInfo: Record<string, unknown> | null;
  declare deployedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ModelRegistry.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'random_forest',
        'lstm',
        'isolation_forest',
        'genetic_algorithm',
        'arima',
        'hierarchical_clustering',
        'collaborative_filtering',
        'bert',
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('training', 'ready', 'deployed', 'deprecated'),
      defaultValue: 'training',
    },
    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    metrics: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    artifactPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    trainingDataInfo: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    deployedAt: {
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
    tableName: 'model_registry',
    underscored: true,
    timestamps: true,
  },
);
