import { queryRows, execSql } from '../utils/db';
import logger from '../utils/logger';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ===========================================================================
// 1. NAICS Update Agent — Quarterly
//    Checks version staleness, flags outdated NAICS data
// ===========================================================================
export async function runNaicsUpdateAgent(): Promise<void> {
  const JOB = 'naicsUpdateAgent';
  try {
    const rows = await queryRows(
      'SELECT DISTINCT version_year FROM naics_industries ORDER BY version_year DESC LIMIT 1',
    );
    const currentVersion = rows[0]?.version_year ?? 0;
    const currentYear = new Date().getFullYear();

    // NAICS revisions happen every 5 years (2017, 2022, 2027)
    const isStale = currentYear - currentVersion >= 3;

    await execSql(
      `INSERT INTO system_intelligence (id, metric_type, score, details, computed_by, computed_at, "createdAt")
       VALUES ($1::uuid, 'health'::enum_system_intelligence_metric_type, $2, $3::json, $4, NOW(), NOW())`,
      [
        generateId(),
        isStale ? 60 : 95,
        JSON.stringify({
          currentVersion,
          currentYear,
          isStale,
          nextRevisionExpected: Math.ceil(currentVersion / 5) * 5 + 5,
          totalIndustries:
            (await queryRows('SELECT COUNT(*)::int as count FROM naics_industries'))[0]?.count ?? 0,
        }),
        JOB,
      ],
    );

    if (isStale) {
      logger.warn(`NAICS version ${currentVersion} is stale (current year: ${currentYear})`, {
        job: JOB,
      });

      await execSql(
        `INSERT INTO registry_audit_log (id, actor, action, entity_type, entity_id, changes, reason, "createdAt")
         VALUES ($1::uuid, $2, 'update', 'naics_industries', 'version_check', $3::json, 'NAICS version staleness detected', NOW())`,
        [
          generateId(),
          `worker:${JOB}`,
          JSON.stringify({ versionYear: currentVersion, currentYear, action: 'staleness_warning' }),
        ],
      );
    } else {
      logger.info(`NAICS version ${currentVersion} is current`, { job: JOB });
    }
  } catch (err: any) {
    logger.error('NAICS update agent failed', { job: JOB, error: err.message });
  }
}

// ===========================================================================
// 2. Regulatory Change Agent — Daily
//    Scans for expiring certifications, updates variant statuses
// ===========================================================================
export async function runRegulatoryChangeAgent(): Promise<void> {
  const JOB = 'regulatoryChangeAgent';
  try {
    // Find certifications expiring in the next 30 days
    const expiring = await queryRows(
      `SELECT cr.id, cr.agent_variant_id, cr.compliance_framework, cr.expiry_date,
              av.name as variant_name, av.certification_status
       FROM certification_records cr
       JOIN agent_variants av ON av.id = cr.agent_variant_id
       WHERE cr.expiry_date < NOW() + INTERVAL '30 days'
         AND cr.expiry_date > NOW()
         AND av.certification_status = 'certified'
       ORDER BY cr.expiry_date ASC`,
    );

    let updated = 0;
    for (const cert of expiring) {
      // Mark variant as pending re-certification
      await execSql(
        `UPDATE agent_variants SET certification_status = 'pending', "updatedAt" = NOW()
         WHERE id = $1::uuid AND certification_status = 'certified'`,
        [cert.agent_variant_id],
      );

      await execSql(
        `INSERT INTO registry_audit_log (id, actor, action, entity_type, entity_id, changes, reason, "createdAt")
         VALUES ($1::uuid, $2, 'update', 'agent_variants', $3, $4::json, 'Certification expiring within 30 days', NOW())`,
        [
          generateId(),
          `worker:${JOB}`,
          cert.agent_variant_id,
          JSON.stringify({
            from: 'certified',
            to: 'pending',
            framework: cert.compliance_framework,
            expiryDate: cert.expiry_date,
          }),
        ],
      );

      updated++;
    }

    // Find already-expired certifications
    const expired = await queryRows(
      `SELECT cr.id, cr.agent_variant_id, cr.compliance_framework
       FROM certification_records cr
       JOIN agent_variants av ON av.id = cr.agent_variant_id
       WHERE cr.expiry_date < NOW()
         AND av.certification_status NOT IN ('expired', 'revoked')`,
    );

    for (const cert of expired) {
      await execSql(
        `UPDATE agent_variants SET certification_status = 'expired', "updatedAt" = NOW()
         WHERE id = $1::uuid`,
        [cert.agent_variant_id],
      );

      await execSql(
        `INSERT INTO registry_audit_log (id, actor, action, entity_type, entity_id, changes, reason, "createdAt")
         VALUES ($1::uuid, $2, 'expire', 'agent_variants', $3, $4::json, 'Certification expired', NOW())`,
        [
          generateId(),
          `worker:${JOB}`,
          cert.agent_variant_id,
          JSON.stringify({ framework: cert.compliance_framework }),
        ],
      );

      updated++;
    }

    if (updated > 0) {
      logger.info(`Regulatory change agent: ${updated} certification status updates`, { job: JOB });
    } else {
      logger.info('Regulatory change agent: no certification changes needed', { job: JOB });
    }
  } catch (err: any) {
    logger.error('Regulatory change agent failed', { job: JOB, error: err.message });
  }
}

