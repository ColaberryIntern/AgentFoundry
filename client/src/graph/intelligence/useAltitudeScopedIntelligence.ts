import { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useSPIRankings } from './useSPIRankings';
import type { SPIResult } from './spiEngine';
import type { AltitudeLevel, AltitudeContext } from '../altitude/altitudeTypes';
import type { OrchestratorIntent, GuardrailViolation } from '../../types/orchestrator';
import type { AgentVariant } from '../../types/compliance';

// ---------------------------------------------------------------------------
// Return Type
// ---------------------------------------------------------------------------

export interface ScopedIntelligence {
  suggestions: OrchestratorIntent[];
  riskAlerts: GuardrailViolation[];
  expansions: OrchestratorIntent[];
  governance: {
    intents: OrchestratorIntent[];
    expiringVariants: AgentVariant[];
  };
  spiInsights: SPIResult | SPIResult[] | null;
  contextLabel: string;
  scopeNote: string | null;
  totalAlertCount: number;
  altitude: AltitudeLevel;
  altitudeContext: AltitudeContext;
}

// ---------------------------------------------------------------------------
// Scoping helpers
// ---------------------------------------------------------------------------

function matchesContext(intent: OrchestratorIntent, field: string, value: string): boolean {
  if (!intent.context) return false;
  return (intent.context as Record<string, unknown>)[field] === value;
}

function filterIntentsByContext(
  intents: OrchestratorIntent[],
  altitude: AltitudeLevel,
  ctx: AltitudeContext,
  statusFilter?: (i: OrchestratorIntent) => boolean,
): { matched: OrchestratorIntent[]; fallback: boolean } {
  const base = statusFilter ? intents.filter(statusFilter) : intents;

  if (altitude === 'GLOBAL') return { matched: base, fallback: false };

  // Try strict context match at the deepest available level
  const contextFields: [string, string | null][] = [
    ['variantId', ctx.variantId],
    ['skeletonId', ctx.skeletonId],
    ['useCaseId', ctx.useCaseId],
    ['industryCode', ctx.industryCode],
  ];

  for (const [field, value] of contextFields) {
    if (!value) continue;
    const strict = base.filter((i) => matchesContext(i, field, value));
    if (strict.length > 0) return { matched: strict, fallback: false };
  }

  // Fallback: return all with a note
  return { matched: base, fallback: true };
}

