import type { KeybindingEntry } from '../types/keymaps';

export function isKeyAvailable(
  normalizedKey: string,
  entriesByKey: ReadonlyMap<string, readonly KeybindingEntry[]>,
): boolean {
  const existing = entriesByKey.get(normalizedKey);
  return !existing || existing.length === 0;
}

const CANDIDATE_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Generates single-modifier, single-chord candidate keys in a fixed,
 * deterministic order (Ctrl+<letter> for a-z, then Ctrl+Alt+<letter> for
 * a-z as a fallback tier). Restricted to this narrow, well-understood
 * shape deliberately: proposing exotic chords (three modifiers, unusual
 * punctuation keys, multi-chord sequences) would score well on "novelty"
 * but poorly on "a user would actually want this", and this extension has
 * no way to evaluate that tradeoff.
 *
 * IMPORTANT CAVEAT: "available" here means "not present in
 * KeybindingRegistry's resolved entries", which covers user bindings,
 * installed-extension bindings, and this extension's own curated
 * DefaultKeybindings table — NOT the complete set of VS Code's built-in
 * default keybindings, which aren't enumerable via any API (see
 * keymaps/DefaultKeybindings.data.ts). A candidate marked "available" may
 * still collide with a core VS Code default outside that curated table.
 * Suggestions built from this function should surface that caveat to the
 * user rather than presenting the candidate as guaranteed conflict-free.
 */
export function* generateCandidateKeys(): Generator<string> {
  for (const letter of CANDIDATE_LETTERS) {
    yield `ctrl+${letter}`;
  }
  for (const letter of CANDIDATE_LETTERS) {
    yield `ctrl+alt+${letter}`;
  }
}

/** Returns the first available candidate key, or null if the whole pool is exhausted. */
export function findFirstAvailableCandidate(
  entriesByKey: ReadonlyMap<string, readonly KeybindingEntry[]>,
): string | null {
  for (const candidate of generateCandidateKeys()) {
    if (isKeyAvailable(candidate, entriesByKey)) {
      return candidate;
    }
  }
  return null;
}
