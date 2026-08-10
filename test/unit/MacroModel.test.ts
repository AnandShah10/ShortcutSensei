import { describe, expect, it } from 'vitest';
import {
  addMacroStep,
  createMacroFromSequence,
  moveMacroStep,
  removeMacroStep,
  renameMacro,
  setMacroEnabled,
  setMacroKeybinding,
} from '../../src/macros/MacroModel';
import type { DetectedSequence, Macro } from '../../src/types/models';

function baseMacro(overrides: Partial<Macro> = {}): Macro {
  return {
    id: 'macro-1',
    title: 'Test Macro',
    steps: [{ commandId: 'a' }, { commandId: 'b' }, { commandId: 'c' }],
    keybinding: null,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
    timesTriggeredSuggestion: 0,
    ...overrides,
  };
}

describe('createMacroFromSequence', () => {
  it('builds a macro with one step per command in the sequence', () => {
    const sequence: DetectedSequence = { commandIds: ['a', 'b'], occurrences: 5, lastSeenAt: 100 };
    const macro = createMacroFromSequence(sequence, (id) => `Title(${id})`, 1000, 'new-id');

    expect(macro.id).toBe('new-id');
    expect(macro.steps).toEqual([{ commandId: 'a' }, { commandId: 'b' }]);
    expect(macro.title).toBe('Title(a) \u2192 Title(b)');
    expect(macro.enabled).toBe(true);
    expect(macro.keybinding).toBeNull();
    expect(macro.timesTriggeredSuggestion).toBe(5);
    expect(macro.createdAt).toBe(1000);
    expect(macro.updatedAt).toBe(1000);
  });
});

describe('renameMacro', () => {
  it('updates the title and updatedAt without touching other fields', () => {
    const macro = baseMacro();
    const result = renameMacro(macro, 'New Title', 999);

    expect(result.title).toBe('New Title');
    expect(result.updatedAt).toBe(999);
    expect(result.steps).toBe(macro.steps);
    expect(macro.title).toBe('Test Macro'); // original untouched
  });
});

describe('setMacroEnabled', () => {
  it('sets enabled and updates updatedAt', () => {
    const macro = baseMacro({ enabled: true });
    const result = setMacroEnabled(macro, false, 999);
    expect(result.enabled).toBe(false);
    expect(result.updatedAt).toBe(999);
  });
});

describe('setMacroKeybinding', () => {
  it('sets a keybinding', () => {
    const result = setMacroKeybinding(baseMacro(), 'ctrl+alt+m', 999);
    expect(result.keybinding).toBe('ctrl+alt+m');
  });

  it('can clear a keybinding back to null', () => {
    const result = setMacroKeybinding(baseMacro({ keybinding: 'ctrl+alt+m' }), null, 999);
    expect(result.keybinding).toBeNull();
  });
});

describe('addMacroStep', () => {
  it('appends a new step to the end', () => {
    const result = addMacroStep(baseMacro(), { commandId: 'd' }, 999);
    expect(result.steps.map((s) => s.commandId)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('removeMacroStep', () => {
  it('removes the step at the given index', () => {
    const result = removeMacroStep(baseMacro(), 1, 999);
    expect(result.steps.map((s) => s.commandId)).toEqual(['a', 'c']);
  });

  it('is a no-op for an out-of-range index', () => {
    const macro = baseMacro();
    expect(removeMacroStep(macro, 99, 999)).toBe(macro);
    expect(removeMacroStep(macro, -1, 999)).toBe(macro);
  });
});

describe('moveMacroStep', () => {
  it('moves a step up one position', () => {
    const result = moveMacroStep(baseMacro(), 2, 'up', 999); // move 'c' up
    expect(result.steps.map((s) => s.commandId)).toEqual(['a', 'c', 'b']);
  });

  it('moves a step down one position', () => {
    const result = moveMacroStep(baseMacro(), 0, 'down', 999); // move 'a' down
    expect(result.steps.map((s) => s.commandId)).toEqual(['b', 'a', 'c']);
  });

  it('is a no-op when moving the first step up', () => {
    const macro = baseMacro();
    expect(moveMacroStep(macro, 0, 'up', 999)).toBe(macro);
  });

  it('is a no-op when moving the last step down', () => {
    const macro = baseMacro();
    expect(moveMacroStep(macro, 2, 'down', 999)).toBe(macro);
  });
});
