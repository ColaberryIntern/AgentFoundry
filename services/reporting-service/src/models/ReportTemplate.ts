import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ReportType } from './Report';

export interface ReportTemplateAttributes {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  reportType: ReportType;
  defaultParameters: object | null;
  sections: object[] | null;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportTemplateCreationAttributes extends Optional<
  ReportTemplateAttributes,
  'id' | 'description' | 'defaultParameters' | 'sections' | 'isPublic' | 'createdAt' | 'updatedAt'
> {}

export class ReportTemplate
  extends Model<ReportTemplateAttributes, ReportTemplateCreationAttributes>
  implements ReportTemplateAttributes
{
  declare id: string;
  declare userId: string;
  declare name: string;
  declare description: string | null;
  declare reportType: ReportType;
  declare defaultParameters: object | null;
  declare sections: object[] | null;
  declare isPublic: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ReportTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    reportType: {
      type: DataTypes.ENUM(
        'compliance_summary',
        'risk_assessment',
        'audit_trail',
        'regulatory_status',
      ),
      allowNull: false,
      field: 'report_type',
    },
    defaultParameters: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      field: 'default_parameters',
    },
    sections: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_public',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'report_templates',
    timestamps: true,
    underscored: false,
  },
);

export default ReportTemplate;
