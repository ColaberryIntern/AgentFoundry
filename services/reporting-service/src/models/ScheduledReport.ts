import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ReportType, ReportFormat } from './Report';

export interface ScheduledReportAttributes {
  id: string;
  userId: string;
  reportType: ReportType;
  templateId: string | null;
  parameters: object | null;
  format: ReportFormat;
  schedule: string;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScheduledReportCreationAttributes extends Optional<
  ScheduledReportAttributes,
  | 'id'
  | 'templateId'
  | 'parameters'
  | 'format'
  | 'isActive'
  | 'lastRunAt'
  | 'nextRunAt'
  | 'createdAt'
  | 'updatedAt'
> {}

export class ScheduledReport
  extends Model<ScheduledReportAttributes, ScheduledReportCreationAttributes>
  implements ScheduledReportAttributes
{
  declare id: string;
  declare userId: string;
  declare reportType: ReportType;
  declare templateId: string | null;
  declare parameters: object | null;
  declare format: ReportFormat;
  declare schedule: string;
  declare isActive: boolean;
  declare lastRunAt: Date | null;
  declare nextRunAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ScheduledReport.init(
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
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: 'template_id',
      references: {
        model: 'report_templates',
        key: 'id',
      },
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    format: {
      type: DataTypes.ENUM('pdf', 'csv'),
      allowNull: false,
      defaultValue: 'pdf',
    },
    schedule: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'last_run_at',
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'next_run_at',
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
    tableName: 'scheduled_reports',
    timestamps: true,
    underscored: false,
  },
);

export default ScheduledReport;
