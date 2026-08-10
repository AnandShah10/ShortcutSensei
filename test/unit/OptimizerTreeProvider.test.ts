import { describe, expect, it, vi } from 'vitest';
import { OptimizerTreeProvider } from '../../src/ui/treeviews/OptimizerTreeProvider';
import type { IOptimizerService } from '../../src/services/interfaces/IOptimizerService';
import type { ShortcutSuggestion } from '../../src/types/models';

function makeService(suggestions: ShortcutSuggestion[]): IOptimizerService {
  return {
    generateSuggestions: () => suggestions,
    applySuggestion: vi.fn(),
  };
}

const suggestion: ShortcutSuggestion = {
  commandId: 'x',
  commandTitle: 'X Command',
  existingKeybinding: 'f2',
  suggestedKeybinding: 'ctrl+r',
  usageCount: 42,
  reason: 'ergonomics-improvement',
};

describe('OptimizerTreeProvider', () => {
  it('shows an "empty" placeholder node when there are no suggestions', () => {
    const provider = new OptimizerTreeProvider(makeService([]));
    const children = provider.getChildren();
    expect(children).toEqual([{ kind: 'empty' }]);
  });

  it('shows one node per suggestion when present', () => {
    const provider = new OptimizerTreeProvider(makeService([suggestion]));
    const children = provider.getChildren();
    expect(children).toEqual([{ kind: 'suggestion', suggestion }]);
  });

  it('builds a tree item with the reassignment shown in the description', () => {
    const provider = new OptimizerTreeProvider(makeService([suggestion]));
    const item = provider.getTreeItem({ kind: 'suggestion', suggestion });
    expect(item.label).toBe('X Command');
    expect(item.description).toContain('f2');
    expect(item.description).toContain('ctrl+r');
    expect(item.description).toContain('42');
  });

  it('wires the tree item click to the Optimize My Shortcuts command', () => {
    const provider = new OptimizerTreeProvider(makeService([suggestion]));
    const item = provider.getTreeItem({ kind: 'suggestion', suggestion });
    expect((item.command as { command: string }).command).toBe('shortcutSensei.optimizeShortcuts');
  });

  it('handles the empty-state tree item without a reassignment description', () => {
    const provider = new OptimizerTreeProvider(makeService([]));
    const item = provider.getTreeItem({ kind: 'empty' });
    expect(item.label).toBe('No suggestions yet');
  });

  it('returns no children for a leaf node', () => {
    const provider = new OptimizerTreeProvider(makeService([suggestion]));
    const [first] = provider.getChildren();
    expect(provider.getChildren(first)).toEqual([]);
  });
});
