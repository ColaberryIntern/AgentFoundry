/**
 * Performance utilities for graph rendering.
 */

/** Debounce a function call by `ms` milliseconds. */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

/** Simple hash for cache keying based on node/edge counts + IDs. */
export function layoutCacheKey(nodeIds: string[], edgeKeys: string[]): string {
  return `${nodeIds.length}:${edgeKeys.length}:${nodeIds.slice(0, 5).join(',')}`;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Format large numbers with K/M suffix. */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Convert a 0-100 score into a colour from red→amber→green. */
export function scoreToColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

/** Interpolate between two hex colours. t = 0..1. */
export function interpolateColor(hex1: string, hex2: string, t: number): string {
  const ct = clamp(t, 0, 1);
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, ct));
  const g = Math.round(lerp(g1, g2, ct));
  const b = Math.round(lerp(b1, b2, ct));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Continuous risk gradient: 0(low)→blue, 50→amber, 100(high)→red. */
export function riskToGradientColor(riskIndex: number): string {
  const v = clamp(riskIndex, 0, 100);
  if (v <= 50) return interpolateColor('#3b82f6', '#f59e0b', v / 50);
  return interpolateColor('#f59e0b', '#ef4444', (v - 50) / 50);
}

/** Certification coverage gradient: 0(low)→red, 60→amber, 100(high)→green. */
export function certToGradientColor(certPercent: number): string {
  const v = clamp(certPercent, 0, 100);
  if (v >= 60) return interpolateColor('#f59e0b', '#10b981', (v - 60) / 40);
  return interpolateColor('#ef4444', '#f59e0b', v / 60);
}
