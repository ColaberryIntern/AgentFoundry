import { queryRows, execSql } from '../utils/db';
import logger from '../utils/logger';

const JOB = 'industrySeeder';

// ---------------------------------------------------------------------------
// NAICS 2022 Sectors (2-digit codes) — all 20 sectors (24 codes)
// ---------------------------------------------------------------------------
const SECTORS: { code: string; title: string; description: string }[] = [
  {
    code: '11',
    title: 'Agriculture, Forestry, Fishing and Hunting',
    description:
      'Establishments primarily engaged in growing crops, raising animals, harvesting timber, and harvesting fish and other animals from farms, ranches, or natural habitats.',
  },
  {
    code: '21',
    title: 'Mining, Quarrying, and Oil and Gas Extraction',
    description:
      'Establishments that extract naturally occurring mineral solids, liquid minerals, and gases.',
  },
  {
    code: '22',
    title: 'Utilities',
    description:
      'Establishments that provide electric power, natural gas, steam supply, water supply, and sewage removal through permanent infrastructure.',
  },
  {
    code: '23',
    title: 'Construction',
    description:
      'Establishments primarily engaged in the construction of buildings or engineering projects, and establishments engaged in subdividing land.',
  },
  {
    code: '31',
    title: 'Manufacturing (31)',
    description:
      'Establishments engaged in the mechanical, physical, or chemical transformation of materials into new products (food, textiles, apparel).',
  },
  {
    code: '32',
    title: 'Manufacturing (32)',
    description:
      'Establishments engaged in the mechanical, physical, or chemical transformation of materials into new products (wood, paper, chemicals, plastics).',
  },
  {
    code: '33',
    title: 'Manufacturing (33)',
    description:
      'Establishments engaged in the mechanical, physical, or chemical transformation of materials into new products (metals, machinery, electronics, transportation equipment).',
  },
  {
    code: '42',
    title: 'Wholesale Trade',
    description:
      'Establishments engaged in wholesaling merchandise and providing logistics services to move goods.',
  },
  {
    code: '44',
    title: 'Retail Trade (44)',
    description:
      'Establishments engaged in retailing merchandise in small quantities to the general public (motor vehicles, furniture, electronics, building materials, food, health care).',
  },
  {
    code: '45',
    title: 'Retail Trade (45)',
    description:
      'Establishments engaged in retailing merchandise in small quantities to the general public (sporting goods, general merchandise, miscellaneous retailers, nonstore retailers).',
  },
  {
    code: '48',
    title: 'Transportation and Warehousing (48)',
    description:
      'Industries providing transportation of passengers and cargo, warehousing and storage, scenic and sightseeing transportation, and support activities.',
  },
  {
    code: '49',
    title: 'Transportation and Warehousing (49)',
    description:
      'Industries providing postal service, couriers, messengers, and warehousing and storage services.',
  },
  {
    code: '51',
    title: 'Information',
    description:
      'Establishments engaged in producing, distributing, and providing access to information and cultural products.',
  },
  {
    code: '52',
    title: 'Finance and Insurance',
    description:
      'Establishments primarily engaged in financial transactions and/or in facilitating financial transactions.',
  },
  {
    code: '53',
    title: 'Real Estate and Rental and Leasing',
    description:
      'Establishments primarily engaged in renting, leasing, or allowing the use of tangible or intangible assets.',
  },
  {
    code: '54',
    title: 'Professional, Scientific, and Technical Services',
    description:
      'Establishments that specialize in performing professional, scientific, and technical activities for others.',
  },
  {
    code: '55',
    title: 'Management of Companies and Enterprises',
    description:
      'Establishments that hold the securities of companies and enterprises for the purpose of ownership or influencing management decisions.',
  },
  {
    code: '56',
    title: 'Administrative and Support and Waste Management and Remediation Services',
    description:
      'Establishments performing routine support activities for the day-to-day operations of other organizations.',
  },
  {
    code: '61',
    title: 'Educational Services',
    description:
      'Establishments that provide instruction and training in a wide variety of subjects.',
  },
  {
    code: '62',
    title: 'Health Care and Social Assistance',
    description: 'Establishments providing health care and social assistance for individuals.',
  },
  {
    code: '71',
    title: 'Arts, Entertainment, and Recreation',
    description:
      'Establishments that operate facilities or provide services to meet cultural, entertainment, and recreational interests.',
  },
  {
    code: '72',
    title: 'Accommodation and Food Services',
    description:
      'Establishments providing lodging and/or preparing meals, snacks, and beverages for immediate consumption.',
  },
  {
    code: '81',
    title: 'Other Services (except Public Administration)',
    description:
      'Establishments providing services not specifically provided for elsewhere including equipment repair, religious activities, personal care, and civic organizations.',
  },
  {
    code: '92',
    title: 'Public Administration',
    description:
      'Federal, state, and local government establishments engaged in the enactment and judicial interpretation of laws and their execution.',
  },
];

