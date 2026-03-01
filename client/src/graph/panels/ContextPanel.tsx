import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { closeContextPanel } from '../state/graphSlice';
import type {
  GraphNodeType,
  GraphNodeData,
  IndustryNodeData,
  UseCaseNodeData,
  SkeletonNodeData,
  VariantNodeData,
  CertificationNodeData,
  DeploymentNodeData,
  RiskNodeData,
  MarketplaceNodeData,
} from '../types/graphTypes';
import { NODE_TYPE_LABELS } from '../types/graphTypes';
import { EmptyPanel } from './EmptyPanel';
import { IndustryPanel } from './IndustryPanel';
import { UseCasePanel } from './UseCasePanel';
import { StackPanel } from './StackPanel';
import { AgentPanel } from './AgentPanel';
import { CertificationPanel } from './CertificationPanel';
import { DeploymentPanel } from './DeploymentPanel';
import { MarketplacePanel } from './MarketplacePanel';

function renderPanelContent(nodeType: GraphNodeType, data: GraphNodeData) {
  switch (nodeType) {
    case 'industry':
      return <IndustryPanel data={data as IndustryNodeData} />;
    case 'useCase':
      return <UseCasePanel data={data as UseCaseNodeData} />;
    case 'skeleton':
      return <StackPanel data={data as SkeletonNodeData} />;
    case 'variant':
      return <AgentPanel data={data as VariantNodeData} />;
    case 'certification':
      return <CertificationPanel data={data as CertificationNodeData} />;
    case 'deployment':
      return <DeploymentPanel data={data as DeploymentNodeData} />;
    case 'risk':
      return <RiskPanel data={data as RiskNodeData} />;
    case 'marketplace':
      return <MarketplacePanel data={data as MarketplaceNodeData} />;
    default:
      return <EmptyPanel />;
  }
}

// Simple inline risk panel since it wasn't created separately
function RiskPanel({ data }: { data: RiskNodeData }) {
  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400',
    high: 'bg-orange-500/15 text-orange-400',
    medium: 'bg-amber-500/15 text-amber-400',
    low: 'bg-emerald-500/15 text-emerald-400',
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-bold text-[var(--text-primary)]">{data.label}</div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${severityColors[data.severity] ?? severityColors.medium}`}
        >
          {data.severity}
        </span>
        <span className="text-xs text-[var(--text-muted)]">{data.category}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <div className="text-[10px] text-[var(--text-muted)]">Risk</div>
          <div className="text-lg font-bold text-red-400">{Math.round(data.riskScore)}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <div className="text-[10px] text-[var(--text-muted)]">Likelihood</div>
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {data.likelihood.toFixed(1)}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
          <div className="text-[10px] text-[var(--text-muted)]">Impact</div>
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {data.impact.toFixed(1)}
          </div>
        </div>
      </div>
      {data.regulation && (
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Regulation
          </div>
          <div className="text-sm text-[var(--text-primary)]">{data.regulation}</div>
        </div>
      )}
    </div>
  );
}

export function ContextPanel() {
  const dispatch = useAppDispatch();
  const { contextPanelNodeId, contextPanelNodeType } = useAppSelector((s) => s.graph);

  // Find node data from the graph nodes
  const { nodes } = useGraphNodes();
  const selectedNode = nodes.find((n) => n.id === contextPanelNodeId);

  if (!contextPanelNodeId || !contextPanelNodeType || !selectedNode) {
    return (
      <div className="w-[380px] h-full border-l border-white/5 bg-[var(--surface-primary)] p-4">
        <EmptyPanel />
      </div>
    );
  }

  return (
    <div className="w-[380px] h-full border-l border-white/5 bg-[var(--surface-primary)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
          {NODE_TYPE_LABELS[contextPanelNodeType]}
        </div>
        <button
          onClick={() => dispatch(closeContextPanel())}
          className="p-1 rounded-md hover:bg-white/5 text-[var(--text-muted)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderPanelContent(contextPanelNodeType, selectedNode.data)}
      </div>
    </div>
  );
}

