import logger from '../utils/logger';
import { queryRows, execSql } from '../utils/db';

// ---------------------------------------------------------------------------
// Signal Detectors — SQL-based analysis of registry state
// ---------------------------------------------------------------------------

interface IntentCandidate {
  intentType: string;
  sourceSignal: string;
  priority: string;
  confidenceScore: number;
  title: string;
  description: string;
  context: Record<string, unknown>;
  actions: Array<{
    actionType: string;
    targetEntityType?: string;
    targetEntityId?: string;
    parameters: Record<string, unknown>;
  }>;
}

async function loadSetting(key: string): Promise<unknown> {
  const rows = await queryRows(
    'SELECT setting_value FROM orchestrator_settings WHERE setting_key = $1',
    [key],
  );
  if (rows.length === 0) return null;
  const val = (rows[0] as { setting_value: unknown }).setting_value;
  // PostgreSQL JSON columns return parsed objects; handle string fallback
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

async function isSettingEnabled(key: string): Promise<boolean> {
  const val = await loadSetting(key);
  return val === true;
}

// ── Gap Coverage Detector ──
async function detectGapCoverage(): Promise<IntentCandidate[]> {
  const enabled = await isSettingEnabled('auto_gap_detection');
  if (!enabled) return [];

  const uncovered = await queryRows(`
    SELECT ni.code, ni.title FROM naics_industries ni
    WHERE ni.level = 2
      AND ni.code NOT IN (
        SELECT DISTINCT industry_code FROM agent_variants WHERE industry_code IS NOT NULL
      )
  `);

  return (uncovered as Array<{ code: string; title: string }>).map((ind) => ({
    intentType: 'gap_coverage',
    sourceSignal: 'orchestrator_scan:gap_coverage',
    priority: 'medium',
    confidenceScore: 0.85,
    title: `Coverage gap: ${ind.title} (NAICS ${ind.code})`,
    description: `Industry ${ind.title} has no agent variant coverage. Consider creating a compliance monitor variant for this sector.`,
    context: { industryCode: ind.code, industryTitle: ind.title },
    actions: [
      {
        actionType: 'create_variant',
        targetEntityType: 'naics_industry',
        targetEntityId: ind.code,
        parameters: { industryCode: ind.code, industryTitle: ind.title },
      },
    ],
  }));
}

// ── Drift Remediation Detector ──
async function detectDriftRemediation(): Promise<IntentCandidate[]> {
  const enabled = await isSettingEnabled('auto_drift_remediation');
  if (!enabled) return [];

  const threshold = ((await loadSetting('max_drift_threshold')) as number) || 15;
  const minScore = 100 - threshold;

  const drifting = await queryRows(
    `
    SELECT di.id, di.performance_score, di.agent_variant_id, av.name
    FROM deployment_instances di
    JOIN agent_variants av ON av.id = di.agent_variant_id
    WHERE di.active_status = true AND di.performance_score IS NOT NULL AND di.performance_score < $1
  `,
    [minScore],
  );

  return (
    drifting as Array<{
      id: string;
      performance_score: number;
      agent_variant_id: string;
      name: string;
    }>
  ).map((d) => ({
    intentType: 'drift_remediation' as const,
    sourceSignal: 'orchestrator_scan:drift_remediation',
    priority: d.performance_score < 30 ? 'critical' : d.performance_score < 50 ? 'high' : 'medium',
    confidenceScore: 0.9,
    title: `Drift detected: ${d.name} (score: ${d.performance_score?.toFixed(1)})`,
    description: `Deployment ${d.id.slice(0, 8)} performance has dropped to ${d.performance_score?.toFixed(1)}%. Threshold is ${minScore}%.`,
    context: { deploymentId: d.id, performanceScore: d.performance_score, variantName: d.name },
    actions: [
      {
        actionType: d.performance_score < 30 ? 'pause_deployment' : 'adjust_threshold',
        targetEntityType: 'deployment_instance',
        targetEntityId: d.id,
        parameters: { currentScore: d.performance_score, variantId: d.agent_variant_id },
      },
    ],
  }));
}

// ── Certification Renewal Detector ──
async function detectCertificationRenewal(): Promise<IntentCandidate[]> {
  const certs = await queryRows(`
    SELECT cr.id, cr.agent_variant_id, cr.compliance_framework, cr.expiry_date, av.name
    FROM certification_records cr
    JOIN agent_variants av ON av.id = cr.agent_variant_id
    WHERE cr.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      AND av.certification_status = 'certified'
  `);

  return (
    certs as Array<{
      id: string;
      agent_variant_id: string;
      compliance_framework: string;
      expiry_date: string;
      name: string;
    }>
  ).map((c) => {
    const daysLeft = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (86400 * 1000));
    return {
      intentType: 'certification_renewal',
      sourceSignal: 'orchestrator_scan:certification_renewal',
      priority: daysLeft <= 7 ? 'critical' : daysLeft <= 14 ? 'high' : 'medium',
      confidenceScore: 0.95,
      title: `Certification expiring: ${c.name} (${c.compliance_framework}, ${daysLeft}d)`,
      description: `Certification for ${c.name} under ${c.compliance_framework} expires in ${daysLeft} days.`,
      context: {
        certId: c.id,
        variantId: c.agent_variant_id,
        framework: c.compliance_framework,
        daysLeft,
      },
      actions: [
        {
          actionType: 'recertify_agent',
          targetEntityType: 'agent_variant',
          targetEntityId: c.agent_variant_id,
          parameters: { certId: c.id, framework: c.compliance_framework },
        },
      ],
    };
  });
}