// ---------------------------------------------------------------------------
// NAICS 3-digit Subsectors — ~80 compliance-heavy subsectors
// ---------------------------------------------------------------------------
const SUBSECTORS: { code: string; title: string; sector: string }[] = [
  // Finance and Insurance (52) — all subsectors
  { code: '521', title: 'Monetary Authorities - Central Bank', sector: '52' },
  { code: '522', title: 'Credit Intermediation and Related Activities', sector: '52' },
  {
    code: '523',
    title: 'Securities, Commodity Contracts, and Other Financial Investments',
    sector: '52',
  },
  { code: '524', title: 'Insurance Carriers and Related Activities', sector: '52' },
  { code: '525', title: 'Funds, Trusts, and Other Financial Vehicles', sector: '52' },
  // Healthcare (62) — all subsectors
  { code: '621', title: 'Ambulatory Health Care Services', sector: '62' },
  { code: '622', title: 'Hospitals', sector: '62' },
  { code: '623', title: 'Nursing and Residential Care Facilities', sector: '62' },
  { code: '624', title: 'Social Assistance', sector: '62' },
  // Utilities (22) — all subsectors
  { code: '221', title: 'Utilities', sector: '22' },
  // Public Administration (92) — all subsectors
  {
    code: '921',
    title: 'Executive, Legislative, and Other General Government Support',
    sector: '92',
  },
  { code: '922', title: 'Justice, Public Order, and Safety Activities', sector: '92' },
  { code: '923', title: 'Administration of Human Resource Programs', sector: '92' },
  { code: '924', title: 'Administration of Environmental Quality Programs', sector: '92' },
  {
    code: '925',
    title: 'Administration of Housing, Urban Planning, and Community Development',
    sector: '92',
  },
  { code: '926', title: 'Administration of Economic Programs', sector: '92' },
  { code: '927', title: 'Space Research and Technology', sector: '92' },
  { code: '928', title: 'National Security and International Affairs', sector: '92' },
  // Information (51) — all subsectors
  { code: '511', title: 'Publishing Industries (except Internet)', sector: '51' },
  { code: '512', title: 'Motion Picture and Sound Recording Industries', sector: '51' },
  { code: '515', title: 'Broadcasting (except Internet)', sector: '51' },
  { code: '517', title: 'Telecommunications', sector: '51' },
  { code: '518', title: 'Data Processing, Hosting, and Related Services', sector: '51' },
  { code: '519', title: 'Other Information Services', sector: '51' },
  // Professional Services (54) — all subsectors
  { code: '541', title: 'Professional, Scientific, and Technical Services', sector: '54' },
  // Manufacturing (31-33) — selective compliance-heavy
  { code: '311', title: 'Food Manufacturing', sector: '31' },
  { code: '312', title: 'Beverage and Tobacco Product Manufacturing', sector: '31' },
  { code: '313', title: 'Textile Mills', sector: '31' },
  { code: '314', title: 'Textile Product Mills', sector: '31' },
  { code: '315', title: 'Apparel Manufacturing', sector: '31' },
  { code: '316', title: 'Leather and Allied Product Manufacturing', sector: '31' },
  { code: '321', title: 'Wood Product Manufacturing', sector: '32' },
  { code: '322', title: 'Paper Manufacturing', sector: '32' },
  { code: '323', title: 'Printing and Related Support Activities', sector: '32' },
  { code: '324', title: 'Petroleum and Coal Products Manufacturing', sector: '32' },
  { code: '325', title: 'Chemical Manufacturing', sector: '32' },
  { code: '326', title: 'Plastics and Rubber Products Manufacturing', sector: '32' },
  { code: '327', title: 'Nonmetallic Mineral Product Manufacturing', sector: '32' },
  { code: '331', title: 'Primary Metal Manufacturing', sector: '33' },
  { code: '332', title: 'Fabricated Metal Product Manufacturing', sector: '33' },
  { code: '333', title: 'Machinery Manufacturing', sector: '33' },
  { code: '334', title: 'Computer and Electronic Product Manufacturing', sector: '33' },
  {
    code: '335',
    title: 'Electrical Equipment, Appliance, and Component Manufacturing',
    sector: '33',
  },
  { code: '336', title: 'Transportation Equipment Manufacturing', sector: '33' },
  { code: '337', title: 'Furniture and Related Product Manufacturing', sector: '33' },
  { code: '339', title: 'Miscellaneous Manufacturing', sector: '33' },
  // Education (61)
  { code: '611', title: 'Educational Services', sector: '61' },
  // Transportation (48-49)
  { code: '481', title: 'Air Transportation', sector: '48' },
  { code: '482', title: 'Rail Transportation', sector: '48' },
  { code: '483', title: 'Water Transportation', sector: '48' },
  { code: '484', title: 'Truck Transportation', sector: '48' },
  { code: '485', title: 'Transit and Ground Passenger Transportation', sector: '48' },
  { code: '486', title: 'Pipeline Transportation', sector: '48' },
  { code: '487', title: 'Scenic and Sightseeing Transportation', sector: '48' },
  { code: '488', title: 'Support Activities for Transportation', sector: '48' },
  { code: '491', title: 'Postal Service', sector: '49' },
  { code: '492', title: 'Couriers and Messengers', sector: '49' },
  { code: '493', title: 'Warehousing and Storage', sector: '49' },
  // Retail (44-45)
  { code: '441', title: 'Motor Vehicle and Parts Dealers', sector: '44' },
  { code: '442', title: 'Furniture and Home Furnishings Stores', sector: '44' },
  { code: '443', title: 'Electronics and Appliance Stores', sector: '44' },
  {
    code: '444',
    title: 'Building Material and Garden Equipment and Supplies Dealers',
    sector: '44',
  },
  { code: '445', title: 'Food and Beverage Stores', sector: '44' },
  { code: '446', title: 'Health and Personal Care Stores', sector: '44' },
  { code: '447', title: 'Gasoline Stations', sector: '44' },
  { code: '448', title: 'Clothing and Clothing Accessories Stores', sector: '44' },
  {
    code: '451',
    title: 'Sporting Goods, Hobby, Musical Instrument, and Book Stores',
    sector: '45',
  },
  { code: '452', title: 'General Merchandise Stores', sector: '45' },
  { code: '453', title: 'Miscellaneous Store Retailers', sector: '45' },
  { code: '454', title: 'Nonstore Retailers', sector: '45' },
  // Wholesale (42)
  { code: '423', title: 'Merchant Wholesalers, Durable Goods', sector: '42' },
  { code: '424', title: 'Merchant Wholesalers, Nondurable Goods', sector: '42' },
  { code: '425', title: 'Wholesale Electronic Markets and Agents and Brokers', sector: '42' },
  // Real Estate (53)
  { code: '531', title: 'Real Estate', sector: '53' },
  { code: '532', title: 'Rental and Leasing Services', sector: '53' },
  {
    code: '533',
    title: 'Lessors of Nonfinancial Intangible Assets (except Copyrighted Works)',
    sector: '53',
  },
  // Agriculture (11)
  { code: '111', title: 'Crop Production', sector: '11' },
  { code: '112', title: 'Animal Production and Aquaculture', sector: '11' },
  { code: '113', title: 'Forestry and Logging', sector: '11' },
  { code: '114', title: 'Fishing, Hunting and Trapping', sector: '11' },
  { code: '115', title: 'Support Activities for Agriculture and Forestry', sector: '11' },
  // Mining (21)
  { code: '211', title: 'Oil and Gas Extraction', sector: '21' },
  { code: '212', title: 'Mining (except Oil and Gas)', sector: '21' },
  { code: '213', title: 'Support Activities for Mining', sector: '21' },
  // Construction (23)
  { code: '236', title: 'Construction of Buildings', sector: '23' },
  { code: '237', title: 'Heavy and Civil Engineering Construction', sector: '23' },
  { code: '238', title: 'Specialty Trade Contractors', sector: '23' },
  // Management (55)
  { code: '551', title: 'Management of Companies and Enterprises', sector: '55' },
  // Administrative (56)
  { code: '561', title: 'Administrative and Support Services', sector: '56' },
  { code: '562', title: 'Waste Management and Remediation Services', sector: '56' },
  // Arts/Entertainment (71)
  { code: '711', title: 'Performing Arts, Spectator Sports, and Related Industries', sector: '71' },
  { code: '712', title: 'Museums, Historical Sites, and Similar Institutions', sector: '71' },
  { code: '713', title: 'Amusement, Gambling, and Recreation Industries', sector: '71' },
  // Accommodation/Food (72)
  { code: '721', title: 'Accommodation', sector: '72' },
  { code: '722', title: 'Food Services and Drinking Places', sector: '72' },
  // Other Services (81)
  { code: '811', title: 'Repair and Maintenance', sector: '81' },
  { code: '812', title: 'Personal and Laundry Services', sector: '81' },
  {
    code: '813',
    title: 'Religious, Grantmaking, Civic, Professional, and Similar Organizations',
    sector: '81',
  },
  { code: '814', title: 'Private Households', sector: '81' },
];

