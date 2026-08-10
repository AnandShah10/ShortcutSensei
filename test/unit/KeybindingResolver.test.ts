import { describe, expect, it } from 'vitest';
import {
  findBindingsForCommand,
  groupByNormalizedKey,
  resolveKeybindings,
} from '../../src/keymaps/KeybindingResolver';
import type { ExtensionManifestLike, RawKeybindingContribution } from '../../src/types/keymaps';

describe('resolveKeybindings', () => {
  it('resolves built-in bindings with platform-specific overrides', () => {
    const builtin: RawKeybindingContribution[] = [
      { key: 'ctrl+s', mac: 'cmd+s', command: 'workbench.action.files.save' },
    ];
    const macResult = resolveKeybindings(builtin, [], [], 'mac');
    const winResult = resolveKeybindings(builtin, [], [], 'win');

    expect(macResult[0]?.normalizedKey).toBe('meta+s');
    expect(winResult[0]?.normalizedKey).toBe('ctrl+s');
  });

  it('includes extension-contributed bindings tagged with their extension display name', () => {
    const extensions: ExtensionManifestLike[] = [
      {
        id: 'eamodio.gitlens',
        displayName: 'GitLens',
        keybindings: [{ key: 'ctrl+shift+g', command: 'gitlens.showQuickFileHistory' }],
      },
    ];
    const result = resolveKeybindings([], extensions, [], 'linux');

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('extension');
    expect(result[0]?.sourceLabel).toBe('GitLens');
  });

  it('adds active (non-negating) user entries to the result', () => {
    const userEntries: RawKeybindingContribution[] = [
      { key: 'ctrl+alt+f', command: 'editor.action.formatDocument' },
    ];
    const result = resolveKeybindings([], [], userEntries, 'linux');

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('user');
    expect(result[0]?.negated).toBe(false);
  });

  it('removes a built-in binding when the user negates it with a matching key and command', () => {
    const builtin: RawKeybindingContribution[] = [
      { key: 'ctrl+s', command: 'workbench.action.files.save' },
    ];
    const userEntries: RawKeybindingContribution[] = [
      { key: 'ctrl+s', command: '-workbench.action.files.save' },
    ];
    const result = resolveKeybindings(builtin, [], userEntries, 'linux');

    expect(result).toEqual([]);
  });

  it('does not remove a binding when the negation key matches but the command differs', () => {
    const builtin: RawKeybindingContribution[] = [
      { key: 'ctrl+s', command: 'workbench.action.files.save' },
    ];
    const userEntries: RawKeybindingContribution[] = [
      { key: 'ctrl+s', command: '-some.other.command' },
    ];
    const result = resolveKeybindings(builtin, [], userEntries, 'linux');

    expect(result).toHaveLength(1);
  });

  it('does not include the negation entry itself as an active binding', () => {
    const userEntries: RawKeybindingContribution[] = [
      { key: 'ctrl+s', command: '-workbench.action.files.save' },
    ];
    const result = resolveKeybindings([], [], userEntries, 'linux');

    expect(result).toEqual([]);
  });

  it('skips malformed entries (missing key or command) without throwing', () => {
    const builtin: RawKeybindingContribution[] = [
      { key: '', command: 'x' },
      { key: 'ctrl+s', command: '' },
    ];
    expect(() => resolveKeybindings(builtin, [], [], 'linux')).not.toThrow();
    expect(resolveKeybindings(builtin, [], [], 'linux')).toEqual([]);
  });
});

describe('groupByNormalizedKey', () => {
  it('groups multiple entries sharing the same normalized key together', () => {
    const builtin: RawKeybindingContribution[] = [{ key: 'ctrl+k', command: 'a' }];
    const extensions: ExtensionManifestLike[] = [
      { id: 'ext.one', displayName: 'Ext One', keybindings: [{ key: 'Ctrl+K', command: 'b' }] },
    ];
    const entries = resolveKeybindings(builtin, extensions, [], 'linux');
    const grouped = groupByNormalizedKey(entries);

    expect(grouped.get('ctrl+k')).toHaveLength(2);
  });

  it('returns an empty map for no entries', () => {
    expect(groupByNormalizedKey([]).size).toBe(0);
  });
});

describe('findBindingsForCommand', () => {
  it('returns only entries matching the given command id', () => {
    const builtin: RawKeybindingContribution[] = [
      { key: 'ctrl+s', command: 'save' },
      { key: 'ctrl+shift+s', command: 'saveAs' },
    ];
    const entries = resolveKeybindings(builtin, [], [], 'linux');

    expect(findBindingsForCommand(entries, 'save')).toHaveLength(1);
    expect(findBindingsForCommand(entries, 'nonexistent')).toEqual([]);
  });
});
