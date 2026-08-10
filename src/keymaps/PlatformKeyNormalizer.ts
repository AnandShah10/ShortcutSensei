import type { Platform, RawKeybindingContribution } from '../types/keymaps';

const MODIFIER_ORDER = ['ctrl', 'shift', 'alt', 'meta'] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

/** VS Code accepts a few historical aliases for the same modifier. */
const MODIFIER_ALIASES: Record<string, Modifier> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  shift: 'shift',
  alt: 'alt',
  option: 'alt',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  win: 'meta',
  windows: 'meta',
  super: 'meta',
};

/**
 * Picks the platform-specific override for a keybinding contribution if
 * one is declared, falling back to the base `key`. Returns null if neither
 * is present (a malformed contribution, which the caller should skip).
 */
export function resolvePlatformKey(
  entry: RawKeybindingContribution,
  platform: Platform,
): string | null {
  const override = platform === 'mac' ? entry.mac : platform === 'win' ? entry.win : entry.linux;
  const key = override ?? entry.key;
  return key && key.trim().length > 0 ? key : null;
}

/**
 * Canonicalizes a raw key-chord string (possibly a multi-chord sequence
 * like `"ctrl+k ctrl+s"`) so that equivalent bindings compare equal
 * regardless of authoring order or casing — e.g. `"shift+ctrl+p"` and
 * `"Ctrl+Shift+P"` both normalize to `"ctrl+shift+p"`.
 *
 * Returns null for empty/whitespace-only input rather than throwing, since
 * this is called on user-authored and third-party data that may be
 * malformed.
 *
 * Known limitation: a literal `"+"` key (VS Code permits binding the plus
 * key itself, e.g. on a numpad) is ambiguous under `+`-delimited chord
 * syntax and is not specially handled here; such a binding will fail to
 * parse and be dropped. This is an accepted gap — it affects a single rare
 * key, not the modifier/key vocabulary this extension actually reasons
 * about (curated commands, conflict detection).
 */
export function normalizeKeyString(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const chords = trimmed
    .split(/\s+/)
    .map(normalizeChord)
    .filter((chord): chord is string => chord !== null);

  return chords.length > 0 ? chords.join(' ') : null;
}

function normalizeChord(chord: string): string | null {
  const parts = chord
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    return null;
  }

  const modifiers = new Set<Modifier>();
  let key: string | null = null;

  for (const part of parts) {
    const alias = MODIFIER_ALIASES[part];
    if (alias) {
      modifiers.add(alias);
    } else {
      // The final non-modifier token is the actual key. If more than one
      // non-modifier token appears (malformed input), the last one wins —
      // consistent with how VS Code itself resolves ambiguous chords.
      key = part;
    }
  }

  if (key === null) {
    return null;
  }

  const orderedModifiers = MODIFIER_ORDER.filter((m) => modifiers.has(m));
  return [...orderedModifiers, key].join('+');
}
