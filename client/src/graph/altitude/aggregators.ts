import type {
  NaicsIndustry,
  UseCase,
  AgentSkeleton,
  AgentVariant,
  RiskAnalysisResult,
} from '../../types/compliance';
import type { ClusterMetrics } from './altitudeTypes';
import { EMPTY_CLUSTER_METRICS } from './altitudeTypes';

// ---------------------------------------------------------------------------
// Industry Cluster Aggregation (GLOBAL altitude)
// ---------------------------------------------------------------------------

export interface IndustryClusterAgg {
  code: string;
  title: string;
  sector: string;
  useCaseCount: number;
  stackCount: number;
  agentCount: number;
  metrics: ClusterMetrics;
}

export function aggregateIndustryClusters(
  industries: NaicsIndustry[],
  useCases: UseCase[],
  variants: AgentVariant[],
  risks: RiskAnalysisResult[],
): IndustryClusterAgg[] {
  return industries.map((industry) => {
    // Use cases in this industry
    const ucs = useCases.filter(
      (uc) => uc.industryScope && uc.industryScope.includes(industry.code),
    );

    // Variants in this industry
    const indVariants = variants.filter((v) => v.industryCode === industry.code);
    const uniqueSkeletons = new Set(indVariants.map((v) => v.skeletonId));

    const metrics = computeClusterMetrics(indVariants, risks);

    return {
      code: industry.code,
      title: industry.title,
      sector: industry.sector,
      useCaseCount: ucs.length,
      stackCount: uniqueSkeletons.size,
      agentCount: indVariants.length,
      metrics,
    };
  });
}

// ---------------------------------------------------------------------------
// Use Case Cluster Aggregation (INDUSTRY altitude)
// ---------------------------------------------------------------------------

export interface UseCaseClusterAgg {
  useCaseId: string;
  outcomeStatement: string;
  monetizationType: string;
  urgencyScore: number | null;
  stackCount: number;
  agentCount: number;
  deploymentCount: number;
  metrics: ClusterMetrics;
}

export function aggregateUseCaseClusters(
  useCases: UseCase[],
  skeletons: AgentSkeleton[],
  variants: AgentVariant[],
  ontologyLinks: Array<{ subjectId: string; objectId: string; relationshipType: string }>,
): UseCaseClusterAgg[] {
  return useCases.map((uc) => {
    // Find skeletons linked to this use case via SOLVES ontology
    const linkedSkeletonIds = ontologyLinks
      .filter(
        (link) =>
          link.relationshipType === 'SOLVES' &&
          (link.subjectId === uc.id || link.objectId === uc.id),
      )
      .map((link) => (link.subjectId === uc.id ? link.objectId : link.subjectId));

    const linkedSkeletons = skeletons.filter((sk) => linkedSkeletonIds.includes(sk.id));

    // Variants for those skeletons
    const ucVariants = variants.filter((v) => linkedSkeletons.some((sk) => sk.id === v.skeletonId));

    // Count deployments from variant embedded data
    let deploymentCount = 0;
    for (const v of ucVariants) {
      deploymentCount += v.deployments?.length ?? 0;
    }

    const metrics = computeClusterMetrics(ucVariants, []);

    return {
      useCaseId: uc.id,
      outcomeStatement: uc.outcomeStatement,
      monetizationType: uc.monetizationType,
      urgencyScore: uc.urgencyScore,
      stackCount: linkedSkeletons.length,
      agentCount: ucVariants.length,
      deploymentCount,
      metrics,
    };
  });
}

// ---------------------------------------------------------------------------
// Stack Cluster Aggregation (USE_CASE altitude)
// ---------------------------------------------------------------------------

export interface StackClusterAgg {
  skeletonId: string;
  name: string;
  specializationType: string;
  riskLevel: string;
  variantCount: number;
  metrics: ClusterMetrics;
}

export function aggregateStackClusters(
  skeletons: AgentSkeleton[],
  variants: AgentVariant[],
): StackClusterAgg[] {
  return skeletons.map((sk) => {
    const skVariants = variants.filter((v) => v.skeletonId === sk.id);
    const metrics = computeClusterMetrics(skVariants, []);

    return {
      skeletonId: sk.id,
      name: sk.name,
      specializationType: sk.specializationType,
      riskLevel: sk.riskLevel,
      variantCount: skVariants.length,
      metrics,
    };
  });
}

// ---------------------------------------------------------------------------
// Shared metric computation
// ---------------------------------------------------------------------------

function computeClusterMetrics(
  variants: AgentVariant[],
  risks: RiskAnalysisResult[],
): ClusterMetrics {
  if (variants.length === 0) return { ...EMPTY_CLUSTER_METRICS };

  const total = variants.length;
  const certified = variants.filter((v) => v.certificationStatus === 'certified').length;
  const certHealthPercent = total > 0 ? (certified / total) * 100 : 0;

  // Coverage: percentage with active deployments
  let activeDeployments = 0;
  let totalErrorCount = 0;
  let totalExecCount = 0;
  for (const v of variants) {
    const deps = v.deployments ?? [];
    activeDeployments += deps.filter((d) => d.activeStatus).length;
    for (const d of deps) {
      totalErrorCount += d.errorCount;
      totalExecCount += d.executionCount;
    }
  }
  const withDeployments = variants.filter((v) => (v.deployments?.length ?? 0) > 0).length;
  const coveragePercent = total > 0 ? (withDeployments / total) * 100 : 0;

  // Risk index: average risk score from risk analysis, or derive from cert scores
  let riskIndex = 0;
  if (risks.length > 0) {
    riskIndex = risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length;
  } else {
    // Derive from inverse of cert scores
    const scores = variants.map((v) => v.certificationScore ?? 0).filter((s) => s > 0);
    if (scores.length > 0) {
      const avgCert = scores.reduce((a, b) => a + b, 0) / scores.length;
      riskIndex = Math.max(0, 100 - avgCert);
    } else {
      riskIndex = 50; // unknown = moderate
    }
  }

  // Volatility: variance in cert scores (higher variance = more drift)
  const certScores = variants.map((v) => v.certificationScore ?? 0).filter((s) => s > 0);
  let volatilityScore = 0;
  if (certScores.length > 1) {
    const mean = certScores.reduce((a, b) => a + b, 0) / certScores.length;
    const variance = certScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / certScores.length;
    volatilityScore = Math.min(100, Math.sqrt(variance));
  }

  // Error rate
  const errorRate = totalExecCount > 0 ? totalErrorCount / totalExecCount : 0;

  return {
    totalCount: total,
    certifiedCount: certified,
    certHealthPercent: Math.round(certHealthPercent),
    riskIndex: Math.round(riskIndex),
    coveragePercent: Math.round(coveragePercent),
    volatilityScore: Math.round(volatilityScore),
    activeDeployments,
    errorRate: Math.round(errorRate * 1000) / 1000,
  };
}
