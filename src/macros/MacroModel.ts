import type { DetectedSequence, Macro, MacroStep } from '../types/models';

export function createMacroFromSequence(
  sequence: DetectedSequence,
  getCommandTitle: (commandId: string) => string,
  now: number,
  id: string,
): Macro {
  return {
    id,
    title: sequence.commandIds.map(getCommandTitle).join(' \u2192 '),
    steps: sequence.commandIds.map((commandId): MacroStep => ({ commandId })),
    keybinding: null,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    timesTriggeredSuggestion: sequence.occurrences,
  };
}

export function renameMacro(macro: Macro, title: string, now: number): Macro {
  return { ...macro, title, updatedAt: now };
}

export function setMacroEnabled(macro: Macro, enabled: boolean, now: number): Macro {
  return { ...macro, enabled, updatedAt: now };
}

export function setMacroKeybinding(macro: Macro, keybinding: string | null, now: number): Macro {
  return { ...macro, keybinding, updatedAt: now };
}

export function addMacroStep(macro: Macro, step: MacroStep, now: number): Macro {
  return { ...macro, steps: [...macro.steps, step], updatedAt: now };
}

export function removeMacroStep(macro: Macro, index: number, now: number): Macro {
  if (index < 0 || index >= macro.steps.length) {
    return macro;
  }
  const steps = [...macro.steps];
  steps.splice(index, 1);
  return { ...macro, steps, updatedAt: now };
}

/**
 * Swaps the step at `index` with its neighbor in `direction`. No-op if the
 * move would go out of bounds (e.g. moving the first step up).
 */
export function moveMacroStep(macro: Macro, index: number, direction: 'up' | 'down', now: number): Macro {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= macro.steps.length || targetIndex < 0 || targetIndex >= macro.steps.length) {
    return macro;
  }
  const steps = [...macro.steps];
  const [moved] = steps.splice(index, 1);
  if (!moved) {
    return macro;
  }
  steps.splice(targetIndex, 0, moved);
  return { ...macro, steps, updatedAt: now };
}
