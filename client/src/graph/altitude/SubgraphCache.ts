import type { Node, Edge } from '@xyflow/react';
import type { AltitudeLevel } from './altitudeTypes';

// ---------------------------------------------------------------------------
// Subgraph Cache Entry
// ---------------------------------------------------------------------------

interface CacheEntry {
  altitudeLevel: AltitudeLevel;
  contextKey: string;
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
  ttl: number;
}

// ---------------------------------------------------------------------------
// LRU Subgraph Cache
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 50;
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * LRU cache for previously loaded subgraphs.
 * Prevents re-computation when navigating back to a visited altitude.
 */
export class SubgraphCache {
  private entries = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];

  private makeKey(altitude: AltitudeLevel, contextKey: string): string {
    return `${altitude}:${contextKey}`;
  }

  private touch(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx >= 0) this.accessOrder.splice(idx, 1);
    this.accessOrder.push(key);
  }

  get(altitude: AltitudeLevel, contextKey: string): { nodes: Node[]; edges: Edge[] } | null {
    const key = this.makeKey(altitude, contextKey);
    const entry = this.entries.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.entries.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      return null;
    }

    this.touch(key);
    return { nodes: entry.nodes, edges: entry.edges };
  }

  set(
    altitude: AltitudeLevel,
    contextKey: string,
    nodes: Node[],
    edges: Edge[],
    ttl: number = DEFAULT_TTL,
  ): void {
    const key = this.makeKey(altitude, contextKey);

    // Evict LRU if at capacity
    while (this.entries.size >= MAX_ENTRIES && this.accessOrder.length > 0) {
      const oldest = this.accessOrder.shift()!;
      this.entries.delete(oldest);
    }

    this.entries.set(key, {
      altitudeLevel: altitude,
      contextKey,
      nodes,
      edges,
      timestamp: Date.now(),
      ttl,
    });
    this.touch(key);
  }

  evict(altitude: AltitudeLevel, contextKey: string): void {
    const key = this.makeKey(altitude, contextKey);
    this.entries.delete(key);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
  }

  evictStale(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.entries.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
        evicted++;
      }
    }
    return evicted;
  }

  clear(): void {
    this.entries.clear();
    this.accessOrder = [];
  }

  get size(): number {
    return this.entries.size;
  }
}

// Singleton instance
export const subgraphCache = new SubgraphCache();
