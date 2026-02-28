import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { OrchestratorIntent } from './OrchestratorIntent';

export type ActionType =
  | 'create_use_case'
  | 'create_skeleton'
  | 'create_variant'
  | 'deploy_agent'
  | 'recertify_agent'
  | 'adjust_threshold'
  | 'add_ontology_relation'
  | 'add_taxonomy_node'
  | 'pause_deployment'
  | 'update_configuration'
  | 'submit_marketplace'
  | 'generate_report';

export type ActionStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'approved'
  | 'simulating'
  | 'simulation_passed'
  | 'simulation_failed'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export interface OrchestratorActionAttributes {
  id: string;
  intentId: string;
  actionType: ActionType;
  targetEntityType: string | null;
  targetEntityId: string | null;
  parameters: Record<string, unknown>;
  status: ActionStatus;
  requiresApproval: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  simulationResult: Record<string, unknown> | null;
  executionResult: Record<string, unknown> | null;
  errorMessage: string | null;
  sequenceOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrchestratorActionCreationAttributes extends Optional<
  OrchestratorActionAttributes,
  | 'id'
  | 'targetEntityType'
  | 'targetEntityId'
  | 'status'
  | 'requiresApproval'
  | 'approvedBy'
  | 'approvedAt'
  | 'simulationResult'
  | 'executionResult'
  | 'errorMessage'
  | 'sequenceOrder'
  | 'createdAt'
  | 'updatedAt'
> {}

export class OrchestratorAction
  extends Model<OrchestratorActionAttributes, OrchestratorActionCreationAttributes>
  implements OrchestratorActionAttributes
{
  declare id: string;
  declare intentId: string;
  declare actionType: ActionType;
  declare targetEntityType: string | null;
  declare targetEntityId: string | null;
  declare parameters: Record<string, unknown>;
  declare status: ActionStatus;
  declare requiresApproval: boolean;
  declare approvedBy: string | null;
  declare approvedAt: Date | null;
  declare simulationResult: Record<string, unknown> | null;
  declare executionResult: Record<string, unknown> | null;
  declare errorMessage: string | null;
  declare sequenceOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OrchestratorAction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    intentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'intent_id',
      references: { model: 'orchestrator_intents', key: 'id' },
    },
    actionType: {
      type: DataTypes.ENUM(
        'create_use_case',
        'create_skeleton',
        'create_variant',
        'deploy_agent',
        'recertify_agent',
        'adjust_threshold',
        'add_ontology_relation',
        'add_taxonomy_node',
        'pause_deployment',
        'update_configuration',
        'submit_marketplace',
        'generate_report',
      ),
      allowNull: false,
      field: 'action_type',
    },
    targetEntityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'target_entity_type',
    },
    targetEntityId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'target_entity_id',
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'awaiting_approval',
        'approved',
        'simulating',
        'simulation_passed',
        'simulation_failed',
        'executing',
        'completed',
        'failed',
        'rolled_back',
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'requires_approval',
    },
    approvedBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'approved_by',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'approved_at',
    },
    simulationResult: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'simulation_result',
    },
    executionResult: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'execution_result',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    sequenceOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sequence_order',
    },
  },
  {
    sequelize,
    tableName: 'orchestrator_actions',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['intent_id'], name: 'idx_actions_intent' },
      { fields: ['status'], name: 'idx_actions_status' },
      { fields: ['action_type'], name: 'idx_actions_type' },
    ],
  },
);

// Associations
OrchestratorIntent.hasMany(OrchestratorAction, {
  foreignKey: 'intent_id',
  as: 'actions',
});
OrchestratorAction.belongsTo(OrchestratorIntent, {
  foreignKey: 'intent_id',
  as: 'intent',
});

export default OrchestratorAction;
