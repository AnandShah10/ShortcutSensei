import { describe, expect, it } from 'vitest';
import {
  parseUserKeybindingsJson,
  stripJsonComments,
  stripTrailingCommas,
} from '../../src/keymaps/KeybindingsJsonParser';

describe('stripJsonComments', () => {
  it('removes line comments', () => {
    expect(stripJsonComments('{"a": 1} // comment\n{"b": 2}')).toBe('{"a": 1} \n{"b": 2}');
  });

  it('removes block comments', () => {
    expect(stripJsonComments('{"a": /* inline */ 1}')).toBe('{"a":  1}');
  });

  it('does not treat // or /* inside a string as a comment', () => {
    expect(stripJsonComments('{"a": "http://example.com"}')).toBe('{"a": "http://example.com"}');
  });

  it('handles escaped quotes inside strings correctly', () => {
    const input = String.raw`{"a": "she said \"// not a comment\""}`;
    expect(stripJsonComments(input)).toBe(input);
  });
});

describe('stripTrailingCommas', () => {
  it('removes a trailing comma before a closing bracket', () => {
    expect(stripTrailingCommas('[1, 2, 3,]')).toBe('[1, 2, 3]');
  });

  it('removes a trailing comma before a closing brace across newlines', () => {
    expect(stripTrailingCommas('{"a": 1,\n}')).toBe('{"a": 1\n}');
  });

  it('does not remove a comma that is inside a string', () => {
    expect(stripTrailingCommas('{"a": "1,]"}')).toBe('{"a": "1,]"}');
  });

  it('leaves normal (non-trailing) commas untouched', () => {
    expect(stripTrailingCommas('[1, 2, 3]')).toBe('[1, 2, 3]');
  });
});

describe('parseUserKeybindingsJson', () => {
  it('parses a well-formed array of keybinding entries', () => {
    const result = parseUserKeybindingsJson(
      '[{"key": "ctrl+k ctrl+s", "command": "workbench.action.files.saveAll"}]',
    );
    expect(result.parseError).toBeNull();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.command).toBe('workbench.action.files.saveAll');
  });

  it('tolerates comments and trailing commas as real keybindings.json files contain', () => {
    const content = `[
      // Rebind format document
      { "key": "ctrl+alt+f", "command": "editor.action.formatDocument" }, /* inline note */
    ]`;
    const result = parseUserKeybindingsJson(content);
    expect(result.parseError).toBeNull();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.key).toBe('ctrl+alt+f');
  });

  it('returns an empty result with no error for empty/whitespace content', () => {
    expect(parseUserKeybindingsJson('')).toEqual({ entries: [], parseError: null });
    expect(parseUserKeybindingsJson('   \n  ')).toEqual({ entries: [], parseError: null });
  });

  it('skips entries missing required fields rather than failing the whole parse', () => {
    const result = parseUserKeybindingsJson(
      '[{"key": "ctrl+k"}, {"key": "ctrl+j", "command": "valid.command"}]',
    );
    expect(result.parseError).toBeNull();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.command).toBe('valid.command');
  });

  it('returns a parseError (not a throw) for genuinely malformed JSON', () => {
    const result = parseUserKeybindingsJson('{not valid at all');
    expect(result.entries).toEqual([]);
    expect(result.parseError).not.toBeNull();
  });

  it('returns a parseError when the root is not an array', () => {
    const result = parseUserKeybindingsJson('{"key": "ctrl+s", "command": "x"}');
    expect(result.entries).toEqual([]);
    expect(result.parseError).toContain('not an array');
  });

  it('preserves negated command entries (leading dash) as-is for the resolver to interpret', () => {
    const result = parseUserKeybindingsJson('[{"key": "ctrl+k ctrl+s", "command": "-workbench.action.files.saveAll"}]');
    expect(result.entries[0]?.command).toBe('-workbench.action.files.saveAll');
  });
});