// ===========================================================================
// 3. Taxonomy Gap Agent — Weekly
//    Detects industries without agent coverage, use cases without execution
// ===========================================================================
export async function runTaxonomyGapAgent(): Promise<void> {
  const JOB = 'taxonomyGapAgent';
  try {
    // Count industries with and without agent variants
    const allIndustries = await queryRows(
      'SELECT COUNT(*)::int as count FROM naics_industries WHERE level = 2',
    );
    const coveredIndustries = await queryRows(
      'SELECT COUNT(DISTINCT industry_code)::int as count FROM agent_variants WHERE industry_code IS NOT NULL',
    );

    const totalIndustries = parseInt(allIndustries[0]?.count ?? '0', 10);
    const covered = parseInt(coveredIndustries[0]?.count ?? '0', 10);
    const coverageScore = totalIndustries > 0 ? Math.round((covered / totalIndustries) * 100) : 0;

    // Count use cases with and without linked agents
    const totalUseCases = await queryRows(
      "SELECT COUNT(*)::int as count FROM use_cases WHERE status = 'active'",
    );
    const linkedUseCases = await queryRows(
      `SELECT COUNT(DISTINCT subject_id)::int as count FROM ontology_relationships
       WHERE subject_type = 'use_case' AND relationship_type = 'OPERATES_IN'`,
    );

    const totalUC = parseInt(totalUseCases[0]?.count ?? '0', 10);
    const linkedUC = parseInt(linkedUseCases[0]?.count ?? '0', 10);

    // Find uncovered industry codes
    const uncoveredRows = await queryRows(
      `SELECT ni.code, ni.title FROM naics_industries ni
       WHERE ni.level = 2
         AND ni.code NOT IN (SELECT DISTINCT industry_code FROM agent_variants WHERE industry_code IS NOT NULL)
       ORDER BY ni.code`,
    );

    await execSql(
      `INSERT INTO system_intelligence (id, metric_type, score, details, computed_by, computed_at, "createdAt")
       VALUES ($1::uuid, 'coverage'::enum_system_intelligence_metric_type, $2, $3::json, $4, NOW(), NOW())`,
      [
        generateId(),
        coverageScore,
        JSON.stringify({
          totalIndustries,
          coveredIndustries: covered,
          uncoveredIndustries: uncoveredRows.map((r: any) => ({ code: r.code, title: r.title })),
          totalUseCases: totalUC,
          linkedUseCases: linkedUC,
          coverageScore,
        }),
        JOB,
      ],
    );

    logger.info(
      `Taxonomy gap analysis: ${coverageScore}% industry coverage (${covered}/${totalIndustries})`,
      { job: JOB },
    );
  } catch (err: any) {
    logger.error('Taxonomy gap agent failed', { job: JOB, error: err.message });
  }
}

