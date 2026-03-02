/**
 * Pure geometry utilities for convex hull computation, expansion, and SVG path generation.
 * No React dependencies — fully unit-testable.
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ---------------------------------------------------------------------------
// Convex Hull — Graham Scan, O(n log n)
// ---------------------------------------------------------------------------

function cross(O: Point, A: Point, B: Point): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

/**
 * Compute the convex hull of a set of points using Graham scan.
 * Returns vertices in counter-clockwise order.
 */
export function convexHull(points: Point[]): Point[] {
  if (points.length <= 1) return [...points];
  if (points.length === 2) return [...points];

  // Sort by x, then by y
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const n = sorted.length;

  // Build lower hull
  const lower: Point[] = [];
  for (let i = 0; i < n; i++) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0
    ) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }

  // Build upper hull
  const upper: Point[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0
    ) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

// ---------------------------------------------------------------------------
// Hull Expansion — push vertices outward by padding
// ---------------------------------------------------------------------------

/**
 * Expand a convex hull outward by `padding` pixels.
 * Each vertex is moved outward along the bisector of its two adjacent edges.
 */
export function expandHull(hull: Point[], padding: number): Point[] {
  if (hull.length === 0) return [];
  if (hull.length === 1) return [hull[0]]; // caller handles circle fallback
  if (hull.length === 2) {
    // Expand to a capsule shape — rectangle with rounded ends
    const [a, b] = hull;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len; // perpendicular normal
    const ny = dx / len;
    return [
      {
        x: a.x + nx * padding - (dx / len) * padding,
        y: a.y + ny * padding - (dy / len) * padding,
      },
      {
        x: b.x + nx * padding + (dx / len) * padding,
        y: b.y + ny * padding + (dy / len) * padding,
      },
      {
        x: b.x - nx * padding + (dx / len) * padding,
        y: b.y - ny * padding + (dy / len) * padding,
      },
      {
        x: a.x - nx * padding - (dx / len) * padding,
        y: a.y - ny * padding - (dy / len) * padding,
      },
    ];
  }

  const n = hull.length;
  const expanded: Point[] = [];

  for (let i = 0; i < n; i++) {
    const prev = hull[(i - 1 + n) % n];
    const curr = hull[i];
    const next = hull[(i + 1) % n];

    // Edge vectors
    const e1x = curr.x - prev.x;
    const e1y = curr.y - prev.y;
    const e2x = next.x - curr.x;
    const e2y = next.y - curr.y;

    // Outward normals (perpendicular, pointing outward for CCW hull)
    const len1 = Math.sqrt(e1x * e1x + e1y * e1y) || 1;
    const len2 = Math.sqrt(e2x * e2x + e2y * e2y) || 1;
    const n1x = -e1y / len1;
    const n1y = e1x / len1;
    const n2x = -e2y / len2;
    const n2y = e2x / len2;

    // Bisector direction (average of two outward normals)
    let bx = n1x + n2x;
    let by = n1y + n2y;
    const bLen = Math.sqrt(bx * bx + by * by) || 1;
    bx /= bLen;
    by /= bLen;

    // Distance along bisector to achieve `padding` offset from both edges
    const dot = n1x * bx + n1y * by;
    const dist = dot > 0.1 ? padding / dot : padding;
    // Clamp to avoid extreme expansion at sharp corners
    const clampedDist = Math.min(dist, padding * 3);

    expanded.push({
      x: curr.x + bx * clampedDist,
      y: curr.y + by * clampedDist,
    });
  }

  return expanded;
}

// ---------------------------------------------------------------------------
// Catmull-Rom → Cubic Bezier SVG Path (closed)
// ---------------------------------------------------------------------------

/**
 * Convert a closed polygon to a smooth SVG path using Catmull-Rom splines
 * converted to cubic bezier control points.
 * @param tension - 0 = sharp corners, 1 = maximally smooth. Default 0.5.
 */
export function smoothHullPath(points: Point[], tension = 0.5): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return circleFallbackPath(points[0], 40);
  }
  if (points.length === 2) {
    // Degenerate: make an ellipse-like shape
    const cx = (points[0].x + points[1].x) / 2;
    const cy = (points[0].y + points[1].y) / 2;
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    const r = Math.sqrt(dx * dx + dy * dy) / 2 + 20;
    return circleFallbackPath({ x: cx, y: cy }, r);
  }

  const n = points.length;
  const alpha = tension > 0 ? 1 / (6 * tension) : 1 / 3;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    // Control point 1: p1 + (p2 - p0) * alpha
    const cp1x = p1.x + (p2.x - p0.x) * alpha;
    const cp1y = p1.y + (p2.y - p0.y) * alpha;

    // Control point 2: p2 - (p3 - p1) * alpha
    const cp2x = p2.x - (p3.x - p1.x) * alpha;
    const cp2y = p2.y - (p3.y - p1.y) * alpha;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  d += ' Z';
  return d;
}

// ---------------------------------------------------------------------------
// Circle Fallback — SVG arc path for 0-1 node sectors
// ---------------------------------------------------------------------------

/**
 * Returns an SVG path string for a circle using two arc commands.
 */
export function circleFallbackPath(center: Point, radius: number): string {
  const { x, y } = center;
  const r = radius;
  return `M ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y} Z`;
}

// ---------------------------------------------------------------------------
// Bounding Box
// ---------------------------------------------------------------------------

/**
 * Compute axis-aligned bounding box from a set of points.
 */
export function computeBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
