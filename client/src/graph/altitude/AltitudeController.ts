import type { AltitudeLevel, AltitudeContext, BreadcrumbItem } from './altitudeTypes';
import { ALTITUDE_ORDER, ALTITUDE_DEPTH, ALTITUDE_MODE_MATRIX } from './altitudeTypes';
import type { ViewMode } from '../types/graphTypes';

// ---------------------------------------------------------------------------
// Descent / Ascent targets
// ---------------------------------------------------------------------------

interface NavigationResult {
  level: AltitudeLevel;
  context: AltitudeContext;
}

/**
 * Pure, stateless controller for altitude navigation.
 * All methods are static — no component coupling.
 */
export class AltitudeController {
  /**
   * Compute the next altitude and context when descending into a cluster node.
   */
  static descend(
    currentAltitude: AltitudeLevel,
    currentContext: AltitudeContext,
    targetId: string,
    targetType: string,
  ): NavigationResult | null {
    switch (currentAltitude) {
      case 'GLOBAL':
        // Clicking an industry cluster → descend to INDUSTRY
        if (targetType === 'industryCluster' || targetType === 'industry') {
          return {
            level: 'INDUSTRY',
            context: { ...currentContext, industryCode: targetId },
          };
        }
        return null;

      case 'INDUSTRY':
        // Clicking a use case cluster → descend to USE_CASE
        if (targetType === 'useCaseCluster' || targetType === 'useCase') {
          return {
            level: 'USE_CASE',
            context: { ...currentContext, useCaseId: targetId },
          };
        }
        return null;

      case 'USE_CASE':
        // Clicking a stack cluster → descend to STACK
        if (targetType === 'stackCluster' || targetType === 'skeleton') {
          return {
            level: 'STACK',
            context: { ...currentContext, skeletonId: targetId },
          };
        }
        return null;

      case 'STACK':
        // Clicking a variant → descend to AGENT
        if (targetType === 'variant') {
          return {
            level: 'AGENT',
            context: { ...currentContext, variantId: targetId },
          };
        }
        return null;

      case 'AGENT':
        // Already at deepest level
        return null;

      default:
        return null;
    }
  }

  /**
   * Compute the parent altitude and context when ascending.
   */
  static ascend(
    currentAltitude: AltitudeLevel,
    currentContext: AltitudeContext,
  ): NavigationResult | null {
    switch (currentAltitude) {
      case 'AGENT':
        return {
          level: 'STACK',
          context: { ...currentContext, variantId: null },
        };

      case 'STACK':
        return {
          level: 'USE_CASE',
          context: { ...currentContext, skeletonId: null },
        };

      case 'USE_CASE':
        return {
          level: 'INDUSTRY',
          context: { ...currentContext, useCaseId: null },
        };

      case 'INDUSTRY':
        return {
          level: 'GLOBAL',
          context: { industryCode: null, useCaseId: null, skeletonId: null, variantId: null },
        };

      case 'GLOBAL':
        // Already at top
        return null;

      default:
        return null;
    }
  }

  /**
   * Jump directly to a specific altitude level, clearing context below it.
   */
  static jumpTo(targetLevel: AltitudeLevel, currentContext: AltitudeContext): NavigationResult {
    const depth = ALTITUDE_DEPTH[targetLevel];
    return {
      level: targetLevel,
      context: {
        industryCode: depth >= 1 ? currentContext.industryCode : null,
        useCaseId: depth >= 2 ? currentContext.useCaseId : null,
        skeletonId: depth >= 3 ? currentContext.skeletonId : null,
        variantId: depth >= 4 ? currentContext.variantId : null,
      },
    };
  }

  static canDescend(altitude: AltitudeLevel): boolean {
    return altitude !== 'AGENT';
  }

  static canAscend(altitude: AltitudeLevel): boolean {
    return altitude !== 'GLOBAL';
  }

  static getAvailableModes(altitude: AltitudeLevel): ViewMode[] {
    return ALTITUDE_MODE_MATRIX[altitude];
  }

  static isModeAvailable(altitude: AltitudeLevel, mode: ViewMode): boolean {
    return ALTITUDE_MODE_MATRIX[altitude].includes(mode);
  }

  /**
   * Build breadcrumb items from current altitude + context.
   * entityLabels maps IDs to human-readable names for display.
   */
  static computeBreadcrumbs(
    altitude: AltitudeLevel,
    context: AltitudeContext,
    entityLabels: Record<string, string>,
  ): BreadcrumbItem[] {
    const crumbs: BreadcrumbItem[] = [];
    const depth = ALTITUDE_DEPTH[altitude];

    // GLOBAL always present
    crumbs.push({
      level: 'GLOBAL',
      label: 'Global',
      context: { industryCode: null, useCaseId: null, skeletonId: null, variantId: null },
    });

    if (depth >= 1 && context.industryCode) {
      crumbs.push({
        level: 'INDUSTRY',
        label: entityLabels[context.industryCode] || context.industryCode,
        context: {
          industryCode: context.industryCode,
          useCaseId: null,
          skeletonId: null,
          variantId: null,
        },
      });
    }

    if (depth >= 2 && context.useCaseId) {
      crumbs.push({
        level: 'USE_CASE',
        label: entityLabels[context.useCaseId] || 'Use Case',
        context: {
          industryCode: context.industryCode,
          useCaseId: context.useCaseId,
          skeletonId: null,
          variantId: null,
        },
      });
    }

    if (depth >= 3 && context.skeletonId) {
      crumbs.push({
        level: 'STACK',
        label: entityLabels[context.skeletonId] || 'Stack',
        context: {
          industryCode: context.industryCode,
          useCaseId: context.useCaseId,
          skeletonId: context.skeletonId,
          variantId: null,
        },
      });
    }

    if (depth >= 4 && context.variantId) {
      crumbs.push({
        level: 'AGENT',
        label: entityLabels[context.variantId] || 'Agent',
        context: {
          industryCode: context.industryCode,
          useCaseId: context.useCaseId,
          skeletonId: context.skeletonId,
          variantId: context.variantId,
        },
      });
    }

    return crumbs;
  }

  /**
   * Get the next altitude in the hierarchy.
   */
  static getNextAltitude(current: AltitudeLevel): AltitudeLevel | null {
    const idx = ALTITUDE_ORDER.indexOf(current);
    return idx < ALTITUDE_ORDER.length - 1 ? ALTITUDE_ORDER[idx + 1] : null;
  }

  /**
   * Get the previous altitude in the hierarchy.
   */
  static getPreviousAltitude(current: AltitudeLevel): AltitudeLevel | null {
    const idx = ALTITUDE_ORDER.indexOf(current);
    return idx > 0 ? ALTITUDE_ORDER[idx - 1] : null;
  }
}
