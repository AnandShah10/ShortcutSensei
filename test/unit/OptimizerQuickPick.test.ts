import { afterEach, describe, expect, it, vi } from 'vitest';
import { OptimizerQuickPick } from '../../src/ui/quickpick/OptimizerQuickPick';
import { __getShownQuickPicks, __resetQuickPick, __setQuickPickResponder, window } from '../mocks/vscode.mock';
import type { IOptimizerService } from '../../src/services/interfaces/IOptimizerService';
import type { ShortcutSuggestion } from '../../src/types/models';

function suggestion(overrides: Partial<ShortcutSuggestion> = {}): ShortcutSuggestion {
  return {
    commandId: 'x',
    commandTitle: 'X Command',
    existingKeybinding: null,
    suggestedKeybinding: 'ctrl+a',
    usageCount: 10,
    reason: 'unbound-frequent-command',
    ...overrides,
  };
}

afterEach(() => {
  __resetQuickPick();
  window.__reset();
});

describe('OptimizerQuickPick', () => {
  it('shows an informational message and does nothing when there are no suggestions', async () => {
    const optimizerService: IOptimizerService = {
      generateSuggestions: () => [],
      applySuggestion: vi.fn(),
    };

    await new OptimizerQuickPick(optimizerService).run();

    expect(window.__getInformationMessages()).toHaveLength(1);
    expect(optimizerService.applySuggestion).not.toHaveBeenCalled();
  });

  it('calls applySuggestion when the user accepts', async () => {
    __setQuickPickResponder((items) => (items as Array<{ action: string }>).find((i) => i.action === 'accept'));
    const applySuggestion = vi.fn();
    const optimizerService: IOptimizerService = {
      generateSuggestions: () => [suggestion()],
      applySuggestion,
    };

    await new OptimizerQuickPick(optimizerService).run();

    expect(applySuggestion).toHaveBeenCalledTimes(1);
  });

  it('does not call applySuggestion when the user skips', async () => {
    __setQuickPickResponder((items) => (items as Array<{ action: string }>).find((i) => i.action === 'skip'));
    const applySuggestion = vi.fn();
    const optimizerService: IOptimizerService = {
      generateSuggestions: () => [suggestion()],
      applySuggestion,
    };

    await new OptimizerQuickPick(optimizerService).run();

    expect(applySuggestion).not.toHaveBeenCalled();
  });

  it('does not call applySuggestion when the user dismisses the picker (undefined)', async () => {
    __setQuickPickResponder(() => undefined);
    const applySuggestion = vi.fn();
    const optimizerService: IOptimizerService = {
      generateSuggestions: () => [suggestion()],
      applySuggestion,
    };

    await new OptimizerQuickPick(optimizerService).run();

    expect(applySuggestion).not.toHaveBeenCalled();
  });

  it('presents each suggestion as its own quick pick, in order', async () => {
    __setQuickPickResponder((items) => (items as Array<{ action: string }>).find((i) => i.action === 'skip'));
    const optimizerService: IOptimizerService = {
      generateSuggestions: () => [
        suggestion({ commandId: 'a', commandTitle: 'A Title', usageCount: 5 }),
        suggestion({ commandId: 'b', commandTitle: 'B Title', usageCount: 9 }),
      ],
      applySuggestion: vi.fn(),
    };

    await new OptimizerQuickPick(optimizerService).run();

    const shown = __getShownQuickPicks();
    expect(shown).toHaveLength(2);
    expect((shown[0]?.options as { title: string }).title).toContain('A Title');
    expect((shown[1]?.options as { title: string }).title).toContain('B Title');
  });
});