// Helper hook to access graph nodes from useGraphData
// This avoids circular dependency by reading directly from store
function useGraphNodes() {
  const { industries, useCases, skeletons, variants } = useAppSelector((s) => s.registry);
  const { marketplace } = useAppSelector((s) => s.orchestrator);
  const { riskAnalysis } = useAppSelector((s) => s.compliance);

  // Build a minimal node list for panel data lookup
  const nodes = [
    ...industries.map((ind) => ({
      id: `industry-${ind.code}`,
      data: {
        nodeType: 'industry' as const,
        label: ind.title,
        code: ind.code,
        title: ind.title,
        sector: ind.sector,
        level: ind.level,
        useCaseCount: useCases.filter((uc) => uc.industryScope?.includes(ind.code)).length,
        variantCount: variants.filter((v) => v.industryCode === ind.code).length,
        certifiedCount: variants.filter(
          (v) => v.industryCode === ind.code && v.certificationStatus === 'certified',
        ).length,
        emphasis: 'primary' as const,
        selected: false,
        opacity: 1,
      } as GraphNodeData,
    })),
    ...useCases.map((uc) => ({
      id: `usecase-${uc.id}`,
      data: {
        nodeType: 'useCase' as const,
        label: uc.outcomeStatement,
        outcomeStatement: uc.outcomeStatement,
        monetizationType: uc.monetizationType,
        urgencyScore: uc.urgencyScore,
        regulatoryScope: uc.regulatoryScope ?? [],
        industryScope: uc.industryScope ?? [],
        kpi: uc.measurableKpi,
        status: uc.status,
        emphasis: 'primary' as const,
        selected: false,
        opacity: 1,
      } as GraphNodeData,
    })),
    ...skeletons.map((sk) => ({
      id: `skeleton-${sk.id}`,
      data: {
        nodeType: 'skeleton' as const,
        label: sk.name,
        name: sk.name,
        specializationType: sk.specializationType,
        capabilities: sk.coreCapabilities ?? [],
        riskLevel: sk.riskLevel,
        variantCount: variants.filter((v) => v.skeletonId === sk.id).length,
        emphasis: 'primary' as const,
        selected: false,
        opacity: 1,
      } as GraphNodeData,
    })),
    ...variants.map((v) => ({
      id: `variant-${v.id}`,
      data: {
        nodeType: 'variant' as const,
        label: v.name,
        name: v.name,
        industryCode: v.industryCode,
        certificationStatus: v.certificationStatus,
        certificationScore: v.certificationScore,
        skeletonId: v.skeletonId,
        skeletonName: skeletons.find((sk) => sk.id === v.skeletonId)?.name,
        emphasis: 'primary' as const,
        selected: false,
        opacity: 1,
      } as GraphNodeData,
    })),
    ...(riskAnalysis ?? []).map((r) => ({
      id: `risk-${r.id}`,
      data: {
        nodeType: 'risk' as const,
        label: r.title,
        severity: r.severity,
        likelihood: r.likelihood,
        impact: r.impact,
        riskScore: r.riskScore,
        category: r.category,
        regulation: r.regulation,
        emphasis: 'primary' as const,
        selected: false,
        opacity: 1,
      } as GraphNodeData,
    })),
    ...(marketplace ?? []).map((m) => ({
      id: `market-${m.id}`,
      data: {
        nodeType: 'marketplace' as const,
        label: m.submissionName,
        submissionName: m.submissionName,
        marketplaceStatus: m.status,
        certificationRequired: m.certificationRequired,
        variantId: m.agentVariantId,
        submitterId: m.submitterId,
        emphasis: 'primary' as const,
        selected: false,
        opacity: 1,
      } as GraphNodeData,
    })),
  ];

  return { nodes };
}
