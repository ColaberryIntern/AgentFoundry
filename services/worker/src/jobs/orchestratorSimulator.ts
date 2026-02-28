import logger from '../utils/logger';
import { queryRows, execSql } from '../utils/db';

// ---------------------------------------------------------------------------
// Simulation Engine — runs delta previews for approved actions
// ---------------------------------------------------------------------------

interface SimulationResult {
  passed: boolean;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  risks: string[];
  violations: string[];
}

async function simulateCreateVariant(params: Record<string, unknown>): Promise<SimulationResult> {
  const industryCode = params.industryCode as string;

  // Check if industry exists
  const industry = await queryRows('SELECT code, title FROM naics_industries WHERE code = $1', [
    industryCode,
  ]);

  if (industry.length === 0) {
    return {
      passed: false,
      before: {},
      after: {},
      risks: [`Industry ${industryCode} does not exist`],
      violations: ['target_not_found'],
    };
  }

  // Check existing variants for this industry
  const existingVariants = await queryRows(
    'SELECT id, name FROM agent_variants WHERE industry_code = $1',
    [industryCode],
  );

  // Find a suitable skeleton
  const skeletons = await queryRows(
    'SELECT id, name, specialization_type FROM agent_skeletons LIMIT 1',
  );

  return {
    passed: true,
    before: {
      industryCode,
      industryTitle: (industry[0] as Record<string, unknown>).title,
      existingVariants: existingVariants.length,
    },
    after: {
      industryCode,
      newVariantCount: existingVariants.length + 1,
      skeletonType:
        skeletons.length > 0
          ? (skeletons[0] as Record<string, unknown>).specialization_type
          : 'compliance_monitor',
    },
    risks: existingVariants.length > 3 ? ['Industry already has multiple variants'] : [],
    violations: [],
  };
}

async function simulateRecertifyAgent(params: Record<string, unknown>): Promise<SimulationResult> {
  const variantId = params.certId ? undefined : (params as Record<string, unknown>).variantId;
  const certId = params.certId as string | undefined;

  if (certId) {
    const cert = await queryRows(
      'SELECT id, expiry_date, best_practice_score FROM certification_records WHERE id = $1',
      [certId],
    );

    if (cert.length === 0) {
      return {
        passed: false,
        before: {},
        after: {},
        risks: ['Certificate not found'],
        violations: [],
      };
    }

    return {
      passed: true,
      before: {
        certId,
        expiryDate: (cert[0] as Record<string, unknown>).expiry_date,
        score: (cert[0] as Record<string, unknown>).best_practice_score,
      },
      after: {
        certId,
        newExpiryDate: new Date(Date.now() + 180 * 86400 * 1000).toISOString(),
        status: 'certified',
      },
      risks: [],
      violations: [],
    };
  }

  return {
    passed: true,
    before: { variantId },
    after: { status: 'recertified' },
    risks: [],
    violations: [],
  };
}

async function simulateAdjustThreshold(params: Record<string, unknown>): Promise<SimulationResult> {
  return {
    passed: true,
    before: { currentScore: params.currentScore },
    after: { adjustedThreshold: true },
    risks: [],
    violations: [],
  };
}

async function simulatePauseDeployment(params: Record<string, unknown>): Promise<SimulationResult> {
  const deploymentId = params.deploymentId || params.targetEntityId;
  return {
    passed: true,
    before: { deploymentId, activeStatus: true },
    after: { deploymentId, activeStatus: false },
    risks: ['Deployment will stop processing requests'],
    violations: [],
  };
}

async function simulateAddOntologyRelation(
  params: Record<string, unknown>,
): Promise<SimulationResult> {
  return {
    passed: true,
    before: { existingRelationships: 'current state' },
    after: { newRelationship: params },
    risks: [],
    violations: [],
  };
}

async function simulateGeneric(
  actionType: string,
  params: Record<string, unknown>,
): Promise<SimulationResult> {
  return {
    passed: true,
    before: {},
    after: { actionType, params },
    risks: [],
    violations: [],
  };
}

// ---------------------------------------------------------------------------
// Main Simulator
// ---------------------------------------------------------------------------
export async function runOrchestratorSimulator(): Promise<void> {
  // Find actions with status = 'approved' (ready for simulation)
  const actions = await queryRows(`
    SELECT id, action_type, target_entity_type, target_entity_id, parameters, intent_id
    FROM orchestrator_actions
    WHERE status = 'approved'
    ORDER BY sequence_order ASC
    LIMIT 5
  `);

  if (actions.length === 0) return;

  for (const row of actions as Array<{
    id: string;
    action_type: string;
    target_entity_type: string | null;
    target_entity_id: string | null;
    parameters: Record<string, unknown>;
    intent_id: string;
  }>) {
    try {
      // Mark as simulating
      await execSql(
        'UPDATE orchestrator_actions SET status = $1, "updatedAt" = NOW() WHERE id = $2',
        ['simulating', row.id],
      );

      let result: SimulationResult;

      const params =
        typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters;

      switch (row.action_type) {
        case 'create_variant':
          result = await simulateCreateVariant(params);
          break;
        case 'recertify_agent':
          result = await simulateRecertifyAgent(params);
          break;
        case 'adjust_threshold':
          result = await simulateAdjustThreshold(params);
          break;
        case 'pause_deployment':
          result = await simulatePauseDeployment(params);
          break;
        case 'add_ontology_relation':
          result = await simulateAddOntologyRelation(params);
          break;
        default:
          result = await simulateGeneric(row.action_type, params);
      }

      const newStatus = result.passed ? 'simulation_passed' : 'simulation_failed';

      await execSql(
        `
        UPDATE orchestrator_actions
        SET status = $1, simulation_result = $2, "updatedAt" = NOW()
        WHERE id = $3
      `,
        [newStatus, JSON.stringify(result), row.id],
      );

      // If simulation failed, log a guardrail violation
      if (!result.passed && result.violations.length > 0) {
        for (const violation of result.violations) {
          await execSql(
            `
            INSERT INTO orchestrator_guardrail_violations
              (id, action_id, guardrail_type, violation_details, severity, "createdAt")
            VALUES ($1, $2, 'risk', $3, 'block', NOW())
          `,
            [
              crypto.randomUUID(),
              row.id,
              JSON.stringify({ reason: violation, simulation: result }),
            ],
          );
        }
      }

      // Update parent intent status
      if (newStatus === 'simulation_passed') {
        await execSql(
          `
          UPDATE orchestrator_intents SET status = 'simulating', "updatedAt" = NOW() WHERE id = $1
        `,
          [row.intent_id],
        );
      }

      logger.info(`Simulation ${result.passed ? 'passed' : 'failed'}: ${row.action_type}`, {
        job: 'orchestratorSimulator',
        actionId: row.id,
      });
    } catch (err) {
      await execSql(
        `
        UPDATE orchestrator_actions
        SET status = 'simulation_failed', error_message = $1, "updatedAt" = NOW()
        WHERE id = $2
      `,
        [(err as Error).message, row.id],
      );

      logger.error(`Simulation error for action ${row.id}`, {
        job: 'orchestratorSimulator',
        error: (err as Error).message,
      });
    }
  }
}