// ===========================================================================
// 4. Ontology Integrity Agent — Nightly
//    Validates relationships, detects orphans and circular dependencies
// ===========================================================================
export async function runOntologyIntegrityAgent(): Promise<void> {
  const JOB = 'ontologyIntegrityAgent';
  try {
    const totalRels = await queryRows('SELECT COUNT(*)::int as count FROM ontology_relationships');

    // Check for orphaned relationships (subject or object doesn't exist)
    // We check against known entity tables
    const orphanedRegRels = await queryRows(
      `SELECT id FROM ontology_relationships
       WHERE subject_type = 'regulation'
         AND subject_id NOT IN (SELECT id::text FROM taxonomy_nodes WHERE node_type = 'regulation')`,
    );

    let removedCount = 0;
    for (const orphan of orphanedRegRels) {
      await execSql('DELETE FROM ontology_relationships WHERE id = $1::uuid', [orphan.id]);
      removedCount++;
    }

    // Check for duplicate relationships
    const duplicates = await queryRows(
      `SELECT subject_type, subject_id, relationship_type, object_type, object_id, COUNT(*)::int as cnt
       FROM ontology_relationships
       GROUP BY subject_type, subject_id, relationship_type, object_type, object_id
       HAVING COUNT(*) > 1`,
    );

    const totalRelCount = parseInt(totalRels[0]?.count ?? '0', 10);
    const driftScore = Math.max(0, 100 - (removedCount + duplicates.length) * 10);

    await execSql(
      `INSERT INTO system_intelligence (id, metric_type, score, details, computed_by, computed_at, "createdAt")
       VALUES ($1::uuid, 'drift'::enum_system_intelligence_metric_type, $2, $3::json, $4, NOW(), NOW())`,
      [
        generateId(),
        driftScore,
        JSON.stringify({
          totalRelationships: totalRelCount,
          orphanedRemoved: removedCount,
          duplicatesFound: duplicates.length,
          integrityScore: driftScore,
        }),
        JOB,
      ],
    );

    if (removedCount > 0) {
      await execSql(
        `INSERT INTO registry_audit_log (id, actor, action, entity_type, entity_id, changes, reason, "createdAt")
         VALUES ($1::uuid, $2, 'delete', 'ontology_relationships', 'integrity_check', $3::json, 'Orphaned relationships removed', NOW())`,
        [
          generateId(),
          `worker:${JOB}`,
          JSON.stringify({ removedCount, duplicatesFound: duplicates.length }),
        ],
      );
    }

    logger.info(
      `Ontology integrity check: drift score ${driftScore}, removed ${removedCount} orphans`,
      { job: JOB },
    );
  } catch (err: any) {
    logger.error('Ontology integrity agent failed', { job: JOB, error: err.message });
  }
}

