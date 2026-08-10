/**
 * Formats a normalized key string (e.g. "ctrl+shift+p" or "ctrl+k ctrl+s")
 * into the capitalized, symbol-friendly form VS Code itself uses in its UI
 * (e.g. "Ctrl+Shift+P", "Ctrl+K Ctrl+S"). Purely cosmetic — does not affect
 * matching/comparison logic, which stays on the normalized form.
 */
export function formatKeybindingForDisplay(normalizedKey: string): string {
  return normalizedKey
    .split(' ')
    .map((chord) =>
      chord
        .split('+')
        .map((part) => capitalizeKeyToken(part))
        .join('+'),
    )
    .join(' ');
}

const SPECIAL_KEY_LABELS: Record<string, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  meta: 'Cmd',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  enter: 'Enter',
  escape: 'Esc',
  tab: 'Tab',
  space: 'Space',
  backspace: 'Backspace',
};

function capitalizeKeyToken(token: string): string {
  const lower = token.toLowerCase();
  if (SPECIAL_KEY_LABELS[lower]) {
    return SPECIAL_KEY_LABELS[lower];
  }
  if (token.length === 1) {
    return token.toUpperCase();
  }
  if (/^f\d{1,2}$/.test(lower)) {
    return lower.toUpperCase(); // F1..F12
  }
  return token;
}

/**
 * Builds the Coach notification message. Kept intentionally short and
 * factual — "Next time press X" rather than anything that reads as
 * scolding, per the "never interrupt/annoy" requirement in the brief.
 */
export function formatCoachMessage(commandTitle: string, normalizedKey: string): string {
  return `You used "${commandTitle}". Next time, press ${formatKeybindingForDisplay(normalizedKey)}.`;
}
