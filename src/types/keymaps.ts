export type Platform = 'win' | 'mac' | 'linux';

export type KeybindingSourceKind = 'user' | 'builtin' | 'extension';

/**
 * A keybinding contribution as authored in a package.json
 * `contributes.keybindings` array, or a line in the user's keybindings.json.
 * Shape is shared between both since VS Code uses the same fields for each.
 */
export interface RawKeybindingContribution {
  readonly key: string;
  readonly command: string;
  readonly when?: string;
  readonly mac?: string;
  readonly win?: string;
  readonly linux?: string;
  readonly args?: unknown;
}

/**
 * A resolved, platform-specific, normalized keybinding entry ready for
 * lookup and conflict comparison. `negated` marks a user entry that
 * *removes* a matching binding (VS Code's `"command": "-some.command"`
 * convention) rather than adding a new one.
 */
export interface KeybindingEntry {
  readonly normalizedKey: string;
  readonly rawKey: string;
  readonly commandId: string;
  readonly when: string | null;
  readonly source: KeybindingSourceKind;
  readonly sourceLabel: string;
  readonly negated: boolean;
}

export interface ExtensionManifestLike {
  readonly id: string;
  readonly displayName: string;
  readonly keybindings: readonly RawKeybindingContribution[];
}
