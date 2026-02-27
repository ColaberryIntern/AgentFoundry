import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SearchHistoryAttributes {
  id: string;
  userId: string;
  query: string;
  resultCount: number;
  filters: object | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchHistoryCreationAttributes extends Optional<
  SearchHistoryAttributes,
  'id' | 'resultCount' | 'filters' | 'createdAt' | 'updatedAt'
> {}

export class SearchHistory
  extends Model<SearchHistoryAttributes, SearchHistoryCreationAttributes>
  implements SearchHistoryAttributes
{
  declare id: string;
  declare userId: string;
  declare query: string;
  declare resultCount: number;
  declare filters: object | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SearchHistory.init(
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
    query: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resultCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'result_count',
    },
    filters: {
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
    tableName: 'search_history',
    timestamps: true,
    underscored: false,
  },
);

export default SearchHistory;
