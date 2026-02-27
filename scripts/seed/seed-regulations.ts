/**
 * Seed script — Regulatory reference data
 *
 * Inserts common regulations into the compliance_records table as reference data.
 * Idempotent: uses findOrCreate to avoid duplicates on re-run.
 */
import { Sequelize, DataTypes, Model } from 'sequelize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RegulationSeed {
  name: string;
  description: string;
  jurisdiction: string;
  category: string;
  effectiveDate: string; // ISO-8601
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
export const regulations: RegulationSeed[] = [
  {
    name: 'GDPR',
    description: 'General Data Protection Regulation — EU data privacy and protection framework',
    jurisdiction: 'European Union',
    category: 'Data Privacy',
    effectiveDate: '2018-05-25',
  },
  {
    name: 'HIPAA',
    description:
      'Health Insurance Portability and Accountability Act — US healthcare data protection',
    jurisdiction: 'United States',
    category: 'Healthcare',
    effectiveDate: '1996-08-21',
  },
  {
    name: 'SOX',
    description: 'Sarbanes-Oxley Act — US financial reporting and corporate governance',
    jurisdiction: 'United States',
    category: 'Financial',
    effectiveDate: '2002-07-30',
  },
  {
    name: 'PCI-DSS',
    description: 'Payment Card Industry Data Security Standard — cardholder data protection',
    jurisdiction: 'International',
    category: 'Financial',
    effectiveDate: '2004-12-15',
  },
  {
    name: 'CCPA',
    description: 'California Consumer Privacy Act — California consumer data privacy rights',
    jurisdiction: 'United States — California',
    category: 'Data Privacy',
    effectiveDate: '2020-01-01',
  },
  {
    name: 'FERPA',
    description: 'Family Educational Rights and Privacy Act — US student education records',
    jurisdiction: 'United States',
    category: 'Education',
    effectiveDate: '1974-08-21',
  },
  {
    name: 'GLBA',
    description: 'Gramm-Leach-Bliley Act — US financial institution data sharing',
    jurisdiction: 'United States',
    category: 'Financial',
    effectiveDate: '1999-11-12',
  },
  {
    name: 'SOC2',
    description:
      'Service Organization Control 2 — trust services criteria for service organizations',
    jurisdiction: 'International',
    category: 'Information Security',
    effectiveDate: '2010-01-01',
  },
  {
    name: 'ISO27001',
    description: 'ISO/IEC 27001 — international information security management standard',
    jurisdiction: 'International',
    category: 'Information Security',
    effectiveDate: '2005-10-15',
  },
  {
    name: 'NIST',
    description: 'NIST Cybersecurity Framework — US cybersecurity risk management guidelines',
    jurisdiction: 'United States',
    category: 'Cybersecurity',
    effectiveDate: '2014-02-12',
  },
  {
    name: 'FISMA',
    description: 'Federal Information Security Management Act — US federal information security',
    jurisdiction: 'United States',
    category: 'Government',
    effectiveDate: '2002-12-17',
  },
  {
    name: 'COPPA',
    description: "Children's Online Privacy Protection Act — US children's data protection",
    jurisdiction: 'United States',
    category: 'Data Privacy',
    effectiveDate: '2000-04-21',
  },
  {
    name: 'PIPEDA',
    description:
      'Personal Information Protection and Electronic Documents Act — Canadian privacy law',
    jurisdiction: 'Canada',
    category: 'Data Privacy',
    effectiveDate: '2000-04-13',
  },
  {
    name: 'LGPD',
    description: 'Lei Geral de Proteção de Dados — Brazilian data protection law',
    jurisdiction: 'Brazil',
    category: 'Data Privacy',
    effectiveDate: '2020-09-18',
  },
  {
    name: 'DORA',
    description: 'Digital Operational Resilience Act — EU financial sector ICT risk management',
    jurisdiction: 'European Union',
    category: 'Financial',
    effectiveDate: '2025-01-17',
  },
];

// ---------------------------------------------------------------------------
// Minimal inline model (avoids importing from the service source tree)
// ---------------------------------------------------------------------------
class ComplianceRecord extends Model {}

function defineModel(sequelize: Sequelize): typeof ComplianceRecord {
  ComplianceRecord.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      complianceType: { type: DataTypes.STRING(255), allowNull: false, field: 'compliance_type' },
      status: {
        type: DataTypes.ENUM('compliant', 'non_compliant', 'pending', 'review'),
        allowNull: false,
        defaultValue: 'pending',
      },
      regulationId: { type: DataTypes.STRING(100), allowNull: true, field: 'regulation_id' },
      dataSource: { type: DataTypes.STRING(100), allowNull: true, field: 'data_source' },
      threshold: { type: DataTypes.FLOAT, allowNull: true },
      details: { type: DataTypes.TEXT, allowNull: true },
      lastChecked: { type: DataTypes.DATE, allowNull: true, field: 'last_checked' },
    },
    {
      sequelize,
      tableName: 'compliance_records',
      timestamps: true,
      underscored: false,
    },
  );
  return ComplianceRecord;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export async function seedRegulations(sequelize: Sequelize): Promise<number> {
  const Model = defineModel(sequelize);
  await Model.sync(); // ensure table exists

  let created = 0;
  for (const reg of regulations) {
    const [, wasCreated] = await Model.findOrCreate({
      where: { regulationId: reg.name },
      defaults: {
        userId: 1, // system-level reference data
        complianceType: reg.category,
        status: 'pending',
        regulationId: reg.name,
        dataSource: 'seed',
        details: JSON.stringify({
          name: reg.name,
          description: reg.description,
          jurisdiction: reg.jurisdiction,
          category: reg.category,
          effectiveDate: reg.effectiveDate,
        }),
        lastChecked: new Date(),
      },
    });
    if (wasCreated) created++;
  }

  return created;
}
