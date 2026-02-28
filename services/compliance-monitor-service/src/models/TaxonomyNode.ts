import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type TaxonomyNodeType = 'industry' | 'process' | 'function' | 'regulation' | 'risk';
export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface TaxonomyNodeAttributes {
  id: string;
  parentId: string | null;
  nodeType: TaxonomyNodeType;
  name: string;
  description: string | null;
  riskTier: RiskTier;
  dataAccessScope: string | null;
  allowedAgentTypes: string[] | null;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaxonomyNodeCreationAttributes extends Optional<
  TaxonomyNodeAttributes,
  | 'id'
  | 'parentId'
  | 'description'
  | 'riskTier'
  | 'dataAccessScope'
  | 'allowedAgentTypes'
  | 'metadata'
  | 'version'
  | 'createdAt'
  | 'updatedAt'
> {}

export class TaxonomyNode
  extends Model<TaxonomyNodeAttributes, TaxonomyNodeCreationAttributes>
  implements TaxonomyNodeAttributes
{
  declare id: string;
  declare parentId: string | null;
  declare nodeType: TaxonomyNodeType;
  declare name: string;
  declare description: string | null;
  declare riskTier: RiskTier;
  declare dataAccessScope: string | null;
  declare allowedAgentTypes: string[] | null;
  declare metadata: Record<string, unknown> | null;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TaxonomyNode.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'taxonomy_nodes',
        key: 'id',
      },
    },
    nodeType: {
      type: DataTypes.ENUM('industry', 'process', 'function', 'regulation', 'risk'),
      allowNull: false,
      field: 'node_type',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    riskTier: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
      field: 'risk_tier',
    },
    dataAccessScope: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'data_access_scope',
    },
    allowedAgentTypes: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'allowed_agent_types',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'taxonomy_nodes',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['parent_id'], name: 'idx_taxonomy_parent_id' },
      { fields: ['node_type'], name: 'idx_taxonomy_node_type' },
      { fields: ['risk_tier'], name: 'idx_taxonomy_risk_tier' },
    ],
  },
);

TaxonomyNode.belongsTo(TaxonomyNode, {
  foreignKey: 'parentId',
  as: 'parent',
});
TaxonomyNode.hasMany(TaxonomyNode, {
  foreignKey: 'parentId',
  as: 'children',
});

export default TaxonomyNode;
