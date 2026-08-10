import { describe, expect, it } from 'vitest';
import { resolveUserKeybindingsPath } from '../../src/keymaps/UserKeybindingsPathResolver';

describe('resolveUserKeybindingsPath', () => {
  it('resolves a standard macOS/Linux (POSIX) globalStorage path', () => {
    const input = '/home/dev/.config/Code/User/globalStorage/your-publisher.ShortcutSensei';
    expect(resolveUserKeybindingsPath(input)).toBe(
      '/home/dev/.config/Code/User/keybindings.json',
    );
  });

  it('resolves a macOS Application Support path', () => {
    const input =
      '/Users/dev/Library/Application Support/Code/User/globalStorage/your-publisher.ShortcutSensei';
    expect(resolveUserKeybindingsPath(input)).toBe(
      '/Users/dev/Library/Application Support/Code/User/keybindings.json',
    );
  });

  it('resolves a Windows-style globalStorage path using backslashes', () => {
    const input =
      'C:\\Users\\dev\\AppData\\Roaming\\Code\\User\\globalStorage\\your-publisher.ShortcutSensei';
    expect(resolveUserKeybindingsPath(input)).toBe(
      'C:\\Users\\dev\\AppData\\Roaming\\Code\\User\\keybindings.json',
    );
  });

  it('resolves correctly for VS Code Insiders / VSCodium-branded data directories', () => {
    const input = '/home/dev/.config/Code - Insiders/User/globalStorage/your-publisher.ShortcutSensei';
    expect(resolveUserKeybindingsPath(input)).toBe(
      '/home/dev/.config/Code - Insiders/User/keybindings.json',
    );
  });

  it('throws a clear error for an unexpectedly short path', () => {
    expect(() => resolveUserKeybindingsPath('/User/globalStorage')).toThrow(
      /Cannot resolve keybindings.json path/,
    );
  });
});
