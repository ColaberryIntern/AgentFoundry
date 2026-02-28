import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { OrchestratorAction } from './OrchestratorAction';

export type GuardrailType =
  | 'budget'
  | 'risk'
  | 'drift'
  | 'taxonomy_boundary'
  | 'rate_limit'
  | 'concurrent_limit'
  | 'production_lock'
  | 'scope_lock';

export type ViolationSeverity = 'warning' | 'block';

export interface OrchestratorGuardrailViolationAttributes {
  id: string;
  actionId: string | null;
  guardrailType: GuardrailType;
  guardrailKey: string | null;
  violationDetails: Record<string, unknown>;
  severity: ViolationSeverity;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt?: Date;
}

export interface OrchestratorGuardrailViolationCreationAttributes extends Optional<
  OrchestratorGuardrailViolationAttributes,
  | 'id'
  | 'actionId'
  | 'guardrailKey'
  | 'severity'
  | 'resolved'
  | 'resolvedBy'
  | 'resolvedAt'
  | 'createdAt'
> {}

export class OrchestratorGuardrailViolation
  extends Model<
    OrchestratorGuardrailViolationAttributes,
    OrchestratorGuardrailViolationCreationAttributes
  >
  implements OrchestratorGuardrailViolationAttributes
{
  declare id: string;
  declare actionId: string | null;
  declare guardrailType: GuardrailType;
  declare guardrailKey: string | null;
  declare violationDetails: Record<string, unknown>;
  declare severity: ViolationSeverity;
  declare resolved: boolean;
  declare resolvedBy: string | null;
  declare resolvedAt: Date | null;
  declare readonly createdAt: Date;
}

OrchestratorGuardrailViolation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'action_id',
      references: { model: 'orchestrator_actions', key: 'id' },
    },
    guardrailType: {
      type: DataTypes.ENUM(
        'budget',
        'risk',
        'drift',
        'taxonomy_boundary',
        'rate_limit',
        'concurrent_limit',
        'production_lock',
        'scope_lock',
      ),
      allowNull: false,
      field: 'guardrail_type',
    },
    guardrailKey: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'guardrail_key',
    },
    violationDetails: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'violation_details',
    },
    severity: {
      type: DataTypes.ENUM('warning', 'block'),
      allowNull: false,
      defaultValue: 'block',
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
  },
  {
    sequelize,
    tableName: 'orchestrator_guardrail_violations',
    timestamps: true,
    updatedAt: false,
    underscored: false,
    indexes: [
      { fields: ['action_id'], name: 'idx_violations_action' },
      { fields: ['guardrail_type'], name: 'idx_violations_type' },
      { fields: ['resolved'], name: 'idx_violations_resolved' },
    ],
  },
);

// Associations
OrchestratorAction.hasMany(OrchestratorGuardrailViolation, {
  foreignKey: 'action_id',
  as: 'violations',
});
OrchestratorGuardrailViolation.belongsTo(OrchestratorAction, {
  foreignKey: 'action_id',
  as: 'action',
});

export default OrchestratorGuardrailViolation;