// ── Expansion Opportunity Detector ──
async function detectExpansionOpportunities(): Promise<IntentCandidate[]> {
  const useCases = await queryRows(`
    SELECT id, outcome_statement, urgency_score, industry_scope
    FROM use_cases
    WHERE status = 'active' AND urgency_score > 0.7
    ORDER BY urgency_score DESC
    LIMIT 20
  `);

  const coveredCodes = await queryRows(`
    SELECT DISTINCT industry_code FROM agent_variants WHERE industry_code IS NOT NULL
  `);
  const covered = new Set(
    (coveredCodes as Array<{ industry_code: string }>).map((r) => r.industry_code),
  );

  const intents: IntentCandidate[] = [];
  for (const uc of useCases as Array<{
    id: string;
    outcome_statement: string;
    urgency_score: number;
    industry_scope: string[] | null;
  }>) {
    const scope = uc.industry_scope || [];
    const uncoveredInScope = scope.filter((code) => !covered.has(code));
    if (uncoveredInScope.length > 0) {
      intents.push({
        intentType: 'expansion_opportunity',
        sourceSignal: 'orchestrator_scan:expansion_opportunity',
        priority: uc.urgency_score >= 0.9 ? 'high' : 'medium',
        confidenceScore: uc.urgency_score,
        title: `Expansion: ${uc.outcome_statement.slice(0, 80)}`,
        description: `Use case "${uc.outcome_statement}" could expand to ${uncoveredInScope.length} additional industries.`,
        context: {
          useCaseId: uc.id,
          uncoveredIndustries: uncoveredInScope,
          urgency: uc.urgency_score,
        },
        actions: uncoveredInScope.slice(0, 3).map((code) => ({
          actionType: 'create_variant' as const,
          targetEntityType: 'naics_industry',
          targetEntityId: code,
          parameters: { industryCode: code, useCaseId: uc.id },
        })),
      });
    }
  }

  return intents;
}