// ---------------------------------------------------------------------------
// Regulations — 20 regulations mapped to industries
// ---------------------------------------------------------------------------
interface RegulationDef {
  name: string;
  fullName: string;
  description: string;
  sectors: string[]; // NAICS codes that must comply (empty = cross-industry)
}

const REGULATIONS: RegulationDef[] = [
  // Cross-industry
  {
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    description:
      'EU regulation on data protection and privacy for individuals within the EU and EEA.',
    sectors: [],
  },
  {
    name: 'CCPA',
    fullName: 'California Consumer Privacy Act',
    description:
      'California state statute to enhance privacy rights and consumer protection for residents of California.',
    sectors: [],
  },
  {
    name: 'LGPD',
    fullName: 'Lei Geral de Proteção de Dados',
    description:
      'Brazilian data protection legislation that regulates processing of personal data.',
    sectors: [],
  },
  {
    name: 'PIPEDA',
    fullName: 'Personal Information Protection and Electronic Documents Act',
    description:
      'Canadian federal privacy law governing how private sector organizations collect, use, and disclose personal information.',
    sectors: [],
  },
  {
    name: 'ISO-27001',
    fullName: 'ISO/IEC 27001 Information Security Management',
    description: 'International standard for managing information security through an ISMS.',
    sectors: [],
  },
  {
    name: 'SOX',
    fullName: 'Sarbanes-Oxley Act',
    description:
      'US federal law setting requirements for financial practices and corporate governance.',
    sectors: [],
  },
  {
    name: 'NIST-CSF',
    fullName: 'NIST Cybersecurity Framework',
    description: 'Framework for improving critical infrastructure cybersecurity.',
    sectors: [],
  },
  // Sector-specific
  {
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    description:
      'US legislation providing data privacy and security provisions for safeguarding medical information.',
    sectors: ['62'],
  },
  {
    name: 'GLBA',
    fullName: 'Gramm-Leach-Bliley Act',
    description:
      'US federal law requiring financial institutions to explain their information-sharing practices and safeguard sensitive data.',
    sectors: ['52'],
  },
  {
    name: 'DORA',
    fullName: 'Digital Operational Resilience Act',
    description:
      'EU regulation ensuring financial entities can withstand ICT-related disruptions and threats.',
    sectors: ['52'],
  },
  {
    name: 'PCI-DSS',
    fullName: 'Payment Card Industry Data Security Standard',
    description:
      'Information security standard for organizations that handle branded credit cards.',
    sectors: ['52', '44', '45'],
  },
  {
    name: 'FERPA',
    fullName: 'Family Educational Rights and Privacy Act',
    description: 'US federal law protecting the privacy of student education records.',
    sectors: ['61'],
  },
  {
    name: 'FISMA',
    fullName: 'Federal Information Security Modernization Act',
    description:
      'US legislation defining a framework for protecting government information and operations.',
    sectors: ['92', '54'],
  },
  {
    name: 'FedRAMP',
    fullName: 'Federal Risk and Authorization Management Program',
    description:
      'US government program providing a standardized approach to security assessment for cloud products and services.',
    sectors: ['54', '51'],
  },
  {
    name: 'NERC-CIP',
    fullName: 'NERC Critical Infrastructure Protection',
    description:
      "Set of requirements designed to secure the assets required for operating North America's bulk electric system.",
    sectors: ['22'],
  },
  {
    name: 'FDA-21-CFR',
    fullName: 'FDA 21 CFR Part 11',
    description:
      'US FDA regulations on electronic records and electronic signatures for pharmaceutical and medical device manufacturers.',
    sectors: ['31', '32', '33'],
  },
  {
    name: 'Basel-III',
    fullName: 'Basel III International Regulatory Framework',
    description:
      'International regulatory accord introducing measures to strengthen the regulation, supervision and risk management of banks.',
    sectors: ['522'],
  },
  {
    name: 'MiFID-II',
    fullName: 'Markets in Financial Instruments Directive II',
    description: 'EU legislative framework for securities markets improving regulation of trading.',
    sectors: ['523'],
  },
  {
    name: 'SOC2',
    fullName: 'SOC 2 Type II',
    description:
      'Auditing procedure ensuring service providers securely manage data to protect organizational interests and client privacy.',
    sectors: ['54', '51', '52'],
  },
  {
    name: 'COPPA',
    fullName: "Children's Online Privacy Protection Act",
    description:
      'US federal law imposing requirements on operators of websites or online services directed to children under 13.',
    sectors: ['54', '51'],
  },
];

