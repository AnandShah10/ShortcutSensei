import { describe, expect, it } from 'vitest';
import { formatCoachMessage, formatKeybindingForDisplay } from '../../src/coach/SuggestionFormatter';

describe('formatKeybindingForDisplay', () => {
  it('capitalizes modifier tokens', () => {
    expect(formatKeybindingForDisplay('ctrl+shift+p')).toBe('Ctrl+Shift+P');
  });

  it('capitalizes a single-letter key even without a special label', () => {
    expect(formatKeybindingForDisplay('ctrl+d')).toBe('Ctrl+D');
  });

  it('formats function keys correctly', () => {
    expect(formatKeybindingForDisplay('f2')).toBe('F2');
    expect(formatKeybindingForDisplay('alt+f12')).toBe('Alt+F12');
  });

  it('maps meta to Cmd', () => {
    expect(formatKeybindingForDisplay('meta+s')).toBe('Cmd+S');
  });

  it('formats special named keys', () => {
    expect(formatKeybindingForDisplay('ctrl+enter')).toBe('Ctrl+Enter');
    expect(formatKeybindingForDisplay('escape')).toBe('Esc');
  });

  it('formats a multi-chord sequence with a space between chords', () => {
    expect(formatKeybindingForDisplay('ctrl+k ctrl+s')).toBe('Ctrl+K Ctrl+S');
  });

  it('leaves punctuation keys as-is', () => {
    expect(formatKeybindingForDisplay('ctrl+.')).toBe('Ctrl+.');
  });
});

describe('formatCoachMessage', () => {
  it('builds a factual, non-scolding message including title and formatted keybinding', () => {
    const message = formatCoachMessage('Format Document', 'shift+alt+f');
    expect(message).toBe('You used "Format Document". Next time, press Shift+Alt+F.');
  });
});
