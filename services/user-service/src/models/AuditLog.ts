import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AuditLogAttributes {
  id: number;
  userId: number | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt?: Date;
}

export interface AuditLogCreationAttributes extends Optional<
  AuditLogAttributes,
  'id' | 'userId' | 'resourceId' | 'details' | 'ipAddress' | 'userAgent' | 'createdAt'
> {}

class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  declare id: number;
  declare userId: number | null;
  declare action: string;
  declare resource: string;
  declare resourceId: string | null;
  declare details: Record<string, unknown> | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare readonly createdAt: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    resource: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'resource_id',
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_agent',
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false, // Audit logs are immutable; no updatedAt needed
    underscored: true,
  },
);

export { AuditLog };
