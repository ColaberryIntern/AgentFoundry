import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ReportType =
  | 'compliance_summary'
  | 'risk_assessment'
  | 'audit_trail'
  | 'regulatory_status';
export type ReportFormat = 'pdf' | 'csv';
export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ReportAttributes {
  id: string;
  userId: string;
  reportType: ReportType;
  parameters: object | null;
  format: ReportFormat;
  status: ReportStatus;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportCreationAttributes extends Optional<
  ReportAttributes,
  | 'id'
  | 'parameters'
  | 'format'
  | 'status'
  | 'downloadUrl'
  | 'errorMessage'
  | 'createdAt'
  | 'updatedAt'
> {}

export class Report
  extends Model<ReportAttributes, ReportCreationAttributes>
  implements ReportAttributes
{
  declare id: string;
  declare userId: string;
  declare reportType: ReportType;
  declare parameters: object | null;
  declare format: ReportFormat;
  declare status: ReportStatus;
  declare downloadUrl: string | null;
  declare errorMessage: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Report.init(
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
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'queued',
    },
    downloadUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'download_url',
    },
    errorMessage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'error_message',
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
    tableName: 'reports',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['user_id', 'status'], name: 'idx_report_user_status' },
      { fields: ['created_at'], name: 'idx_report_created_at' },
    ],
  },
);

export default Report;
