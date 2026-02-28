import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface NaicsIndustryAttributes {
  code: string;
  title: string;
  description: string | null;
  level: number;
  parentCode: string | null;
  sector: string;
  versionYear: number;
  lastUpdated: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NaicsIndustryCreationAttributes extends Optional<
  NaicsIndustryAttributes,
  'description' | 'parentCode' | 'lastUpdated' | 'createdAt' | 'updatedAt'
> {}

export class NaicsIndustry
  extends Model<NaicsIndustryAttributes, NaicsIndustryCreationAttributes>
  implements NaicsIndustryAttributes
{
  declare code: string;
  declare title: string;
  declare description: string | null;
  declare level: number;
  declare parentCode: string | null;
  declare sector: string;
  declare versionYear: number;
  declare lastUpdated: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

NaicsIndustry.init(
  {
    code: {
      type: DataTypes.STRING(6),
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parentCode: {
      type: DataTypes.STRING(6),
      allowNull: true,
      field: 'parent_code',
      references: {
        model: 'naics_industries',
        key: 'code',
      },
    },
    sector: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    versionYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2022,
      field: 'version_year',
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_updated',
    },
  },
  {
    sequelize,
    tableName: 'naics_industries',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['parent_code'], name: 'idx_naics_parent_code' },
      { fields: ['level'], name: 'idx_naics_level' },
      { fields: ['sector'], name: 'idx_naics_sector' },
    ],
  },
);

NaicsIndustry.belongsTo(NaicsIndustry, {
  foreignKey: 'parentCode',
  as: 'parent',
});
NaicsIndustry.hasMany(NaicsIndustry, {
  foreignKey: 'parentCode',
  as: 'children',
});

export default NaicsIndustry;
