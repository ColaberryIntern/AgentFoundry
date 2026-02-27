import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type CalendarEventType = 'deadline' | 'audit' | 'regulatory_change' | 'review' | 'training';
export type CalendarEventStatus =
  | 'upcoming'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';
export type CalendarEventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceCalendarAttributes {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  date: Date;
  endDate: Date | null;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  regulationId: string | null;
  metadata: Record<string, unknown> | null;
  reminderDays: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ComplianceCalendarCreationAttributes extends Optional<
  ComplianceCalendarAttributes,
  | 'id'
  | 'description'
  | 'endDate'
  | 'status'
  | 'priority'
  | 'regulationId'
  | 'metadata'
  | 'reminderDays'
  | 'createdAt'
  | 'updatedAt'
> {}

export class ComplianceCalendar
  extends Model<ComplianceCalendarAttributes, ComplianceCalendarCreationAttributes>
  implements ComplianceCalendarAttributes
{
  declare id: string;
  declare userId: string;
  declare title: string;
  declare description: string | null;
  declare eventType: CalendarEventType;
  declare date: Date;
  declare endDate: Date | null;
  declare status: CalendarEventStatus;
  declare priority: CalendarEventPriority;
  declare regulationId: string | null;
  declare metadata: Record<string, unknown> | null;
  declare reminderDays: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ComplianceCalendar.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    eventType: {
      type: DataTypes.ENUM('deadline', 'audit', 'regulatory_change', 'review', 'training'),
      allowNull: false,
      field: 'event_type',
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date',
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'in_progress', 'completed', 'overdue', 'cancelled'),
      allowNull: false,
      defaultValue: 'upcoming',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    regulationId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'regulation_id',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    reminderDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      field: 'reminder_days',
    },
  },
  {
    sequelize,
    tableName: 'compliance_calendar',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['user_id', 'date'], name: 'idx_calendar_user_date' },
      { fields: ['event_type'], name: 'idx_calendar_event_type' },
      { fields: ['status'], name: 'idx_calendar_status' },
    ],
  },
);

export default ComplianceCalendar;
