import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import AgentSkeleton from './AgentSkeleton';

export type CertificationStatus = 'uncertified' | 'pending' | 'certified' | 'expired' | 'revoked';

export interface AgentVariantAttributes {
  id: string;
  skeletonId: string;
  industryCode: string | null;
  regulationId: string | null;
  name: string;
  configuration: Record<string, unknown> | null;
  thresholdRules: Record<string, unknown> | null;
  certificationStatus: CertificationStatus;
  certificationScore: number | null;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentVariantCreationAttributes extends Optional<
  AgentVariantAttributes,
  | 'id'
  | 'industryCode'
  | 'regulationId'
  | 'configuration'
  | 'thresholdRules'
  | 'certificationStatus'
  | 'certificationScore'
  | 'version'
  | 'createdAt'
  | 'updatedAt'
> {}

export class AgentVariant
  extends Model<AgentVariantAttributes, AgentVariantCreationAttributes>
  implements AgentVariantAttributes
{
  declare id: string;
  declare skeletonId: string;
  declare industryCode: string | null;
  declare regulationId: string | null;
  declare name: string;
  declare configuration: Record<string, unknown> | null;
  declare thresholdRules: Record<string, unknown> | null;
  declare certificationStatus: CertificationStatus;
  declare certificationScore: number | null;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AgentVariant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    skeletonId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'skeleton_id',
      references: {
        model: 'agent_skeletons',
        key: 'id',
      },
    },
    industryCode: {
      type: DataTypes.STRING(6),
      allowNull: true,
      field: 'industry_code',
      references: {
        model: 'naics_industries',
        key: 'code',
      },
    },
    regulationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'regulation_id',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    configuration: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    thresholdRules: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'threshold_rules',
    },
    certificationStatus: {
      type: DataTypes.ENUM('uncertified', 'pending', 'certified', 'expired', 'revoked'),
      allowNull: false,
      defaultValue: 'uncertified',
      field: 'certification_status',
    },
    certificationScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'certification_score',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'agent_variants',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['skeleton_id'], name: 'idx_variants_skeleton' },
      { fields: ['industry_code'], name: 'idx_variants_industry' },
      { fields: ['certification_status'], name: 'idx_variants_cert_status' },
    ],
  },
);

AgentVariant.belongsTo(AgentSkeleton, {
  foreignKey: 'skeletonId',
  as: 'skeleton',
});
AgentSkeleton.hasMany(AgentVariant, {
  foreignKey: 'skeletonId',
  as: 'variants',
});

export default AgentVariant;
