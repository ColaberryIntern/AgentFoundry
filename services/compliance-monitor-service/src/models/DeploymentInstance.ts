import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import AgentVariant from './AgentVariant';

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export interface DeploymentInstanceAttributes {
  id: string;
  agentStackId: string;
  agentVariantId: string;
  environment: DeploymentEnvironment;
  activeStatus: boolean;
  performanceScore: number | null;
  lastExecution: Date | null;
  executionCount: number;
  errorCount: number;
  deployedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeploymentInstanceCreationAttributes extends Optional<
  DeploymentInstanceAttributes,
  | 'id'
  | 'activeStatus'
  | 'performanceScore'
  | 'lastExecution'
  | 'executionCount'
  | 'errorCount'
  | 'deployedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

export class DeploymentInstance
  extends Model<DeploymentInstanceAttributes, DeploymentInstanceCreationAttributes>
  implements DeploymentInstanceAttributes
{
  declare id: string;
  declare agentStackId: string;
  declare agentVariantId: string;
  declare environment: DeploymentEnvironment;
  declare activeStatus: boolean;
  declare performanceScore: number | null;
  declare lastExecution: Date | null;
  declare executionCount: number;
  declare errorCount: number;
  declare deployedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DeploymentInstance.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    agentStackId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'agent_stack_id',
      references: {
        model: 'agent_stacks',
        key: 'id',
      },
    },
    agentVariantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'agent_variant_id',
      references: {
        model: 'agent_variants',
        key: 'id',
      },
    },
    environment: {
      type: DataTypes.ENUM('development', 'staging', 'production'),
      allowNull: false,
      defaultValue: 'development',
    },
    activeStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'active_status',
    },
    performanceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'performance_score',
    },
    lastExecution: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_execution',
    },
    executionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'execution_count',
    },
    errorCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'error_count',
    },
    deployedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'deployed_at',
    },
  },
  {
    sequelize,
    tableName: 'deployment_instances',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['agent_stack_id'], name: 'idx_deploy_agent_stack' },
      { fields: ['agent_variant_id'], name: 'idx_deploy_agent_variant' },
      { fields: ['environment'], name: 'idx_deploy_environment' },
      { fields: ['active_status'], name: 'idx_deploy_active' },
    ],
  },
);

DeploymentInstance.belongsTo(AgentVariant, {
  foreignKey: 'agentVariantId',
  as: 'variant',
});
AgentVariant.hasMany(DeploymentInstance, {
  foreignKey: 'agentVariantId',
  as: 'deployments',
});

export default DeploymentInstance;
