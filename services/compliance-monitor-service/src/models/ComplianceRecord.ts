import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ComplianceRecordAttributes {
  id: number;
  userId: number;
  complianceType: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'review';
  regulationId: string | null;
  dataSource: string | null;
  threshold: number | null;
  details: string | null;
  lastChecked: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ComplianceRecordCreationAttributes extends Optional<
  ComplianceRecordAttributes,
  | 'id'
  | 'status'
  | 'regulationId'
  | 'dataSource'
  | 'threshold'
  | 'details'
  | 'lastChecked'
  | 'createdAt'
  | 'updatedAt'
> {}

export class ComplianceRecord
  extends Model<ComplianceRecordAttributes, ComplianceRecordCreationAttributes>
  implements ComplianceRecordAttributes
{
  declare id: number;
  declare userId: number;
  declare complianceType: string;
  declare status: 'compliant' | 'non_compliant' | 'pending' | 'review';
  declare regulationId: string | null;
  declare dataSource: string | null;
  declare threshold: number | null;
  declare details: string | null;
  declare lastChecked: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ComplianceRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    complianceType: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'compliance_type',
    },
    status: {
      type: DataTypes.ENUM('compliant', 'non_compliant', 'pending', 'review'),
      allowNull: false,
      defaultValue: 'pending',
    },
    regulationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'regulation_id',
    },
    dataSource: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'data_source',
    },
    threshold: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastChecked: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_checked',
    },
  },
  {
    sequelize,
    tableName: 'compliance_records',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['user_id', 'status'], name: 'idx_compliance_user_status' },
      { fields: ['createdAt'], name: 'idx_compliance_created_at' },
    ],
  },
);

export default ComplianceRecord;
