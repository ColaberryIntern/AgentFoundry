/**
 * Execution Layer — Backup Verification
 *
 * Verifies database backup integrity by checking recent backup files.
 * Per CLAUDE.md Layer 3: deterministic, repeatable, auditable.
 *
 * Current implementation is a structural stub — actual file paths and
 * backup storage integration depend on the backup solution in use
 * (pg_dump cron, WAL-G, pgBackRest, etc.).
 *
 * Usage:
 *   npx ts-node execution/backup_verify.ts
 */
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BackupFile {
  path: string;
  sizeBytes: number;
  modifiedAt: Date;
  ageHours: number;
}

interface VerificationResult {
  status: 'pass' | 'fail' | 'warn';
  recentBackupFound: boolean;
  backupFile: BackupFile | null;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BACKUP_DIR = process.env.BACKUP_DIR || '/var/backups/agentfoundry';
const MAX_AGE_HOURS = parseInt(process.env.BACKUP_MAX_AGE_HOURS || '24', 10);
const MIN_SIZE_BYTES = parseInt(process.env.BACKUP_MIN_SIZE_BYTES || '1024', 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[backup-verify] ${new Date().toISOString()} — ${message}`);
}

function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[backup-verify] ${new Date().toISOString()} — ERROR: ${message}`);
}

function findMostRecentBackup(dir: string): BackupFile | null {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        f.endsWith('.sql') || f.endsWith('.sql.gz') || f.endsWith('.dump') || f.endsWith('.backup'),
    )
    .map((f) => {
      const fullPath = path.join(dir, f);
      const stats = fs.statSync(fullPath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      return {
        path: fullPath,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime,
        ageHours: Math.round(ageHours * 100) / 100,
      };
    })
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

  return files.length > 0 ? files[0] : null;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
function verify(): VerificationResult {
  const checks: VerificationResult['checks'] = [];
  let overallPass = true;

  // Check 1: Backup directory exists
  const dirExists = fs.existsSync(BACKUP_DIR);
  checks.push({
    name: 'Backup directory exists',
    passed: dirExists,
    message: dirExists ? `Directory found: ${BACKUP_DIR}` : `Directory not found: ${BACKUP_DIR}`,
  });
  if (!dirExists) {
    overallPass = false;
  }

  // Check 2: Recent backup file exists
  const backup = dirExists ? findMostRecentBackup(BACKUP_DIR) : null;
  const hasRecentBackup = backup !== null;
  checks.push({
    name: 'Recent backup file exists',
    passed: hasRecentBackup,
    message: hasRecentBackup
      ? `Most recent backup: ${backup!.path} (${backup!.ageHours}h old)`
      : 'No backup files found',
  });
  if (!hasRecentBackup) {
    overallPass = false;
  }

  // Check 3: Backup age within threshold
  if (backup) {
    const withinAge = backup.ageHours <= MAX_AGE_HOURS;
    checks.push({
      name: `Backup age within ${MAX_AGE_HOURS}h`,
      passed: withinAge,
      message: withinAge
        ? `Backup is ${backup.ageHours}h old (within ${MAX_AGE_HOURS}h threshold)`
        : `Backup is ${backup.ageHours}h old (exceeds ${MAX_AGE_HOURS}h threshold)`,
    });
    if (!withinAge) {
      overallPass = false;
    }
  }

  // Check 4: Backup file is non-zero size
  if (backup) {
    const hasSize = backup.sizeBytes >= MIN_SIZE_BYTES;
    checks.push({
      name: 'Backup file is non-zero size',
      passed: hasSize,
      message: hasSize
        ? `Backup size: ${(backup.sizeBytes / 1024).toFixed(1)} KB`
        : `Backup size ${backup.sizeBytes} bytes is below minimum ${MIN_SIZE_BYTES} bytes`,
    });
    if (!hasSize) {
      overallPass = false;
    }
  }

  return {
    status: overallPass ? 'pass' : dirExists ? 'fail' : 'warn',
    recentBackupFound: hasRecentBackup,
    backupFile: backup,
    checks,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  log('Starting backup verification...');
  log(`Backup directory: ${BACKUP_DIR}`);
  log(`Max age threshold: ${MAX_AGE_HOURS}h`);
  log(`Min size threshold: ${MIN_SIZE_BYTES} bytes`);
  log('---');

  const result = verify();

  for (const check of result.checks) {
    const statusStr = check.passed ? 'PASS' : 'FAIL';
    log(`  [${statusStr}] ${check.name}: ${check.message}`);
  }

  log('---');

  switch (result.status) {
    case 'pass':
      log('Backup verification PASSED.');
      break;
    case 'warn':
      log(
        'Backup verification WARNING — backup directory not found. Ensure backup job is configured.',
      );
      log('This is expected on first run or development environments.');
      break;
    case 'fail':
      logError('Backup verification FAILED.');
      process.exit(1);
      break;
  }
}

main();
