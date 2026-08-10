import { describe, expect, it } from 'vitest';
import {
  buildShortcutStatisticsRows,
  formatShortcutStatisticsAsMarkdown,
} from '../../src/reports/ShortcutStatisticsFormatter';
import type { CuratedCommandDefinition } from '../../src/types/curatedCommands';
import type { KeybindingEntry } from '../../src/types/keymaps';

const catalog: CuratedCommandDefinition[] = [
  {
    shadowCommandId: 'shortcutSensei.shadow.a',
    realCommandId: 'cmd.a',
    title: 'Command A',
    category: 'Test',
    menuContexts: ['editor/context'],
    when: 'true',
  },
  {
    shadowCommandId: 'shortcutSensei.shadow.b',
    realCommandId: 'cmd.b',
    title: 'Command B',
    category: 'Test',
    menuContexts: ['editor/context'],
    when: 'true',
  },
];

function binding(normalizedKey: string, commandId: string): KeybindingEntry {
  return {
    normalizedKey,
    rawKey: normalizedKey,
    commandId,
    when: null,
    source: 'builtin',
    sourceLabel: 'Built-in',
    negated: false,
  };
}

describe('buildShortcutStatisticsRows', () => {
  it('includes every curated command even with zero activity', () => {
    const rows = buildShortcutStatisticsRows(catalog, () => [], {});
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.totalExecutions === 0)).toBe(true);
  });

  it('includes the current keybinding when one is known', () => {
    const rows = buildShortcutStatisticsRows(catalog, (id) => (id === 'cmd.a' ? [binding('ctrl+a', 'cmd.a')] : []), {});
    expect(rows.find((r) => r.commandId === 'cmd.a')?.keybinding).toBe('ctrl+a');
    expect(rows.find((r) => r.commandId === 'cmd.b')?.keybinding).toBeNull();
  });

  it('includes usage stats when present', () => {
    const rows = buildShortcutStatisticsRows(catalog, () => [], {
      'cmd.a': {
        commandId: 'cmd.a',
        totalExecutions: 10,
        keyboardExecutions: 7,
        mouseDrivenExecutions: 3,
        firstExecutedAt: 1,
        lastExecutedAt: 2,
      },
    });
    const row = rows.find((r) => r.commandId === 'cmd.a');
    expect(row?.totalExecutions).toBe(10);
    expect(row?.keyboardExecutions).toBe(7);
    expect(row?.mouseDrivenExecutions).toBe(3);
  });

  it('sorts rows by totalExecutions descending', () => {
    const rows = buildShortcutStatisticsRows(catalog, () => [], {
      'cmd.a': {
        commandId: 'cmd.a',
        totalExecutions: 2,
        keyboardExecutions: 0,
        mouseDrivenExecutions: 2,
        firstExecutedAt: 1,
        lastExecutedAt: 2,
      },
      'cmd.b': {
        commandId: 'cmd.b',
        totalExecutions: 20,
        keyboardExecutions: 0,
        mouseDrivenExecutions: 20,
        firstExecutedAt: 1,
        lastExecutedAt: 2,
      },
    });
    expect(rows.map((r) => r.commandId)).toEqual(['cmd.b', 'cmd.a']);
  });
});

describe('formatShortcutStatisticsAsMarkdown', () => {
  it('renders a markdown table with one row per command', () => {
    const rows = buildShortcutStatisticsRows(catalog, () => [], {});
    const md = formatShortcutStatisticsAsMarkdown(rows);
    expect(md).toContain('Command A');
    expect(md).toContain('Command B');
    expect(md).toContain('| Command | Shortcut | Total | Keyboard | Mouse |');
  });

  it('shows "none known" for a command with no keybinding', () => {
    const rows = buildShortcutStatisticsRows(catalog, () => [], {});
    expect(formatShortcutStatisticsAsMarkdown(rows)).toContain('_none known_');
  });

  it('handles an empty row list', () => {
    expect(formatShortcutStatisticsAsMarkdown([])).toContain('No curated commands configured');
  });
});
