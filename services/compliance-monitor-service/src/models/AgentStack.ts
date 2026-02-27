import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type AgentStackType =
  | 'compliance_monitor'
  | 'risk_analyzer'
  | 'regulatory_tracker'
  | 'audit_agent'
  | 'custom';

export type AgentStackStatus = 'draft' | 'deploying' | 'running' | 'paused' | 'stopped' | 'error';

export type AgentHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface AgentStackAttributes {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: AgentStackType;
  status: AgentStackStatus;
  configuration: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  healthStatus: AgentHealthStatus;
  lastHealthCheck: Date | null;
  deployedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentStackCreationAttributes extends Optional<
  AgentStackAttributes,
  | 'id'
  | 'description'
  | 'status'
  | 'configuration'
  | 'metrics'
  | 'healthStatus'
  | 'lastHealthCheck'
  | 'deployedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

export class AgentStack
  extends Model<AgentStackAttributes, AgentStackCreationAttributes>
  implements AgentStackAttributes
{
  declare id: string;
  declare userId: string;
  declare name: string;
  declare description: string | null;
  declare type: AgentStackType;
  declare status: AgentStackStatus;
  declare configuration: Record<string, unknown> | null;
  declare metrics: Record<string, unknown> | null;
  declare healthStatus: AgentHealthStatus;
  declare lastHealthCheck: Date | null;
  declare deployedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AgentStack.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(
        'compliance_monitor',
        'risk_analyzer',
        'regulatory_tracker',
        'audit_agent',
        'custom',
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'deploying', 'running', 'paused', 'stopped', 'error'),
      allowNull: false,
      defaultValue: 'draft',
    },
    configuration: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    metrics: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    healthStatus: {
      type: DataTypes.ENUM('healthy', 'degraded', 'unhealthy', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      field: 'health_status',
    },
    lastHealthCheck: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_health_check',
    },
    deployedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deployed_at',
    },
  },
  {
    sequelize,
    tableName: 'agent_stacks',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['user_id', 'status'], name: 'idx_agent_stacks_user_status' },
      { fields: ['type'], name: 'idx_agent_stacks_type' },
      { fields: ['createdAt'], name: 'idx_agent_stacks_created_at' },
    ],
  },
);

export default AgentStack;
