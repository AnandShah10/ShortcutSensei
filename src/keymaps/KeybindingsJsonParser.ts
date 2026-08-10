import type { RawKeybindingContribution } from '../types/keymaps';

/**
 * VS Code's keybindings.json is JSONC (JSON with comments and trailing
 * commas), not strict JSON. This strips comments and trailing commas
 * outside of string literals, then parses with the standard JSON parser.
 *
 * This is a pragmatic subset of JSONC handling — it does not attempt to
 * support every edge case of the spec (e.g. comments containing unbalanced
 * quotes in bizarre ways), but correctly handles the comment/comma forms
 * VS Code itself generates and that users realistically hand-edit.
 */
export function stripJsonComments(source: string): string {
  let result = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escapeNext = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i] as string;
    const next = source[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      result += char;
      if (escapeNext) {
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    result += char;
  }

  return result;
}

/** Removes trailing commas before a closing `]` or `}`, outside of strings. */
export function stripTrailingCommas(source: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i] as string;

    if (inString) {
      result += char;
      if (escapeNext) {
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ',') {
      // Look ahead past whitespace/newlines for a closing bracket.
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j] as string)) {
        j++;
      }
      const nextNonSpace = source[j];
      if (nextNonSpace === ']' || nextNonSpace === '}') {
        continue; // Drop this comma.
      }
    }

    result += char;
  }

  return result;
}

export interface ParseUserKeybindingsResult {
  readonly entries: readonly RawKeybindingContribution[];
  readonly parseError: string | null;
}

/**
 * Parses the full text content of a user keybindings.json file into raw
 * entries. Never throws: on malformed content it returns an empty entry
 * list plus a human-readable `parseError`, since a corrupt file should
 * degrade the extension gracefully rather than break activation.
 */
export function parseUserKeybindingsJson(content: string): ParseUserKeybindingsResult {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { entries: [], parseError: null };
  }

  try {
    const stripped = stripTrailingCommas(stripJsonComments(trimmed));
    const parsed: unknown = JSON.parse(stripped);

    if (!Array.isArray(parsed)) {
      return { entries: [], parseError: 'keybindings.json root is not an array.' };
    }

    const entries: RawKeybindingContribution[] = [];
    for (const item of parsed) {
      if (isValidEntry(item)) {
        entries.push(item);
      }
    }
    return { entries, parseError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { entries: [], parseError: `Failed to parse keybindings.json: ${message}` };
  }
}

function isValidEntry(value: unknown): value is RawKeybindingContribution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.key === 'string' && typeof record.command === 'string';
}