// ===========================================================================
// 5. Performance Drift Agent — Every 30 minutes
//    Monitors deployment performance, flags degraded instances
// ===========================================================================
export async function runPerformanceDriftAgent(): Promise<void> {
  const JOB = 'performanceDriftAgent';
  try {
    // Check deployment instances with low performance scores
    const degraded = await queryRows(
      `SELECT di.id, di.performance_score, di.error_count, di.execution_count,
              av.name as variant_name, av.industry_code
       FROM deployment_instances di
       JOIN agent_variants av ON av.id = di.agent_variant_id
       WHERE di.active_status = true
         AND di.performance_score IS NOT NULL
         AND di.performance_score < 50`,
    );

    // Simulate performance updates for active deployments
    const activeDeployments = await queryRows(
      `SELECT id, performance_score, execution_count, error_count FROM deployment_instances
       WHERE active_status = true`,
    );

    for (const dep of activeDeployments) {
      // Simulate execution progress
      const newExecCount = (dep.execution_count || 0) + 1 + Math.floor(Math.random() * 5);
      const newErrorCount = (dep.error_count || 0) + (Math.random() < 0.05 ? 1 : 0);
      const errorRate = newExecCount > 0 ? newErrorCount / newExecCount : 0;
      const newScore = Math.max(
        0,
        Math.min(100, Math.round((1 - errorRate) * 100 - Math.random() * 5)),
      );

      await execSql(
        `UPDATE deployment_instances
         SET performance_score = $1, execution_count = $2, error_count = $3,
             last_execution = NOW(), "updatedAt" = NOW()
         WHERE id = $4::uuid`,
        [newScore, newExecCount, newErrorCount, dep.id],
      );
    }

    // Calculate overall health score
    const allScores = await queryRows(
      `SELECT AVG(performance_score) as avg_score, COUNT(*)::int as total,
              COUNT(CASE WHEN performance_score < 50 THEN 1 END)::int as degraded_count
       FROM deployment_instances
       WHERE active_status = true AND performance_score IS NOT NULL`,
    );

    const avgScore = Math.round(parseFloat(allScores[0]?.avg_score ?? '0'));
    const totalActive = parseInt(allScores[0]?.total ?? '0', 10);
    const degradedCount = parseInt(allScores[0]?.degraded_count ?? '0', 10);

    await execSql(
      `INSERT INTO system_intelligence (id, metric_type, score, details, computed_by, computed_at, "createdAt")
       VALUES ($1::uuid, 'health'::enum_system_intelligence_metric_type, $2, $3::json, $4, NOW(), NOW())`,
      [
        generateId(),
        avgScore,
        JSON.stringify({
          averagePerformanceScore: avgScore,
          totalActiveDeployments: totalActive,
          degradedDeployments: degradedCount,
          degradedInstances: degraded.map((d: any) => ({
            id: d.id,
            score: d.performance_score,
            variant: d.variant_name,
          })),
        }),
        JOB,
      ],
    );

    if (degradedCount > 0) {
      // Create recommendations for degraded deployments
      for (const d of degraded) {
        await execSql(
          `INSERT INTO recommendations (id, user_id, type, title, description, confidence, severity, category, status, expires_at, created_at, updated_at)
           VALUES ($1::uuid, (SELECT user_id FROM agent_stacks LIMIT 1), 'risk_alert'::enum_recommendations_type, $2, $3, 0.85, 'high'::enum_recommendations_severity, 'performance', 'active'::enum_recommendations_status, NOW() + INTERVAL '7 days', NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [
            generateId(),
            `Performance Alert: ${d.variant_name}`,
            `Agent variant "${d.variant_name}" (industry: ${d.industry_code}) has a performance score of ${d.performance_score}. Review deployment configuration and error logs.`,
          ],
        );
      }
    }

    logger.info(`Performance drift agent: avg score ${avgScore}, ${degradedCount} degraded`, {
      job: JOB,
    });
  } catch (err: any) {
    logger.error('Performance drift agent failed', { job: JOB, error: err.message });
  }
}

// ===========================================================================
// 6. Use Case Replication Agent — Weekly
//    Identifies replicable use cases across industries
// ===========================================================================
export async function runUseCaseReplicationAgent(): Promise<void> {
  const JOB = 'useCaseReplicationAgent';
  try {
    // Find use cases that are successful in some industries but not deployed in others
    const useCases = await queryRows(
      `SELECT uc.id, uc.outcome_statement, uc.measurable_kpi, uc.industry_scope, uc.regulatory_scope, uc.urgency_score
       FROM use_cases uc
       WHERE uc.status = 'active'
       ORDER BY uc.urgency_score DESC`,
    );

    // Get all covered industries
    const coveredIndustries = await queryRows(
      'SELECT DISTINCT industry_code FROM agent_variants WHERE industry_code IS NOT NULL',
    );
    const coveredSet = new Set(coveredIndustries.map((r: any) => r.industry_code));

    // Get all sector codes
    const allSectors = await queryRows(
      'SELECT code, title FROM naics_industries WHERE level = 2 ORDER BY code',
    );

    let opportunities = 0;
    const expansionDetails: any[] = [];

    for (const uc of useCases) {
      const currentScope = uc.industry_scope || [];

      // Find sectors not in current scope but that could benefit
      const potentialSectors = allSectors.filter(
        (s: any) => !currentScope.includes(s.code) && coveredSet.has(s.code),
      );

      if (potentialSectors.length > 0) {
        expansionDetails.push({
          useCase: uc.outcome_statement,
          kpi: uc.measurable_kpi,
          currentIndustries: currentScope.length,
          potentialExpansion: potentialSectors
            .slice(0, 3)
            .map((s: any) => ({ code: s.code, title: s.title })),
        });
        opportunities++;
      }
    }

    const expansionScore = Math.min(100, opportunities * 10);

    await execSql(
      `INSERT INTO system_intelligence (id, metric_type, score, details, computed_by, computed_at, "createdAt")
       VALUES ($1::uuid, 'expansion_opportunity'::enum_system_intelligence_metric_type, $2, $3::json, $4, NOW(), NOW())`,
      [
        generateId(),
        expansionScore,
        JSON.stringify({
          totalUseCases: useCases.length,
          replicableOpportunities: opportunities,
          topExpansions: expansionDetails.slice(0, 5),
        }),
        JOB,
      ],
    );

    logger.info(`Use case replication agent: ${opportunities} expansion opportunities found`, {
      job: JOB,
    });
  } catch (err: any) {
    logger.error('Use case replication agent failed', { job: JOB, error: err.message });
  }
}
