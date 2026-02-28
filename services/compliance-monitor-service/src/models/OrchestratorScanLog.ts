import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ScanType =
  | 'full'
  | 'gap'
  | 'drift'
  | 'expansion'
  | 'certification'
  | 'ontology'
  | 'marketplace';

export interface OrchestratorScanLogAttributes {
  id: string;
  scanType: ScanType;
  startedAt: Date;
  completedAt: Date | null;
  intentsDetected: number;
  actionsCreated: number;
  guardrailsTriggered: number;
  scanContext: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt?: Date;
}

export interface OrchestratorScanLogCreationAttributes extends Optional<
  OrchestratorScanLogAttributes,
  | 'id'
  | 'completedAt'
  | 'intentsDetected'
  | 'actionsCreated'
  | 'guardrailsTriggered'
  | 'scanContext'
  | 'errorMessage'
  | 'createdAt'
> {}

export class OrchestratorScanLog
  extends Model<OrchestratorScanLogAttributes, OrchestratorScanLogCreationAttributes>
  implements OrchestratorScanLogAttributes
{
  declare id: string;
  declare scanType: ScanType;
  declare startedAt: Date;
  declare completedAt: Date | null;
  declare intentsDetected: number;
  declare actionsCreated: number;
  declare guardrailsTriggered: number;
  declare scanContext: Record<string, unknown> | null;
  declare errorMessage: string | null;
  declare readonly createdAt: Date;
}

OrchestratorScanLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    scanType: {
      type: DataTypes.ENUM(
        'full',
        'gap',
        'drift',
        'expansion',
        'certification',
        'ontology',
        'marketplace',
      ),
      allowNull: false,
      defaultValue: 'full',
      field: 'scan_type',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'started_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    intentsDetected: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'intents_detected',
    },
    actionsCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'actions_created',
    },
    guardrailsTriggered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'guardrails_triggered',
    },
    scanContext: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'scan_context',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
  },
  {
    sequelize,
    tableName: 'orchestrator_scan_log',
    timestamps: true,
    updatedAt: false,
    underscored: false,
    indexes: [
      { fields: ['scan_type'], name: 'idx_scan_type' },
      { fields: ['started_at'], name: 'idx_scan_started' },
    ],
  },
);

export default OrchestratorScanLog;