// ── Risk Mitigation Detector ──
async function detectRiskMitigation(): Promise<IntentCandidate[]> {
  const highRisk = await queryRows(`
    SELECT tn.id, tn.name, tn.risk_tier, tn.metadata
    FROM taxonomy_nodes tn
    WHERE tn.risk_tier IN ('high', 'critical') AND tn.node_type = 'industry'
  `);

  const coveredCodes = await queryRows(`
    SELECT DISTINCT industry_code FROM agent_variants WHERE industry_code IS NOT NULL
  `);
  const covered = new Set(
    (coveredCodes as Array<{ industry_code: string }>).map((r) => r.industry_code),
  );

  const intents: IntentCandidate[] = [];
  for (const node of highRisk as Array<{
    id: string;
    name: string;
    risk_tier: string;
    metadata: Record<string, unknown> | null;
  }>) {
    // Check if industry matching this taxonomy node has coverage
    const naicsMatch = await queryRows(
      'SELECT code FROM naics_industries WHERE title = $1 AND level = 2 LIMIT 1',
      [node.name],
    );
    if (naicsMatch.length > 0) {
      const code = (naicsMatch[0] as { code: string }).code;
      if (!covered.has(code)) {
        intents.push({
          intentType: 'risk_mitigation',
          sourceSignal: 'orchestrator_scan:risk_mitigation',
          priority: node.risk_tier === 'critical' ? 'critical' : 'high',
          confidenceScore: 0.9,
          title: `High-risk gap: ${node.name} (${node.risk_tier})`,
          description: `${node.risk_tier}-risk industry ${node.name} has no agent coverage.`,
          context: { taxonomyNodeId: node.id, riskTier: node.risk_tier, industryCode: code },
          actions: [
            {
              actionType: 'create_variant',
              targetEntityType: 'naics_industry',
              targetEntityId: code,
              parameters: { industryCode: code, riskTier: node.risk_tier },
            },
          ],
        });
      }
    }
  }

  return intents;
}

