/** Convert an integer user ID to a deterministic UUID for tables with UUID user_id columns. */
export function intToUuid(id: number | string): string {
  const padded = String(id).padStart(12, '0');
  return `00000000-0000-4000-8000-${padded}`;
}
