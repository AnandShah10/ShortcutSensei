import { normalizeKeyString, resolvePlatformKey } from './PlatformKeyNormalizer';
import type {
  ExtensionManifestLike,
  KeybindingEntry,
  Platform,
  RawKeybindingContribution,
} from '../types/keymaps';

/**
 * Resolves the final set of active keybindings from built-in/extension
 * contributions plus the user's keybindings.json, applying:
 *
 * - platform-specific key resolution (mac/win/linux overrides)
 * - normalization so equivalent chords compare equal
 * - negation: a user entry of the form `{ "key": "<k>", "command":
 *   "-<cmd>" }` removes any earlier (built-in/extension) binding whose
 *   normalized key AND commandId both match.
 *
 * This intentionally approximates VS Code's actual negation semantics
 * (which also consider `when`-clause matching) — negation here matches on
 * key+command only, ignoring `when`. This means a negation could remove a
 * binding intended to be scoped to a different `when` context than the
 * user meant to unbind. This is a known, documented simplification; being
 * conservative in the other direction (never removing) would make the
 * Conflict Visualizer's "resolved" state permanently wrong, which is worse.
 */
export function resolveKeybindings(
  builtin: readonly RawKeybindingContribution[],
  extensions: readonly ExtensionManifestLike[],
  userEntries: readonly RawKeybindingContribution[],
  platform: Platform,
): KeybindingEntry[] {
  const resolved: KeybindingEntry[] = [];

  for (const entry of builtin) {
    const parsed = toEntry(entry, platform, 'builtin', 'Built-in');
    if (parsed) {
      resolved.push(parsed);
    }
  }

  for (const ext of extensions) {
    for (const entry of ext.keybindings) {
      const parsed = toEntry(entry, platform, 'extension', ext.displayName);
      if (parsed) {
        resolved.push(parsed);
      }
    }
  }

  const userParsed: KeybindingEntry[] = [];
  for (const entry of userEntries) {
    const parsed = toEntry(entry, platform, 'user', 'User');
    if (parsed) {
      userParsed.push(parsed);
    }
  }

  const negations = userParsed.filter((e) => e.negated);
  const activeUserEntries = userParsed.filter((e) => !e.negated);

  const afterNegation = resolved.filter(
    (candidate) =>
      !negations.some(
        (neg) => neg.normalizedKey === candidate.normalizedKey && neg.commandId === candidate.commandId,
      ),
  );

  return [...afterNegation, ...activeUserEntries];
}

function toEntry(
  raw: RawKeybindingContribution,
  platform: Platform,
  source: KeybindingEntry['source'],
  sourceLabel: string,
): KeybindingEntry | null {
  const rawKey = resolvePlatformKey(raw, platform);
  if (!rawKey) {
    return null;
  }
  const normalizedKey = normalizeKeyString(rawKey);
  if (!normalizedKey) {
    return null;
  }
  if (!raw.command || raw.command.trim().length === 0) {
    return null;
  }

  const negated = raw.command.startsWith('-');
  const commandId = negated ? raw.command.slice(1) : raw.command;

  return {
    normalizedKey,
    rawKey,
    commandId,
    when: raw.when ?? null,
    source,
    sourceLabel,
    negated,
  };
}

/** Groups resolved entries by normalized key, for conflict detection. */
export function groupByNormalizedKey(
  entries: readonly KeybindingEntry[],
): Map<string, KeybindingEntry[]> {
  const map = new Map<string, KeybindingEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.normalizedKey);
    if (list) {
      list.push(entry);
    } else {
      map.set(entry.normalizedKey, [entry]);
    }
  }
  return map;
}

/** Finds all active bindings for a given command, across all sources. */
export function findBindingsForCommand(
  entries: readonly KeybindingEntry[],
  commandId: string,
): KeybindingEntry[] {
  return entries.filter((e) => e.commandId === commandId);
}