// ---------------------------------------------------------------------------
// Main seeder function — idempotent (checks if tables are empty)
// ---------------------------------------------------------------------------
export async function runIndustrySeeder(): Promise<void> {
  try {
    // Check if naics_industries table has data
    const countRows = await queryRows('SELECT COUNT(*)::int as count FROM naics_industries');
    const existingCount = parseInt(countRows[0]?.count ?? '0', 10);

    if (existingCount > 0) {
      logger.info(`NAICS data already seeded (${existingCount} records) — skipping`, { job: JOB });
      return;
    }

    let created = 0;

    // Insert sectors (level 2)
    for (const s of SECTORS) {
      await execSql(
        `INSERT INTO naics_industries (code, title, description, level, parent_code, sector, version_year, last_updated, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 2, NULL, $4, 2022, NOW(), NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
        [s.code, s.title, s.description, s.code],
      );
      created++;
    }

    // Insert subsectors (level 3)
    for (const sub of SUBSECTORS) {
      await execSql(
        `INSERT INTO naics_industries (code, title, description, level, parent_code, sector, version_year, last_updated, "createdAt", "updatedAt")
         VALUES ($1, $2, NULL, 3, $3, $4, 2022, NOW(), NOW(), NOW())
         ON CONFLICT (code) DO NOTHING`,
        [sub.code, sub.title, sub.sector, sub.sector],
      );
      created++;
    }

    logger.info(
      `Seeded ${created} NAICS industries (${SECTORS.length} sectors, ${SUBSECTORS.length} subsectors)`,
      { job: JOB },
    );

    // Seed regulations as ontology relationships (regulation → industry APPLIES_TO)
    // First create regulation entries in taxonomy_nodes, then link them
    let regCount = 0;
    for (const reg of REGULATIONS) {
      const regId = generateDeterministicUuid(`reg-${reg.name}`);

      // Insert regulation as taxonomy node
      await execSql(
        `INSERT INTO taxonomy_nodes (id, parent_id, node_type, name, description, risk_tier, metadata, version, "createdAt", "updatedAt")
         VALUES ($1::uuid, NULL, 'regulation', $2, $3, 'high', $4::json, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          regId,
          reg.fullName,
          reg.description,
          JSON.stringify({
            shortName: reg.name,
            sectors: reg.sectors,
            crossIndustry: reg.sectors.length === 0,
          }),
        ],
      );

      // Link regulation to applicable industries
      if (reg.sectors.length === 0) {
        // Cross-industry: link to all sectors
        for (const s of SECTORS) {
          await execSql(
            `INSERT INTO ontology_relationships (id, subject_type, subject_id, relationship_type, object_type, object_id, weight, metadata, version, "createdAt", "updatedAt")
             VALUES ($1::uuid, 'regulation', $2, 'APPLIES_TO', 'industry', $3, 1.0, $4::json, 1, NOW(), NOW())
             ON CONFLICT ON CONSTRAINT idx_ontology_unique_rel DO NOTHING`,
            [
              generateDeterministicUuid(`rel-${reg.name}-${s.code}`),
              regId,
              s.code,
              JSON.stringify({ regulationName: reg.name }),
            ],
          );
        }
      } else {
        // Sector-specific: link to specified sectors
        for (const sectorCode of reg.sectors) {
          await execSql(
            `INSERT INTO ontology_relationships (id, subject_type, subject_id, relationship_type, object_type, object_id, weight, metadata, version, "createdAt", "updatedAt")
             VALUES ($1::uuid, 'regulation', $2, 'APPLIES_TO', 'industry', $3, 1.0, $4::json, 1, NOW(), NOW())
             ON CONFLICT ON CONSTRAINT idx_ontology_unique_rel DO NOTHING`,
            [
              generateDeterministicUuid(`rel-${reg.name}-${sectorCode}`),
              regId,
              sectorCode,
              JSON.stringify({ regulationName: reg.name }),
            ],
          );
        }
      }

      regCount++;
    }

    logger.info(`Seeded ${regCount} regulations with ontology mappings`, { job: JOB });
  } catch (err: any) {
    logger.error('Industry seeder failed', { job: JOB, error: err.message });
  }
}

// Deterministic UUID from a seed string for idempotent inserts
function generateDeterministicUuid(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = seed.length.toString(16).padStart(4, '0');
  const hex3 = seed
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0)
    .toString(16)
    .padStart(4, '0');
  const hex4 = (hash >>> 0).toString(16).padStart(12, '0');
  return `${hex.slice(0, 8)}-${hex2.slice(0, 4)}-4${hex3.slice(0, 3)}-8${hex4.slice(0, 3)}-${hex4.slice(0, 12)}`;
}