function scopeVariants(
  variants: AgentVariant[],
  altitude: AltitudeLevel,
  ctx: AltitudeContext,
  ontologyRelationships: { subjectId: string; objectId: string; relationshipType: string }[],
  skeletons: { id: string }[],
): AgentVariant[] {
  if (altitude === 'GLOBAL') return variants;

  if (ctx.variantId) {
    return variants.filter((v) => v.id === ctx.variantId);
  }

  if (ctx.skeletonId) {
    return variants.filter((v) => v.skeletonId === ctx.skeletonId);
  }

  if (ctx.useCaseId) {
    // Find skeletons linked to this use case via SOLVES relationship
    const linkedSkeletonIds = ontologyRelationships
      .filter(
        (r) =>
          r.relationshipType === 'SOLVES' &&
          (r.subjectId === ctx.useCaseId || r.objectId === ctx.useCaseId),
      )
      .map((r) => (r.subjectId === ctx.useCaseId ? r.objectId : r.subjectId));
    const skIds = new Set(
      linkedSkeletonIds.length > 0 ? linkedSkeletonIds : skeletons.map((s) => s.id),
    );
    return variants.filter((v) => skIds.has(v.skeletonId));
  }

  if (ctx.industryCode) {
    return variants.filter((v) => v.industryCode === ctx.industryCode);
  }

  return variants;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAltitudeScopedIntelligence(): ScopedIntelligence {
  const { currentAltitude, altitudeContext } = useAppSelector((s) => s.graph);
  const ontologyRelationships = useAppSelector((s) => s.graph.ontology.relationships);
  const { intents, violations } = useAppSelector((s) => s.orchestrator);
  const { industries, useCases, skeletons, variants } = useAppSelector((s) => s.registry);
  const { globalTop5, sectorTop5, industryDetail, allRanked } = useSPIRankings();

  return useMemo((): ScopedIntelligence => {
    const altitude = currentAltitude;
    const ctx = altitudeContext;

    // -- Context label --
    let contextLabel = 'Global Intelligence';
    if (ctx.variantId) {
      const v = variants.find((v) => v.id === ctx.variantId);
      contextLabel = v?.name ?? ctx.variantId;
    } else if (ctx.skeletonId) {
      const sk = skeletons.find((s) => s.id === ctx.skeletonId);
      contextLabel = sk?.name ?? ctx.skeletonId;
    } else if (ctx.useCaseId) {
      const uc = useCases.find((u) => u.id === ctx.useCaseId);
      contextLabel = uc
        ? uc.outcomeStatement.length > 40
          ? uc.outcomeStatement.slice(0, 37) + '...'
          : uc.outcomeStatement
        : ctx.useCaseId;
    } else if (ctx.industryCode) {
      const ind = industries.find((i) => i.code === ctx.industryCode);
      contextLabel = ind?.title ?? ctx.industryCode;
    }

    // -- Suggestions --
    const isSuggestion = (i: OrchestratorIntent) =>
      i.status === 'proposed' || i.status === 'detected';
    const sugResult = filterIntentsByContext(intents, altitude, ctx, isSuggestion);

    // -- Expansions --
    const isExpansion = (i: OrchestratorIntent) => i.intentType === 'expansion_opportunity';
    const expResult = filterIntentsByContext(intents, altitude, ctx, isExpansion);

    // -- Governance intents --
    const isGovernance = (i: OrchestratorIntent) =>
      i.intentType === 'certification_renewal' || i.intentType === 'drift_remediation';
    const govResult = filterIntentsByContext(intents, altitude, ctx, isGovernance);

    // -- Risk alerts (violations) --
    const unresolvedViolations = violations.filter((v) => !v.resolved);
    // Violations don't have a context field, so at sub-global show all
    const riskAlerts = unresolvedViolations;

    // -- Governance variants --
    const scopedVars = scopeVariants(
      variants,
      altitude,
      ctx,
      ontologyRelationships.map((r) => ({
        subjectId: r.subjectId,
        objectId: r.objectId,
        relationshipType: r.relationshipType,
      })),
      skeletons,
    );
    const expiringVariants = scopedVars.filter(
      (v) => v.certificationStatus === 'pending' || v.certificationStatus === 'expired',
    );

    // -- SPI insights --
    let spiInsights: SPIResult | SPIResult[] | null = null;
    if (industryDetail) {
      spiInsights = industryDetail;
    } else if (sectorTop5.length > 0) {
      spiInsights = sectorTop5;
    } else {
      spiInsights = globalTop5;
    }

    // -- Scope note --
    const hasFallback = sugResult.fallback || expResult.fallback || govResult.fallback;
    const scopeNote = hasFallback ? 'Showing all — no context-specific data found' : null;

    // -- Total alert count --
    const totalAlertCount =
      sugResult.matched.length +
      riskAlerts.length +
      expResult.matched.length +
      expiringVariants.length;

    return {
      suggestions: sugResult.matched,
      riskAlerts,
      expansions: expResult.matched,
      governance: {
        intents: govResult.matched,
        expiringVariants,
      },
      spiInsights,
      contextLabel,
      scopeNote,
      totalAlertCount,
      altitude,
      altitudeContext: ctx,
    };
  }, [
    currentAltitude,
    altitudeContext,
    intents,
    violations,
    industries,
    useCases,
    skeletons,
    variants,
    ontologyRelationships,
    globalTop5,
    sectorTop5,
    industryDetail,
    allRanked,
  ]);
}
