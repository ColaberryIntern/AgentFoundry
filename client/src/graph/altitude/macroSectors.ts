// ---------------------------------------------------------------------------
// Macro-Sector Registry — groups NAICS level-2 codes into spatial clusters
// ---------------------------------------------------------------------------

export type MacroSectorId =
  | 'agriculture'
  | 'energy'
  | 'utilities'
  | 'manufacturing'
  | 'retail'
  | 'transportation'
  | 'technology'
  | 'finance'
  | 'healthcare'
  | 'other'
  | 'public_sector';

export interface MacroSectorConfig {
  id: MacroSectorId;
  label: string;
  sectorCodes: string[];
  anchorAngle: number; // radians — non-uniform for organic layout
  gravityStrength: number; // forceX/forceY strength
  boundaryRadius: number; // soft cluster boundary (px)
  glowColor: string;
  jitter: { x: number; y: number };
}

// Anchor angles are intentionally non-uniform to break visual symmetry.
// Distributed roughly around 2PI but with organic spacing.
export const MACRO_SECTORS: MacroSectorConfig[] = [
  {
    id: 'finance',
    label: 'Finance & Insurance',
    sectorCodes: ['52', '53'],
    anchorAngle: 0.0,
    gravityStrength: 0.06,
    boundaryRadius: 260,
    glowColor: '#3b82f6',
    jitter: { x: 12, y: -8 },
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Professional',
    sectorCodes: ['54', '55', '56', '61', '62'],
    anchorAngle: 0.62,
    gravityStrength: 0.05,
    boundaryRadius: 300,
    glowColor: '#10b981',
    jitter: { x: -10, y: 15 },
  },
  {
    id: 'technology',
    label: 'Technology & Information',
    sectorCodes: ['51'],
    anchorAngle: 1.15,
    gravityStrength: 0.07,
    boundaryRadius: 220,
    glowColor: '#8b5cf6',
    jitter: { x: 8, y: 5 },
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing & Construction',
    sectorCodes: ['23', '31', '32', '33'],
    anchorAngle: 1.75,
    gravityStrength: 0.05,
    boundaryRadius: 280,
    glowColor: '#f59e0b',
    jitter: { x: -15, y: -12 },
  },
  {
    id: 'energy',
    label: 'Energy & Mining',
    sectorCodes: ['21'],
    anchorAngle: 2.3,
    gravityStrength: 0.07,
    boundaryRadius: 200,
    glowColor: '#ef4444',
    jitter: { x: 5, y: 10 },
  },
  {
    id: 'transportation',
    label: 'Transportation & Logistics',
    sectorCodes: ['48', '49'],
    anchorAngle: 2.85,
    gravityStrength: 0.06,
    boundaryRadius: 240,
    glowColor: '#06b6d4',
    jitter: { x: -8, y: -5 },
  },
  {
    id: 'retail',
    label: 'Retail & Wholesale',
    sectorCodes: ['42', '44', '45'],
    anchorAngle: 3.4,
    gravityStrength: 0.06,
    boundaryRadius: 260,
    glowColor: '#ec4899',
    jitter: { x: 10, y: -10 },
  },
  {
    id: 'agriculture',
    label: 'Agriculture & Forestry',
    sectorCodes: ['11'],
    anchorAngle: 3.95,
    gravityStrength: 0.07,
    boundaryRadius: 200,
    glowColor: '#22c55e',
    jitter: { x: -12, y: 8 },
  },
  {
    id: 'utilities',
    label: 'Utilities',
    sectorCodes: ['22'],
    anchorAngle: 4.5,
    gravityStrength: 0.07,
    boundaryRadius: 190,
    glowColor: '#eab308',
    jitter: { x: 6, y: -14 },
  },
  {
    id: 'public_sector',
    label: 'Public Sector',
    sectorCodes: ['92'],
    anchorAngle: 5.1,
    gravityStrength: 0.06,
    boundaryRadius: 220,
    glowColor: '#6366f1',
    jitter: { x: -5, y: 12 },
  },
  {
    id: 'other',
    label: 'Services & Other',
    sectorCodes: ['71', '72', '81'],
    anchorAngle: 5.7,
    gravityStrength: 0.06,
    boundaryRadius: 250,
    glowColor: '#a855f7',
    jitter: { x: 14, y: 6 },
  },
];

// Fast lookup: sector code → MacroSectorConfig
const sectorToMacroMap = new Map<string, MacroSectorConfig>();
for (const ms of MACRO_SECTORS) {
  for (const code of ms.sectorCodes) {
    sectorToMacroMap.set(code, ms);
  }
}

/**
 * Resolve a NAICS level-2 sector code to its macro-sector config.
 * Falls back to 'other' for unknown codes.
 */
export function getMacroSector(sectorCode: string): MacroSectorConfig {
  return sectorToMacroMap.get(sectorCode) ?? MACRO_SECTORS.find((m) => m.id === 'other')!;
}

/**
 * Compute the anchor position for a macro-sector on a ring of given radius.
 */
export function computeClusterAnchor(
  sector: MacroSectorConfig,
  ringRadius: number,
): { x: number; y: number } {
  return {
    x: Math.cos(sector.anchorAngle) * ringRadius + sector.jitter.x,
    y: Math.sin(sector.anchorAngle) * ringRadius + sector.jitter.y,
  };
}
