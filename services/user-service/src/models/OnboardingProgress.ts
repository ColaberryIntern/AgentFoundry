import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface OnboardingProgressAttributes {
  id: number;
  userId: number;
  currentStep: number;
  completedSteps: number[];
  isComplete: boolean;
  skippedAt: Date | null;
  completedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OnboardingProgressCreationAttributes extends Optional<
  OnboardingProgressAttributes,
  | 'id'
  | 'currentStep'
  | 'completedSteps'
  | 'isComplete'
  | 'skippedAt'
  | 'completedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

class OnboardingProgress
  extends Model<OnboardingProgressAttributes, OnboardingProgressCreationAttributes>
  implements OnboardingProgressAttributes
{
  declare id: number;
  declare userId: number;
  declare currentStep: number;
  declare completedSteps: number[];
  declare isComplete: boolean;
  declare skippedAt: Date | null;
  declare completedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OnboardingProgress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id',
    },
    currentStep: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'current_step',
    },
    completedSteps: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      field: 'completed_steps',
    },
    isComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_complete',
    },
    skippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'skipped_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
  },
  {
    sequelize,
    tableName: 'onboarding_progress',
    timestamps: true,
    underscored: true,
  },
);

export { OnboardingProgress };
