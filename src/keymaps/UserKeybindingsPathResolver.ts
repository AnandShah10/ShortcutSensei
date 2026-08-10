/**
 * VS Code does not expose a direct API for "the path to keybindings.json".
 * However, `context.globalStorageUri` always resolves to
 * `<user-data-dir>/User/globalStorage/<extension-id>` regardless of OS,
 * portable mode, Insiders/VSCodium branding, or a custom `--user-data-dir`.
 * Walking up two directories from there reliably lands on the `User`
 * folder that also contains `keybindings.json` and `settings.json`.
 *
 * This is deliberately preferred over hardcoded per-OS paths (e.g.
 * `~/.config/Code/User/...`), which break for Insiders, VSCodium, and
 * portable installs.
 *
 * Implemented as plain string/path-segment manipulation (no reliance on
 * OS-specific path semantics beyond POSIX-style joining, which `vscode.Uri`
 * itself uses internally) so it is trivially unit-testable.
 */
export function resolveUserKeybindingsPath(globalStorageFsPath: string): string {
  const segments = globalStorageFsPath.split(/[/\\]/).filter((s) => s.length > 0);

  // Expect at least: [...driveOrRoot, 'User', 'globalStorage', '<ext-id>']
  if (segments.length < 3) {
    throw new Error(
      `Cannot resolve keybindings.json path from unexpected globalStorage path: "${globalStorageFsPath}"`,
    );
  }

  const userSegments = segments.slice(0, -2); // drop 'globalStorage' and '<ext-id>'
  const isWindowsStyle = /^[a-zA-Z]:$/.test(segments[0] ?? '') || globalStorageFsPath.includes('\\');
  const separator = isWindowsStyle ? '\\' : '/';
  const prefix = globalStorageFsPath.startsWith('/') ? '/' : '';

  return prefix + userSegments.join(separator) + separator + 'keybindings.json';
}
