import { afterEach, describe, expect, it, vi } from 'vitest';
import { MacroEditorQuickPick } from '../../src/ui/quickpick/MacroEditorQuickPick';
import { __resetQuickPick, __setQuickPickResponder, window } from '../mocks/vscode.mock';
import type { IMacroService } from '../../src/services/interfaces/IMacroService';
import type { Macro } from '../../src/types/models';

function makeMacro(overrides: Partial<Macro> = {}): Macro {
  return {
    id: 'm1',
    title: 'My Macro',
    steps: [{ commandId: 'a' }],
    keybinding: null,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
    timesTriggeredSuggestion: 0,
    ...overrides,
  };
}

/** Returns a QuickPick responder that pops one selector function per call. */
function queuedResponder(selectors: Array<(items: unknown[]) => unknown>) {
  let i = 0;
  return (items: unknown[]) => {
    const selector = selectors[i];
    i++;
    return selector ? selector(items) : undefined;
  };
}

function byLabelIncluding<T extends { label: string }>(fragment: string) {
  return (items: unknown[]): T | undefined => (items as T[]).find((it) => it.label.includes(fragment));
}

afterEach(() => {
  __resetQuickPick();
  window.__reset();
});

describe('MacroEditorQuickPick.run (top level)', () => {
  it('does nothing further if the user dismisses the top-level picker', async () => {
    __setQuickPickResponder(() => undefined);
    const macroService: IMacroService = {
      activate: vi.fn(),
      dispose: vi.fn(),
      getMacros: () => [makeMacro()],
      createBlankMacro: vi.fn(),
      createMacroFromSequence: vi.fn(),
      renameMacro: vi.fn(),
      toggleMacroEnabled: vi.fn(),
      deleteMacro: vi.fn(),
      addStep: vi.fn(),
      removeStep: vi.fn(),
      moveStep: vi.fn(),
      assignKeybinding: vi.fn(),
      runMacro: vi.fn(),
    };

    await new MacroEditorQuickPick(macroService).run();
    // No action methods should have been called.
    expect(macroService.renameMacro).not.toHaveBeenCalled();
  });

  it('selecting a macro then Back exits without changes', async () => {
    __setQuickPickResponder(
      queuedResponder([
        // top-level: pick the existing macro
        (items) => (items as Array<{ macroId: string | null }>).find((it) => it.macroId === 'm1'),
        // edit menu: pick Back
        byLabelIncluding('Back'),
        // top-level again: dismiss
        () => undefined,
      ]),
    );

    const macroService: IMacroService = {
      activate: vi.fn(),
      dispose: vi.fn(),
      getMacros: () => [makeMacro()],
      createBlankMacro: vi.fn(),
      createMacroFromSequence: vi.fn(),
      renameMacro: vi.fn(),
      toggleMacroEnabled: vi.fn(),
      deleteMacro: vi.fn(),
      addStep: vi.fn(),
      removeStep: vi.fn(),
      moveStep: vi.fn(),
      assignKeybinding: vi.fn(),
      runMacro: vi.fn(),
    };

    await new MacroEditorQuickPick(macroService).run();
    expect(macroService.renameMacro).not.toHaveBeenCalled();
    expect(macroService.deleteMacro).not.toHaveBeenCalled();
  });

  it('renaming a macro calls renameMacro with the input box value', async () => {
    window.__setInputBoxResponse('New Title');
    __setQuickPickResponder(
      queuedResponder([
        (items) => (items as Array<{ macroId: string | null }>).find((it) => it.macroId === 'm1'),
        byLabelIncluding('Rename'),
        byLabelIncluding('Back'),
        () => undefined,
      ]),
    );

    const renameMacro = vi.fn();
    const macroService: IMacroService = {
      activate: vi.fn(),
      dispose: vi.fn(),
      getMacros: () => [makeMacro()],
      createBlankMacro: vi.fn(),
      createMacroFromSequence: vi.fn(),
      renameMacro,
      toggleMacroEnabled: vi.fn(),
      deleteMacro: vi.fn(),
      addStep: vi.fn(),
      removeStep: vi.fn(),
      moveStep: vi.fn(),
      assignKeybinding: vi.fn(),
      runMacro: vi.fn(),
    };

    await new MacroEditorQuickPick(macroService).run();
    expect(renameMacro).toHaveBeenCalledTimes(1);
    expect(renameMacro.mock.calls[0]).toEqual(['m1', 'New Title']);
  });

  it('creating a new macro from the top-level "+" option prompts for a name and opens its editor', async () => {
    window.__setInputBoxResponse('Brand New');
    let created = false;
    const macroService: IMacroService = {
      activate: vi.fn(),
      dispose: vi.fn(),
      getMacros: () => (created ? [makeMacro({ id: 'new-id', title: 'Brand New' })] : []),
      createBlankMacro: vi.fn(async (title: string) => {
        created = true;
        return makeMacro({ id: 'new-id', title });
      }),
      createMacroFromSequence: vi.fn(),
      renameMacro: vi.fn(),
      toggleMacroEnabled: vi.fn(),
      deleteMacro: vi.fn(),
      addStep: vi.fn(),
      removeStep: vi.fn(),
      moveStep: vi.fn(),
      assignKeybinding: vi.fn(),
      runMacro: vi.fn(),
    };

    __setQuickPickResponder(
      queuedResponder([
        (items) => (items as Array<{ macroId: string | null }>).find((it) => it.macroId === null),
        byLabelIncluding('Back'),
        () => undefined,
      ]),
    );

    await new MacroEditorQuickPick(macroService).run();
    expect(macroService.createBlankMacro).toHaveBeenCalledWith('Brand New');
  });
});

describe('MacroEditorQuickPick.runCreate', () => {
  it('prompts for a name and does nothing if dismissed', async () => {
    window.__setInputBoxResponse(undefined);
    const macroService: IMacroService = {
      activate: vi.fn(),
      dispose: vi.fn(),
      getMacros: () => [],
      createBlankMacro: vi.fn(),
      createMacroFromSequence: vi.fn(),
      renameMacro: vi.fn(),
      toggleMacroEnabled: vi.fn(),
      deleteMacro: vi.fn(),
      addStep: vi.fn(),
      removeStep: vi.fn(),
      moveStep: vi.fn(),
      assignKeybinding: vi.fn(),
      runMacro: vi.fn(),
    };

    await new MacroEditorQuickPick(macroService).runCreate();
    expect(macroService.createBlankMacro).not.toHaveBeenCalled();
  });
});
