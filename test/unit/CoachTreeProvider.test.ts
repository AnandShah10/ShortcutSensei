import { describe, expect, it, vi } from 'vitest';
import { CoachTreeProvider } from '../../src/ui/treeviews/CoachTreeProvider';
import { CURATED_COMMANDS } from '../../src/coach/CuratedCommandCatalog';
import { MAX_LIFETIME_SUGGESTIONS } from '../../src/coach/ShortcutKnowledgeModel';
import type { IStorageService } from '../../src/services/interfaces/IStorageService';
import type { IKeybindingRegistry } from '../../src/services/interfaces/IKeybindingRegistry';
import type { PersistedState } from '../../src/types/storage-schema';
import type { KeybindingEntry } from '../../src/types/keymaps';

function makeStorage(coachSuggestions: PersistedState['coachSuggestions'] = {}): IStorageService {
  return {
    getState: () =>
      ({
        schemaVersion: 2,
        commandStats: {},
        knownShortcuts: {},
        detectedSequences: [],
        macros: [],
        coachSuggestions,
        sessionStartedAt: null,
      }) as PersistedState,
    updateState: vi.fn(),
    onDidChangeState: () => ({ dispose: () => undefined }),
    resetState: vi.fn(),
  };
}

function makeRegistry(bindings: Record<string, KeybindingEntry[]> = {}): IKeybindingRegistry {
  return {
    getAllEntries: () => Object.values(bindings).flat(),
    getBindingsForCommand: (commandId) => bindings[commandId] ?? [],
    getEntriesByKey: () => new Map(),
    refresh: async () => undefined,
    onDidChange: () => ({ dispose: () => undefined }),
  };
}

describe('CoachTreeProvider', () => {
  it('includes one node per curated command', () => {
    const provider = new CoachTreeProvider(makeStorage(), makeRegistry());
    expect(provider.getChildren()).toHaveLength(CURATED_COMMANDS.length);
  });

  it('marks a command with no suggestion record as "Not yet suggested"', () => {
    const provider = new CoachTreeProvider(makeStorage(), makeRegistry());
    const node = provider.getChildren()[0];
    expect(node?.status).toBe('Not yet suggested');
  });

  it('marks a command with a partial suggestion count as "Suggested Nx"', () => {
    const target = CURATED_COMMANDS[0]!.realCommandId;
    const provider = new CoachTreeProvider(
      makeStorage({ [target]: { lastSuggestedAt: 1, count: 2 } }),
      makeRegistry(),
    );
    const node = provider.getChildren().find((n) => n.commandId === target);
    expect(node?.status).toBe('Suggested 2x');
  });

  it('marks a command that has hit the known threshold as "Known"', () => {
    const target = CURATED_COMMANDS[0]!.realCommandId;
    const provider = new CoachTreeProvider(
      makeStorage({ [target]: { lastSuggestedAt: 1, count: MAX_LIFETIME_SUGGESTIONS } }),
      makeRegistry(),
    );
    const node = provider.getChildren().find((n) => n.commandId === target);
    expect(node?.status).toBe('Known');
  });

  it('includes the current keybinding when known', () => {
    const target = CURATED_COMMANDS[0]!.realCommandId;
    const registry = makeRegistry({
      [target]: [
        {
          normalizedKey: 'ctrl+a',
          rawKey: 'ctrl+a',
          commandId: target,
          when: null,
          source: 'builtin',
          sourceLabel: 'Built-in',
          negated: false,
        },
      ],
    });
    const provider = new CoachTreeProvider(makeStorage(), registry);
    const node = provider.getChildren().find((n) => n.commandId === target);
    expect(node?.keybinding).toBe('ctrl+a');
  });

  it('returns no children for a leaf node', () => {
    const provider = new CoachTreeProvider(makeStorage(), makeRegistry());
    const [first] = provider.getChildren();
    expect(provider.getChildren(first)).toEqual([]);
  });

  it('fires onDidChangeTreeData on refresh()', () => {
    const provider = new CoachTreeProvider(makeStorage(), makeRegistry());
    const listener = vi.fn();
    provider.onDidChangeTreeData(listener);
    provider.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
