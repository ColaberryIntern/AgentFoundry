import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type SpecializationType =
  | 'compliance_monitor'
  | 'risk_analyzer'
  | 'regulatory_tracker'
  | 'audit_agent'
  | 'data_classifier'
  | 'anomaly_detector'
  | 'report_generator'
  | 'workflow_orchestrator';

export type AgentRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentSkeletonAttributes {
  id: string;
  name: string;
  specializationType: SpecializationType;
  coreCapabilities: string[] | null;
  inputContract: Record<string, unknown> | null;
  outputContract: Record<string, unknown> | null;
  allowedTaxonomyScope: string[] | null;
  communicationProtocol: string;
  riskLevel: AgentRiskLevel;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentSkeletonCreationAttributes extends Optional<
  AgentSkeletonAttributes,
  | 'id'
  | 'coreCapabilities'
  | 'inputContract'
  | 'outputContract'
  | 'allowedTaxonomyScope'
  | 'communicationProtocol'
  | 'riskLevel'
  | 'version'
  | 'createdAt'
  | 'updatedAt'
> {}

export class AgentSkeleton
  extends Model<AgentSkeletonAttributes, AgentSkeletonCreationAttributes>
  implements AgentSkeletonAttributes
{
  declare id: string;
  declare name: string;
  declare specializationType: SpecializationType;
  declare coreCapabilities: string[] | null;
  declare inputContract: Record<string, unknown> | null;
  declare outputContract: Record<string, unknown> | null;
  declare allowedTaxonomyScope: string[] | null;
  declare communicationProtocol: string;
  declare riskLevel: AgentRiskLevel;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AgentSkeleton.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    specializationType: {
      type: DataTypes.ENUM(
        'compliance_monitor',
        'risk_analyzer',
        'regulatory_tracker',
        'audit_agent',
        'data_classifier',
        'anomaly_detector',
        'report_generator',
        'workflow_orchestrator',
      ),
      allowNull: false,
      field: 'specialization_type',
    },
    coreCapabilities: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'core_capabilities',
    },
    inputContract: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'input_contract',
    },
    outputContract: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'output_contract',
    },
    allowedTaxonomyScope: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'allowed_taxonomy_scope',
    },
    communicationProtocol: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'async',
      field: 'communication_protocol',
    },
    riskLevel: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
      field: 'risk_level',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'agent_skeletons',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['specialization_type'], name: 'idx_skeletons_spec_type' },
      { fields: ['risk_level'], name: 'idx_skeletons_risk_level' },
    ],
  },
);

export default AgentSkeleton;
