import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface FeedbackAttributes {
  id: string;
  userId: string;
  category: string;
  message: string;
  rating: number | null;
  page: string | null;
  metadata: object | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeedbackCreationAttributes extends Optional<
  FeedbackAttributes,
  'id' | 'rating' | 'page' | 'metadata' | 'createdAt' | 'updatedAt'
> {}

export class Feedback
  extends Model<FeedbackAttributes, FeedbackCreationAttributes>
  implements FeedbackAttributes
{
  declare id: string;
  declare userId: string;
  declare category: string;
  declare message: string;
  declare rating: number | null;
  declare page: string | null;
  declare metadata: object | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Feedback.init(
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
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    page: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
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
    tableName: 'feedback',
    timestamps: true,
    underscored: false,
  },
);

export default Feedback;