// ── Ontology Evolution Detector ──
async function detectOntologyEvolution(): Promise<IntentCandidate[]> {
  const enabled = await isSettingEnabled('allow_ontology_evolution');
  if (!enabled) return [];

  // Find skeletons without COMPLIES_WITH relationships
  const orphanSkeletons = await queryRows(`
    SELECT as2.id, as2.name FROM agent_skeletons as2
    WHERE as2.id NOT IN (
      SELECT subject_id FROM ontology_relationships
      WHERE subject_type = 'agent_skeleton' AND relationship_type = 'COMPLIES_WITH'
    )
  `);

  return (orphanSkeletons as Array<{ id: string; name: string }>).map((s) => ({
    intentType: 'ontology_evolution' as const,
    sourceSignal: 'orchestrator_scan:ontology_evolution',
    priority: 'low' as const,
    confidenceScore: 0.7,
    title: `Missing ontology: ${s.name} has no compliance relationships`,
    description: `Agent skeleton "${s.name}" has no COMPLIES_WITH relationships to regulations.`,
    context: { skeletonId: s.id, skeletonName: s.name },
    actions: [
      {
        actionType: 'add_ontology_relation',
        targetEntityType: 'agent_skeleton',
        targetEntityId: s.id,
        parameters: { skeletonName: s.name, relationshipType: 'COMPLIES_WITH' },
      },
    ],
  }));
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------
async function isDuplicate(intentType: string, targetId: string | undefined): Promise<boolean> {
  if (!targetId) return false;
  const existing = await queryRows(
    `
    SELECT id FROM orchestrator_intents
    WHERE intent_type = $1
      AND status NOT IN ('completed', 'failed', 'cancelled', 'rejected')
      AND context::text LIKE $2
    LIMIT 1
  `,
    [intentType, `%${targetId}%`],
  );
  return existing.length > 0;
}

// ---------------------------------------------------------------------------
// Main Scan Function
// ---------------------------------------------------------------------------
export async function runOrchestratorScan(): Promise<void> {
  const scanId = crypto.randomUUID();
  const startedAt = new Date();

  await execSql(
    `
    INSERT INTO orchestrator_scan_log (id, scan_type, started_at, "createdAt")
    VALUES ($1, 'full', $2, $2)
  `,
    [scanId, startedAt.toISOString()],
  );

  let intentsDetected = 0;
  let actionsCreated = 0;
  let guardrailsTriggered = 0;

  try {
    // Run all signal detectors
    const allCandidates: IntentCandidate[] = [];

    const [gaps, drift, certs, expansion, risk, ontology] = await Promise.all([
      detectGapCoverage(),
      detectDriftRemediation(),
      detectCertificationRenewal(),
      detectExpansionOpportunities(),
      detectRiskMitigation(),
      detectOntologyEvolution(),
    ]);

    allCandidates.push(...gaps, ...drift, ...certs, ...expansion, ...risk, ...ontology);

    // Check concurrent action limit
    const maxConcurrent = ((await loadSetting('max_concurrent_actions')) as number) || 3;
    const activeActions = await queryRows(`
      SELECT COUNT(*) as cnt FROM orchestrator_actions
      WHERE status IN ('approved', 'simulating', 'executing')
    `);
    const currentActive = (activeActions[0] as { cnt: number }).cnt;

    // Check daily budget
    const maxDaily = ((await loadSetting('max_daily_token_budget')) as number) || 1000;
    const todayActions = await queryRows(
      `
      SELECT COUNT(*) as cnt FROM orchestrator_actions
      WHERE "createdAt" >= $1
    `,
      [new Date(new Date().setHours(0, 0, 0, 0)).toISOString()],
    );
    const todayCount = (todayActions[0] as { cnt: number }).cnt;

    if (todayCount >= maxDaily) {
      guardrailsTriggered++;
      logger.warn('Daily action budget exceeded, skipping intent creation', {
        job: 'orchestratorScan',
        todayCount,
        maxDaily,
      });
    } else {
      // Determine autonomy mode
      const autonomyLevel = ((await loadSetting('autonomy_level')) as string) || 'advisory';
      const productionApproval = await isSettingEnabled('approval_required_production');

      for (const candidate of allCandidates) {
        // Deduplicate
        const targetId = candidate.actions[0]?.targetEntityId;
        if (await isDuplicate(candidate.intentType, targetId)) continue;

        // Check concurrent limit
        if (currentActive + actionsCreated >= maxConcurrent) {
          guardrailsTriggered++;
          break;
        }

        // Create intent
        const intentId = crypto.randomUUID();
        await execSql(
          `
          INSERT INTO orchestrator_intents
            (id, intent_type, source_signal, priority, confidence_score, title, description, context, recommended_actions, status, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        `,
          [
            intentId,
            candidate.intentType,
            candidate.sourceSignal,
            candidate.priority,
            candidate.confidenceScore,
            candidate.title,
            candidate.description,
            JSON.stringify(candidate.context),
            JSON.stringify(candidate.actions),
            'proposed',
          ],
        );
        intentsDetected++;

        // Create actions
        for (let i = 0; i < candidate.actions.length; i++) {
          const action = candidate.actions[i];
          const autoApprove =
            autonomyLevel === 'full_autonomous' ||
            (autonomyLevel === 'semi_autonomous' &&
              candidate.confidenceScore > 0.8 &&
              candidate.priority !== 'critical');

          const needsApproval = productionApproval || !autoApprove;
          const actionStatus = needsApproval ? 'awaiting_approval' : 'approved';

          await execSql(
            `
            INSERT INTO orchestrator_actions
              (id, intent_id, action_type, target_entity_type, target_entity_id, parameters, status, requires_approval, sequence_order, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          `,
            [
              crypto.randomUUID(),
              intentId,
              action.actionType,
              action.targetEntityType || null,
              action.targetEntityId || null,
              JSON.stringify(action.parameters),
              actionStatus,
              needsApproval,
              i,
            ],
          );
          actionsCreated++;
        }
      }
    }

    // Complete scan log
    await execSql(
      `
      UPDATE orchestrator_scan_log
      SET completed_at = NOW(), intents_detected = $1, actions_created = $2, guardrails_triggered = $3,
          scan_context = $4
      WHERE id = $5
    `,
      [
        intentsDetected,
        actionsCreated,
        guardrailsTriggered,
        JSON.stringify({
          detectorResults: {
            gaps: gaps.length,
            drift: drift.length,
            certs: certs.length,
            expansion: expansion.length,
            risk: risk.length,
            ontology: ontology.length,
          },
        }),
        scanId,
      ],
    );

    if (intentsDetected > 0) {
      logger.info(
        `Orchestrator scan complete: ${intentsDetected} intents, ${actionsCreated} actions`,
        {
          job: 'orchestratorScan',
        },
      );
    }
  } catch (err) {
    await execSql(
      `
      UPDATE orchestrator_scan_log
      SET completed_at = NOW(), error_message = $1,
          intents_detected = $2, actions_created = $3, guardrails_triggered = $4
      WHERE id = $5
    `,
      [(err as Error).message, intentsDetected, actionsCreated, guardrailsTriggered, scanId],
    );

    throw err;
  }
}
