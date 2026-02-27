/**
 * Cron expression validator and next-run-date calculator.
 *
 * Supports standard 5-field cron format:
 *   minute hour day-of-month month day-of-week
 *
 * Each field may contain: numbers, *, ranges (1-5), lists (1,3,5), steps (* /5)
 */

const FIELD_RANGES: [number, number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week (0 and 7 are both Sunday)
];

/**
 * Validates a single cron field against its allowed range.
 */
function isValidField(field: string, min: number, max: number): boolean {
  // Wildcard
  if (field === '*') return true;

  // Step values: */5 or 1-10/2
  if (field.includes('/')) {
    const [range, stepStr] = field.split('/');
    const step = parseInt(stepStr, 10);
    if (isNaN(step) || step < 1) return false;
    if (range === '*') return true;
    // Range with step: 1-10/2
    return isValidField(range, min, max);
  }

  // List: 1,3,5
  if (field.includes(',')) {
    return field.split(',').every((part) => isValidField(part.trim(), min, max));
  }

  // Range: 1-5
  if (field.includes('-')) {
    const [startStr, endStr] = field.split('-');
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) return false;
    return start >= min && end <= max && start <= end;
  }

  // Single value
  const value = parseInt(field, 10);
  if (isNaN(value)) return false;
  return value >= min && value <= max;
}

/**
 * Validates a 5-field cron expression.
 *
 * @returns true if the expression is valid
 */
export function isValidCron(expression: string): boolean {
  if (!expression || typeof expression !== 'string') return false;

  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  return fields.every((field, index) => {
    const [min, max] = FIELD_RANGES[index];
    return isValidField(field, min, max);
  });
}

/**
 * Parses the expanded set of values from a single cron field.
 */
function expandField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    const result: number[] = [];
    for (let i = min; i <= max; i++) result.push(i);
    return result;
  }

  if (field.includes('/')) {
    const [range, stepStr] = field.split('/');
    const step = parseInt(stepStr, 10);
    const base = expandField(range === '*' ? '*' : range, min, max);
    return base.filter((_, i) => i % step === 0);
  }

  if (field.includes(',')) {
    const values: number[] = [];
    for (const part of field.split(',')) {
      values.push(...expandField(part.trim(), min, max));
    }
    return [...new Set(values)].sort((a, b) => a - b);
  }

  if (field.includes('-')) {
    const [startStr, endStr] = field.split('-');
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    const result: number[] = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  }

  return [parseInt(field, 10)];
}

/**
 * Computes the next run date from a cron expression relative to `from` (defaults to now).
 *
 * This is a simplified implementation that iterates forward minute-by-minute
 * from the start date. For production use, a library like `cron-parser` would
 * be more efficient, but this keeps external dependencies minimal.
 *
 * @returns Date of the next occurrence, or null if unable to compute
 */
export function getNextRunDate(expression: string, from?: Date): Date | null {
  if (!isValidCron(expression)) return null;

  const fields = expression.trim().split(/\s+/);
  const minutes = expandField(fields[0], ...FIELD_RANGES[0]);
  const hours = expandField(fields[1], ...FIELD_RANGES[1]);
  const daysOfMonth = expandField(fields[2], ...FIELD_RANGES[2]);
  const months = expandField(fields[3], ...FIELD_RANGES[3]);
  let daysOfWeek = expandField(fields[4], ...FIELD_RANGES[4]);

  // Normalise: 7 (Sunday) -> 0
  daysOfWeek = daysOfWeek.map((d) => (d === 7 ? 0 : d));
  daysOfWeek = [...new Set(daysOfWeek)].sort((a, b) => a - b);

  const start = from ? new Date(from) : new Date();
  // Start from the next minute
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  // Iterate up to ~2 years to find a match
  const maxIterations = 525960; // ~365 * 24 * 60
  const candidate = new Date(start);

  for (let i = 0; i < maxIterations; i++) {
    const month = candidate.getMonth() + 1; // 1-based
    const dayOfMonth = candidate.getDate();
    const dayOfWeek = candidate.getDay(); // 0 = Sunday
    const hour = candidate.getHours();
    const minute = candidate.getMinutes();

    if (
      months.includes(month) &&
      daysOfMonth.includes(dayOfMonth) &&
      daysOfWeek.includes(dayOfWeek) &&
      hours.includes(hour) &&
      minutes.includes(minute)
    ) {
      return new Date(candidate);
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}
