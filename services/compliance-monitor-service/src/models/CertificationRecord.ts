import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import AgentVariant from './AgentVariant';

export type CertificationType =
  | 'regulatory_compliance'
  | 'security_audit'
  | 'performance_benchmark'
  | 'data_governance';

export interface CertificationRecordAttributes {
  id: string;
  agentVariantId: string;
  certificationType: CertificationType;
  complianceFramework: string;
  bestPracticeScore: number;
  auditPassed: boolean;
  findings: Record<string, unknown> | null;
  expiryDate: Date;
  lastReviewed: Date | null;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CertificationRecordCreationAttributes extends Optional<
  CertificationRecordAttributes,
  'id' | 'auditPassed' | 'findings' | 'lastReviewed' | 'version' | 'createdAt' | 'updatedAt'
> {}

export class CertificationRecord
  extends Model<CertificationRecordAttributes, CertificationRecordCreationAttributes>
  implements CertificationRecordAttributes
{
  declare id: string;
  declare agentVariantId: string;
  declare certificationType: CertificationType;
  declare complianceFramework: string;
  declare bestPracticeScore: number;
  declare auditPassed: boolean;
  declare findings: Record<string, unknown> | null;
  declare expiryDate: Date;
  declare lastReviewed: Date | null;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CertificationRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    certificationType: {
      type: DataTypes.ENUM(
        'regulatory_compliance',
        'security_audit',
        'performance_benchmark',
        'data_governance',
      ),
      allowNull: false,
      field: 'certification_type',
    },
    complianceFramework: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'compliance_framework',
    },
    bestPracticeScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      field: 'best_practice_score',
    },
    auditPassed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'audit_passed',
    },
    findings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expiry_date',
    },
    lastReviewed: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_reviewed',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'certification_records',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['agent_variant_id'], name: 'idx_cert_variant' },
      { fields: ['certification_type'], name: 'idx_cert_type' },
      { fields: ['compliance_framework'], name: 'idx_cert_framework' },
      { fields: ['expiry_date'], name: 'idx_cert_expiry' },
    ],
  },
);

CertificationRecord.belongsTo(AgentVariant, {
  foreignKey: 'agentVariantId',
  as: 'variant',
});
AgentVariant.hasMany(CertificationRecord, {
  foreignKey: 'agentVariantId',
  as: 'certifications',
});

export default CertificationRecord;
