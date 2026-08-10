import { describe, expect, it } from 'vitest';
import { normalizeKeyString, resolvePlatformKey } from '../../src/keymaps/PlatformKeyNormalizer';

describe('normalizeKeyString', () => {
  it('lowercases and preserves a simple chord', () => {
    expect(normalizeKeyString('F2')).toBe('f2');
  });

  it('orders modifiers canonically regardless of authored order', () => {
    expect(normalizeKeyString('shift+ctrl+p')).toBe('ctrl+shift+p');
    expect(normalizeKeyString('Ctrl+Shift+P')).toBe('ctrl+shift+p');
    expect(normalizeKeyString('alt+ctrl+shift+meta+x')).toBe('ctrl+shift+alt+meta+x');
  });

  it('treats modifier aliases as equivalent', () => {
    expect(normalizeKeyString('cmd+s')).toBe('meta+s');
    expect(normalizeKeyString('command+s')).toBe('meta+s');
    expect(normalizeKeyString('win+s')).toBe('meta+s');
    expect(normalizeKeyString('control+s')).toBe('ctrl+s');
    expect(normalizeKeyString('option+s')).toBe('alt+s');
  });

  it('preserves multi-chord sequences separated by spaces', () => {
    expect(normalizeKeyString('ctrl+k ctrl+s')).toBe('ctrl+k ctrl+s');
    expect(normalizeKeyString('  ctrl+k   ctrl+s  ')).toBe('ctrl+k ctrl+s');
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(normalizeKeyString('')).toBeNull();
    expect(normalizeKeyString('   ')).toBeNull();
  });

  it('returns null for a chord with only modifiers and no key', () => {
    expect(normalizeKeyString('ctrl+shift')).toBeNull();
  });

  it('handles punctuation keys that are not modifier aliases', () => {
    expect(normalizeKeyString('ctrl+-')).toBe('ctrl+-');
    expect(normalizeKeyString('ctrl+.')).toBe('ctrl+.');
    expect(normalizeKeyString('ctrl+`')).toBe('ctrl+`');
  });
});

describe('resolvePlatformKey', () => {
  it('falls back to the base key when no platform override exists', () => {
    expect(resolvePlatformKey({ key: 'ctrl+s', command: 'x' }, 'linux')).toBe('ctrl+s');
  });

  it('prefers the mac override on mac', () => {
    expect(resolvePlatformKey({ key: 'ctrl+s', mac: 'cmd+s', command: 'x' }, 'mac')).toBe('cmd+s');
  });

  it('prefers the win override on windows', () => {
    expect(resolvePlatformKey({ key: 'ctrl+s', win: 'ctrl+shift+s', command: 'x' }, 'win')).toBe(
      'ctrl+shift+s',
    );
  });

  it('returns null when neither key nor the relevant override is present', () => {
    expect(resolvePlatformKey({ key: '', command: 'x' }, 'linux')).toBeNull();
  });
});
