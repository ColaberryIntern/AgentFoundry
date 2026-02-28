import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RegistryAuditLogAttributes {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  reason: string | null;
  createdAt?: Date;
}

export interface RegistryAuditLogCreationAttributes extends Optional<
  RegistryAuditLogAttributes,
  'id' | 'changes' | 'reason' | 'createdAt'
> {}

export class RegistryAuditLog
  extends Model<RegistryAuditLogAttributes, RegistryAuditLogCreationAttributes>
  implements RegistryAuditLogAttributes
{
  declare id: string;
  declare actor: string;
  declare action: string;
  declare entityType: string;
  declare entityId: string;
  declare changes: Record<string, unknown> | null;
  declare reason: string | null;
  declare readonly createdAt: Date;
}

RegistryAuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actor: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'entity_id',
    },
    changes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'registry_audit_log',
    timestamps: true,
    updatedAt: false,
    underscored: false,
    indexes: [
      { fields: ['entity_type', 'entity_id'], name: 'idx_audit_entity' },
      { fields: ['actor'], name: 'idx_audit_actor' },
      { fields: ['action'], name: 'idx_audit_action' },
      { fields: ['createdAt'], name: 'idx_audit_created' },
    ],
  },
);

export default RegistryAuditLog;
