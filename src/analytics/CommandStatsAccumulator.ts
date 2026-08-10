import type { CommandStats } from '../types/models';
import type { CommandTriggerSource } from '../types/events';

export interface CommandStatsDelta {
  totalDelta: number;
  keyboardDelta: number;
  mouseDrivenDelta: number;
  lastExecutedAt: number;
}

/**
 * Classifies which counter(s) a single execution's trigger source
 * contributes to. `unknown` sources still count toward `totalExecutions`
 * (via the caller) but deliberately don't move the keyboard/mouse ratio in
 * either direction — reporting a false ratio would be worse than omitting
 * that occurrence from it.
 */
export function classifyForDelta(source: CommandTriggerSource): {
  keyboard: boolean;
  mouseDriven: boolean;
} {
  if (source === 'keyboard') {
    return { keyboard: true, mouseDriven: false };
  }
  if (source === 'menu' || source === 'commandPalette' || source === 'toolbar') {
    return { keyboard: false, mouseDriven: true };
  }
  return { keyboard: false, mouseDriven: false };
}

/**
 * Merges a batch delta into an existing (or absent) CommandStats record,
 * returning a new object rather than mutating — consistent with
 * StorageService's immutable-update contract.
 */
export function applyCommandStatsDelta(
  existing: CommandStats | undefined,
  commandId: string,
  delta: CommandStatsDelta,
): CommandStats {
  if (!existing) {
    return {
      commandId,
      totalExecutions: delta.totalDelta,
      keyboardExecutions: delta.keyboardDelta,
      mouseDrivenExecutions: delta.mouseDrivenDelta,
      firstExecutedAt: delta.lastExecutedAt,
      lastExecutedAt: delta.lastExecutedAt,
    };
  }

  return {
    commandId,
    totalExecutions: existing.totalExecutions + delta.totalDelta,
    keyboardExecutions: existing.keyboardExecutions + delta.keyboardDelta,
    mouseDrivenExecutions: existing.mouseDrivenExecutions + delta.mouseDrivenDelta,
    firstExecutedAt: existing.firstExecutedAt,
    lastExecutedAt: Math.max(existing.lastExecutedAt, delta.lastExecutedAt),
  };
}
