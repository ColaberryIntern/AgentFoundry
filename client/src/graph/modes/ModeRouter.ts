import type { ViewMode, ModeConfig, GraphNodeType } from '../types/graphTypes';
import { getModeConfig, MODE_CONFIGS } from './modeConfigs';

/**
 * ModeRouter: maps viewMode → ModeConfig with transition logic.
 * Centralises mode queries so consumers don't import modeConfigs directly.
 */
export class ModeRouter {
  private current: ViewMode = 'strategy';

  get mode(): ViewMode {
    return this.current;
  }

  get config(): ModeConfig {
    return getModeConfig(this.current);
  }

  setMode(mode: ViewMode) {
    this.current = mode;
  }

  /** Returns all available modes in toolbar order. */
  static allModes(): Array<{ id: ViewMode; label: string; description: string }> {
    return Object.values(MODE_CONFIGS).map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
    }));
  }

  /** Whether a node type is visible (not hidden) in the given mode. */
  static isNodeVisible(mode: ViewMode, nodeType: GraphNodeType): boolean {
    return getModeConfig(mode).nodeEmphasis[nodeType] !== 'hidden';
  }

  /** Get the primary (emphasized) node types for a mode. */
  static primaryTypes(mode: ViewMode): GraphNodeType[] {
    const cfg = getModeConfig(mode);
    return (Object.entries(cfg.nodeEmphasis) as [GraphNodeType, string][])
      .filter(([, emphasis]) => emphasis === 'primary')
      .map(([type]) => type);
  }
}
