import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type MarketplaceStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'testing'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'delisted';

export interface MarketplaceSubmissionAttributes {
  id: string;
  submitterId: string;
  agentVariantId: string | null;
  submissionName: string;
  description: string | null;
  documentationUrl: string | null;
  status: MarketplaceStatus;
  reviewNotes: Record<string, unknown>[] | null;
  certificationRequired: boolean;
  listingMetadata: Record<string, unknown> | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketplaceSubmissionCreationAttributes extends Optional<
  MarketplaceSubmissionAttributes,
  | 'id'
  | 'agentVariantId'
  | 'description'
  | 'documentationUrl'
  | 'status'
  | 'reviewNotes'
  | 'certificationRequired'
  | 'listingMetadata'
  | 'submittedAt'
  | 'reviewedAt'
  | 'publishedAt'
  | 'createdAt'
  | 'updatedAt'
> {}

export class MarketplaceSubmission
  extends Model<MarketplaceSubmissionAttributes, MarketplaceSubmissionCreationAttributes>
  implements MarketplaceSubmissionAttributes
{
  declare id: string;
  declare submitterId: string;
  declare agentVariantId: string | null;
  declare submissionName: string;
  declare description: string | null;
  declare documentationUrl: string | null;
  declare status: MarketplaceStatus;
  declare reviewNotes: Record<string, unknown>[] | null;
  declare certificationRequired: boolean;
  declare listingMetadata: Record<string, unknown> | null;
  declare submittedAt: Date | null;
  declare reviewedAt: Date | null;
  declare publishedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

MarketplaceSubmission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    submitterId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'submitter_id',
    },
    agentVariantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'agent_variant_id',
      references: { model: 'agent_variants', key: 'id' },
    },
    submissionName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'submission_name',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    documentationUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'documentation_url',
    },
    status: {
      type: DataTypes.ENUM(
        'draft',
        'submitted',
        'under_review',
        'testing',
        'approved',
        'rejected',
        'published',
        'delisted',
      ),
      allowNull: false,
      defaultValue: 'draft',
    },
    reviewNotes: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'review_notes',
    },
    certificationRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'certification_required',
    },
    listingMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'listing_metadata',
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'submitted_at',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
    },
  },
  {
    sequelize,
    tableName: 'marketplace_submissions',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['status'], name: 'idx_marketplace_status' },
      { fields: ['submitter_id'], name: 'idx_marketplace_submitter' },
      { fields: ['agent_variant_id'], name: 'idx_marketplace_variant' },
    ],
  },
);

export default MarketplaceSubmission;
