import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type IntentType =
  | 'gap_coverage'
  | 'drift_remediation'
  | 'expansion_opportunity'
  | 'certification_renewal'
  | 'risk_mitigation'
  | 'ontology_evolution'
  | 'taxonomy_expansion'
  | 'marketplace_submission';

export type IntentPriority = 'low' | 'medium' | 'high' | 'critical';

export type IntentStatus =
  | 'detected'
  | 'evaluating'
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'simulating'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface OrchestratorIntentAttributes {
  id: string;
  intentType: IntentType;
  sourceSignal: string;
  priority: IntentPriority;
  confidenceScore: number;
  title: string;
  description: string | null;
  context: Record<string, unknown> | null;
  recommendedActions: Record<string, unknown>[] | null;
  status: IntentStatus;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  expiresAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrchestratorIntentCreationAttributes extends Optional<
  OrchestratorIntentAttributes,
  | 'id'
  | 'priority'
  | 'description'
  | 'context'
  | 'recommendedActions'
  | 'status'
  | 'resolvedBy'
  | 'resolvedAt'
  | 'expiresAt'
  | 'createdAt'
  | 'updatedAt'
> {}

export class OrchestratorIntent
  extends Model<OrchestratorIntentAttributes, OrchestratorIntentCreationAttributes>
  implements OrchestratorIntentAttributes
{
  declare id: string;
  declare intentType: IntentType;
  declare sourceSignal: string;
  declare priority: IntentPriority;
  declare confidenceScore: number;
  declare title: string;
  declare description: string | null;
  declare context: Record<string, unknown> | null;
  declare recommendedActions: Record<string, unknown>[] | null;
  declare status: IntentStatus;
  declare resolvedBy: string | null;
  declare resolvedAt: Date | null;
  declare expiresAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrchestratorIntent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    intentType: {
      type: DataTypes.ENUM(
        'gap_coverage',
        'drift_remediation',
        'expansion_opportunity',
        'certification_renewal',
        'risk_mitigation',
        'ontology_evolution',
        'taxonomy_expansion',
        'marketplace_submission',
      ),
      allowNull: false,
      field: 'intent_type',
    },
    sourceSignal: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'source_signal',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: 'confidence_score',
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    context: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    recommendedActions: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'recommended_actions',
    },
    status: {
      type: DataTypes.ENUM(
        'detected',
        'evaluating',
        'proposed',
        'approved',
        'rejected',
        'simulating',
        'executing',
        'completed',
        'failed',
        'cancelled',
      ),
      allowNull: false,
      defaultValue: 'detected',
    },
    resolvedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'resolved_by',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
  },
  {
    sequelize,
    tableName: 'orchestrator_intents',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['status'], name: 'idx_intents_status' },
      { fields: ['intent_type'], name: 'idx_intents_type' },
      { fields: ['priority'], name: 'idx_intents_priority' },
      { fields: ['createdAt'], name: 'idx_intents_created' },
    ],
  },
);

export default OrchestratorIntent;
