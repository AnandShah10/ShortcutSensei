/**
 * Scores a normalized keybinding string on a simple, defensible ergonomic
 * heuristic: lower score = easier to press. Two factors, both objectively
 * countable from the string alone:
 *
 *  - Chord count: a multi-chord sequence ("ctrl+k ctrl+s") requires two
 *    sequential key presses instead of one simultaneous press, which is
 *    slower and more error-prone. Weighted heavily.
 *  - Modifier count on the first chord: holding three modifiers
 *    simultaneously (ctrl+shift+alt+x) is harder than holding one
 *    (ctrl+x). Weighted moderately.
 *
 * Deliberately excludes anything requiring assumptions this extension
 * can't verify: physical keyboard layout, handedness, finger-to-key
 * mapping, or "reachability" of a specific letter. Those are real
 * ergonomic factors but claiming to model them without knowing the user's
 * actual keyboard would be presenting a guess as a measurement. The
 * weights below (10 per extra chord, 3 per modifier) are an authored
 * heuristic, not a derived constant — documented here so a reviewer can
 * see the whole model at a glance rather than reverse-engineering it from
 * suggestion behavior.
 */
export function scoreErgonomics(normalizedKey: string): number {
  const chords = normalizedKey.split(' ').filter((c) => c.length > 0);
  const chordCount = Math.max(chords.length, 1);
  const firstChordModifierCount = countModifiers(chords[0] ?? '');

  const chordPenalty = (chordCount - 1) * 10;
  const modifierPenalty = firstChordModifierCount * 3;

  return chordPenalty + modifierPenalty;
}

const MODIFIER_TOKENS = new Set(['ctrl', 'shift', 'alt', 'meta']);

function countModifiers(chord: string): number {
  return chord.split('+').filter((part) => MODIFIER_TOKENS.has(part)).length;
}
