/**
 * Execution Layer — Health Check
 *
 * Pings all service health endpoints sequentially and reports status.
 * Per CLAUDE.md Layer 3: deterministic, repeatable, auditable.
 *
 * Exits with code 1 if any service is down.
 *
 * Usage:
 *   npx ts-node execution/health_check.ts
 *   npm run health-check
 */
import * as http from 'http';
import * as https from 'https';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ServiceConfig {
  name: string;
  url: string;
}

interface HealthResult {
  name: string;
  url: string;
  status: 'up' | 'down';
  responseTimeMs: number;
  statusCode: number | null;
  version: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Service definitions
// ---------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL || 'http://localhost';

const services: ServiceConfig[] = [
  { name: 'api-gateway', url: `${BASE_URL}:3000/health` },
  { name: 'user-service', url: `${BASE_URL}:3001/health` },
  { name: 'compliance-monitor-service', url: `${BASE_URL}:3002/health` },
  { name: 'reporting-service', url: `${BASE_URL}:3003/health` },
  { name: 'ai-recommendation-service', url: `${BASE_URL}:3004/health` },
  { name: 'notification-service', url: `${BASE_URL}:3005/health` },
  { name: 'model-server', url: `${BASE_URL}:8000/health` },
  { name: 'client', url: `${BASE_URL}:8080` },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[health-check] ${new Date().toISOString()} — ${message}`);
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[health-check] ${new Date().toISOString()} — ERROR: ${message}`);
}

const TIMEOUT_MS = 10000;

function checkService(service: ServiceConfig): Promise<HealthResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const isHttps = service.url.startsWith('https');
    const client = isHttps ? https : http;

    const req = client.get(service.url, { timeout: TIMEOUT_MS }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        const elapsed = Date.now() - start;
        let version: string | null = null;
        try {
          const parsed = JSON.parse(body);
          version = parsed.version || null;
        } catch {
          // Response is not JSON — that's fine for the client
        }

        const isUp = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500;
        resolve({
          name: service.name,
          url: service.url,
          status: isUp ? 'up' : 'down',
          responseTimeMs: elapsed,
          statusCode: res.statusCode || null,
          version,
          error: null,
        });
      });
    });

    req.on('error', (err: Error) => {
      resolve({
        name: service.name,
        url: service.url,
        status: 'down',
        responseTimeMs: Date.now() - start,
        statusCode: null,
        version: null,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        url: service.url,
        status: 'down',
        responseTimeMs: TIMEOUT_MS,
        statusCode: null,
        version: null,
        error: `Timeout after ${TIMEOUT_MS}ms`,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  log('Starting health check for all services...');
  log(`Base URL: ${BASE_URL}`);
  log('---');

  const results: HealthResult[] = [];

  // Check services sequentially (as specified)
  for (const service of services) {
    log(`Checking ${service.name}...`);
    const result = await checkService(service);
    results.push(result);

    const statusIcon = result.status === 'up' ? 'UP' : 'DOWN';
    const versionStr = result.version ? ` (v${result.version})` : '';
    const errorStr = result.error ? ` — ${result.error}` : '';

    log(
      `  ${statusIcon} ${result.name}${versionStr} — ${result.responseTimeMs}ms` +
        (result.statusCode ? ` [${result.statusCode}]` : '') +
        errorStr,
    );
  }

  // Summary
  log('---');
  const upCount = results.filter((r) => r.status === 'up').length;
  const downCount = results.filter((r) => r.status === 'down').length;
  log(`Summary: ${upCount}/${results.length} services up, ${downCount} down.`);

  if (downCount > 0) {
    log('Failing services:');
    for (const r of results.filter((r) => r.status === 'down')) {
      log(`  - ${r.name}: ${r.error || 'unknown error'}`);
    }
    logError('Health check FAILED — one or more services are down.');
    process.exit(1);
  }

  log('Health check PASSED — all services are up.');
}

main();
