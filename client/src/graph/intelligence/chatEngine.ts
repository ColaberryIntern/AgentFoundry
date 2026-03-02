import type { AltitudeLevel } from '../altitude/altitudeTypes';
import type { ScopedIntelligence } from './useAltitudeScopedIntelligence';
import type { SPIResult } from './spiEngine';

const ALTITUDE_NAMES: Record<AltitudeLevel, string> = {
  GLOBAL: 'global',
  INDUSTRY: 'industry',
  USE_CASE: 'use case',
  STACK: 'stack',
  AGENT: 'agent',
};

/**
 * Client-side contextual response engine for the Agent Intelligence chat.
 * Generates altitude-scoped answers from current Redux state data.
 */
export function generateChatResponse(
  question: string,
  altitude: AltitudeLevel,
  scoped: ScopedIntelligence,
): string {
  const q = question.toLowerCase().trim();
  const ctx = scoped.contextLabel;
  const level = ALTITUDE_NAMES[altitude];

  // -- Risk / Alerts --
  if (/\b(risk|alert|danger|threat|violation)\b/.test(q)) {
    if (scoped.riskAlerts.length === 0) {
      return `At the ${level} level for **${ctx}**: No unresolved risk alerts found.`;
    }
    const blocks = scoped.riskAlerts.slice(0, 3).map((v) => {
      const type = v.guardrailType.replace(/_/g, ' ');
      return `- **${type}** (${v.severity})`;
    });
    const more =
      scoped.riskAlerts.length > 3 ? `\n- ...and ${scoped.riskAlerts.length - 3} more` : '';
    return `At the ${level} level for **${ctx}**: Found **${scoped.riskAlerts.length}** unresolved risk alert(s):\n\n${blocks.join('\n')}${more}`;
  }

  // -- Suggestions / Recommendations --
  if (/\b(suggest|recommend|what should|action|propos)\b/.test(q)) {
    if (scoped.suggestions.length === 0) {
      return `At the ${level} level for **${ctx}**: No pending suggestions at this time.`;
    }
    const items = scoped.suggestions.slice(0, 3).map((i) => {
      return `- **${i.title}** (${i.priority} priority, ${Math.round(i.confidenceScore * 100)}% confidence)`;
    });
    const more =
      scoped.suggestions.length > 3 ? `\n- ...and ${scoped.suggestions.length - 3} more` : '';
    return `At the ${level} level for **${ctx}**: Found **${scoped.suggestions.length}** suggestion(s):\n\n${items.join('\n')}${more}`;
  }

  // -- Certifications / Governance --
  if (/\b(cert|certif|expir|governance|pending|compliance)\b/.test(q)) {
    const { expiringVariants, intents: govIntents } = scoped.governance;
    const parts: string[] = [];
    if (govIntents.length > 0) {
      parts.push(
        `**${govIntents.length}** governance intent(s) (certification renewal or drift remediation)`,
      );
    }
    if (expiringVariants.length > 0) {
      const expired = expiringVariants.filter((v) => v.certificationStatus === 'expired').length;
      const pending = expiringVariants.length - expired;
      parts.push(
        `**${expiringVariants.length}** variant(s) needing attention: ${pending} pending, ${expired} expired`,
      );
    }
    if (parts.length === 0) {
      return `At the ${level} level for **${ctx}**: All certifications are in good standing.`;
    }
    return `At the ${level} level for **${ctx}**:\n\n${parts.map((p) => `- ${p}`).join('\n')}`;
  }

  // -- Expansion / Opportunities --
  if (/\b(expand|expansion|opportunit|grow|market)\b/.test(q)) {
    if (scoped.expansions.length === 0) {
      return `At the ${level} level for **${ctx}**: No expansion opportunities detected at this time.`;
    }
    const items = scoped.expansions.slice(0, 3).map((i) => {
      return `- **${i.title}** (${Math.round(i.confidenceScore * 100)}% confidence)`;
    });
    return `At the ${level} level for **${ctx}**: Found **${scoped.expansions.length}** expansion opportunity(ies):\n\n${items.join('\n')}`;
  }

  // -- SPI / Score / Priority --
  if (/\b(spi|score|priority|rank|strategic)\b/.test(q)) {
    const insights = scoped.spiInsights;
    if (!insights) {
      return `At the ${level} level for **${ctx}**: No SPI data available.`;
    }
    if (Array.isArray(insights)) {
      const top = insights
        .slice(0, 5)
        .map((r) => `- #${r.rank} **${r.title}**: SPI ${r.spiScore.toFixed(0)}`);
      return `Top strategic priorities for **${ctx}**:\n\n${top.join('\n')}`;
    }
    const r = insights as SPIResult;
    return `**${r.title}** — SPI Score: **${r.spiScore.toFixed(0)}** (Rank #${r.rank})\n\nBreakdown:\n- Coverage Gap: ${Math.round(r.breakdown.coverageGapScore)}\n- Risk Exposure: ${Math.round(r.breakdown.riskExposureScore)}\n- Revenue Proxy: ${Math.round(r.breakdown.revenueProxyScore)}\n- Cert Weakness: ${Math.round(r.breakdown.certWeaknessScore)}\n- Volatility: ${Math.round(r.breakdown.volatilityScore)}\n- Agent Saturation: ${Math.round(r.breakdown.agentSaturationScore)}\n\n**Recommended action:** ${r.recommendedAction}`;
  }

  // -- Counts / Summary --
  if (/\b(how many|count|total|summary|overview)\b/.test(q)) {
    return `**${ctx}** (${level} level) summary:\n\n- ${scoped.suggestions.length} suggestion(s)\n- ${scoped.riskAlerts.length} risk alert(s)\n- ${scoped.expansions.length} expansion opportunity(ies)\n- ${scoped.governance.expiringVariants.length} variant(s) needing cert attention\n- ${scoped.governance.intents.length} governance intent(s)`;
  }

  // -- What is / Explain --
  if (/\b(what is|tell me|explain|describe|about)\b/.test(q)) {
    const parts: string[] = [`You are viewing **${ctx}** at the ${level} level.`];
    if (scoped.totalAlertCount > 0) {
      parts.push(`There are ${scoped.totalAlertCount} total items requiring attention.`);
    } else {
      parts.push('Everything looks healthy at this level.');
    }
    const insights = scoped.spiInsights;
    if (insights && !Array.isArray(insights)) {
      parts.push(`SPI Score: ${insights.spiScore.toFixed(0)} — ${insights.recommendedAction}`);
    }
    return parts.join('\n\n');
  }

  // -- Fallback --
  return `I can help with intelligence at the **${level}** level for **${ctx}**. Try asking about:\n\n- Risks and alerts\n- Suggestions and recommendations\n- Certifications and governance\n- Expansion opportunities\n- SPI scores and priorities\n- Counts and summary`;
}
