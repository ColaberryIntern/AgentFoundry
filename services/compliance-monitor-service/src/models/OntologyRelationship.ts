import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type OntologyRelationshipType =
  | 'SOLVES'
  | 'OPERATES_IN'
  | 'COMPLIES_WITH'
  | 'TRIGGERS'
  | 'INVALIDATES'
  | 'DEPENDS_ON'
  | 'APPLIES_TO'
  | 'REQUIRES';

export interface OntologyRelationshipAttributes {
  id: string;
  subjectType: string;
  subjectId: string;
  relationshipType: OntologyRelationshipType;
  objectType: string;
  objectId: string;
  weight: number;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OntologyRelationshipCreationAttributes extends Optional<
  OntologyRelationshipAttributes,
  'id' | 'weight' | 'metadata' | 'version' | 'createdAt' | 'updatedAt'
> {}

export class OntologyRelationship
  extends Model<OntologyRelationshipAttributes, OntologyRelationshipCreationAttributes>
  implements OntologyRelationshipAttributes
{
  declare id: string;
  declare subjectType: string;
  declare subjectId: string;
  declare relationshipType: OntologyRelationshipType;
  declare objectType: string;
  declare objectId: string;
  declare weight: number;
  declare metadata: Record<string, unknown> | null;
  declare version: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

OntologyRelationship.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    subjectType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'subject_type',
    },
    subjectId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'subject_id',
    },
    relationshipType: {
      type: DataTypes.ENUM(
        'SOLVES',
        'OPERATES_IN',
        'COMPLIES_WITH',
        'TRIGGERS',
        'INVALIDATES',
        'DEPENDS_ON',
        'APPLIES_TO',
        'REQUIRES',
      ),
      allowNull: false,
      field: 'relationship_type',
    },
    objectType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'object_type',
    },
    objectId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'object_id',
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'ontology_relationships',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['subject_type', 'subject_id'], name: 'idx_ontology_subject' },
      { fields: ['object_type', 'object_id'], name: 'idx_ontology_object' },
      { fields: ['relationship_type'], name: 'idx_ontology_rel_type' },
      {
        fields: ['subject_type', 'subject_id', 'relationship_type', 'object_type', 'object_id'],
        unique: true,
        name: 'idx_ontology_unique_rel',
      },
    ],
  },
);

export default OntologyRelationship;
