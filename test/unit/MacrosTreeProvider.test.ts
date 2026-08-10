import { describe, expect, it, vi } from 'vitest';
import { MacrosTreeProvider } from '../../src/ui/treeviews/MacrosTreeProvider';
import type { IMacroService } from '../../src/services/interfaces/IMacroService';
import type { Macro } from '../../src/types/models';

function makeService(macros: Macro[]): IMacroService {
  return {
    activate: vi.fn(),
    dispose: vi.fn(),
    getMacros: () => macros,
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
}

function macro(overrides: Partial<Macro> = {}): Macro {
  return {
    id: 'm1',
    title: 'My Macro',
    steps: [{ commandId: 'a' }, { commandId: 'b' }],
    keybinding: null,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
    timesTriggeredSuggestion: 0,
    ...overrides,
  };
}

describe('MacrosTreeProvider', () => {
  it('shows an empty-state node with no macros', () => {
    const provider = new MacrosTreeProvider(makeService([]));
    expect(provider.getChildren()).toEqual([{ kind: 'empty' }]);
  });

  it('shows one node per macro', () => {
    const provider = new MacrosTreeProvider(makeService([macro(), macro({ id: 'm2' })]));
    expect(provider.getChildren()).toHaveLength(2);
  });

  it('includes step count and enabled status in the description', () => {
    const provider = new MacrosTreeProvider(makeService([macro()]));
    const item = provider.getTreeItem({ kind: 'macro', macro: macro() });
    expect(item.description).toContain('2 steps');
    expect(item.description).toContain('enabled');
  });

  it('shows "disabled" for a disabled macro', () => {
    const provider = new MacrosTreeProvider(makeService([]));
    const item = provider.getTreeItem({ kind: 'macro', macro: macro({ enabled: false }) });
    expect(item.description).toContain('disabled');
  });

  it('includes the keybinding when assigned', () => {
    const provider = new MacrosTreeProvider(makeService([]));
    const item = provider.getTreeItem({ kind: 'macro', macro: macro({ keybinding: 'ctrl+alt+m' }) });
    expect(item.description).toContain('ctrl+alt+m');
  });

  it('wires a macro tree item click to Manage Macros', () => {
    const provider = new MacrosTreeProvider(makeService([]));
    const item = provider.getTreeItem({ kind: 'macro', macro: macro() });
    expect((item.command as { command: string }).command).toBe('shortcutSensei.manageMacros');
  });

  it('wires the empty-state tree item to Create Macro', () => {
    const provider = new MacrosTreeProvider(makeService([]));
    const item = provider.getTreeItem({ kind: 'empty' });
    expect((item.command as { command: string }).command).toBe('shortcutSensei.createMacro');
  });
});
