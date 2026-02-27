import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type InteractionType =
  | 'page_view'
  | 'feature_use'
  | 'search'
  | 'recommendation_click'
  | 'report_generate'
  | 'filter_apply'
  | 'dashboard_widget_click';

export interface UserInteractionAttributes {
  id: string;
  userId: string;
  interactionType: InteractionType;
  target: string;
  metadata: Record<string, unknown> | null;
  sessionId: string | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInteractionCreationAttributes extends Optional<
  UserInteractionAttributes,
  'id' | 'metadata' | 'sessionId' | 'duration' | 'createdAt' | 'updatedAt'
> {}

export class UserInteraction
  extends Model<UserInteractionAttributes, UserInteractionCreationAttributes>
  implements UserInteractionAttributes
{
  declare id: string;
  declare userId: string;
  declare interactionType: InteractionType;
  declare target: string;
  declare metadata: Record<string, unknown> | null;
  declare sessionId: string | null;
  declare duration: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UserInteraction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    interactionType: {
      type: DataTypes.ENUM(
        'page_view',
        'feature_use',
        'search',
        'recommendation_click',
        'report_generate',
        'filter_apply',
        'dashboard_widget_click',
      ),
      allowNull: false,
    },
    target: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'user_interactions',
    underscored: true,
    timestamps: true,
  },
);
