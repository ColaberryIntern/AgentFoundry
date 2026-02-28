import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type MonetizationType =
  | 'cost_reduction'
  | 'revenue_generation'
  | 'risk_mitigation'
  | 'compliance_automation';

export type UseCaseStatus = 'draft' | 'active' | 'deprecated';

export interface UseCaseAttributes {
  id: string;
  outcomeStatement: string;
  measurableKpi: string | null;
  industryScope: string[] | null;
  regulatoryScope: string[] | null;
  urgencyScore: number | null;
  capitalDependencyScore: number | null;
  monetizationType: MonetizationType;
  status: UseCaseStatus;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UseCaseCreationAttributes extends Optional<
  UseCaseAttributes,
  | 'id'
  | 'measurableKpi'
  | 'industryScope'
  | 'regulatoryScope'
  | 'urgencyScore'
  | 'capitalDependencyScore'
  | 'status'
  | 'version'
  | 'createdAt'
  | 'updatedAt'
> {}

export class UseCase
  extends Model<UseCaseAttributes, UseCaseCreationAttributes>
  implements UseCaseAttributes
{
  declare id: string;
  declare outcomeStatement: string;
  declare measurableKpi: string | null;
  declare industryScope: string[] | null;
  declare regulatoryScope: string[] | null;
  declare urgencyScore: number | null;
  declare capitalDependencyScore: number | null;
  declare monetizationType: MonetizationType;
  declare status: UseCaseStatus;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UseCase.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    outcomeStatement: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'outcome_statement',
    },
    measurableKpi: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'measurable_kpi',
    },
    industryScope: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'industry_scope',
    },
    regulatoryScope: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'regulatory_scope',
    },
    urgencyScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'urgency_score',
    },
    capitalDependencyScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'capital_dependency_score',
    },
    monetizationType: {
      type: DataTypes.ENUM(
        'cost_reduction',
        'revenue_generation',
        'risk_mitigation',
        'compliance_automation',
      ),
      allowNull: false,
      field: 'monetization_type',
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'deprecated'),
      allowNull: false,
      defaultValue: 'active',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'use_cases',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['status'], name: 'idx_usecases_status' },
      { fields: ['monetization_type'], name: 'idx_usecases_monetization' },
    ],
  },
);

export default UseCase;
