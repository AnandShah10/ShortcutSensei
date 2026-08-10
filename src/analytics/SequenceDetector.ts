import type { DetectedSequence } from '../types/models';

/**
 * IMPORTANT SCOPE NOTE: this operates only on the `command.executed`
 * events this extension can actually observe — which, per
 * services/CommandTrackerService.ts, means mouse/palette-driven
 * invocations of the curated command list, NOT arbitrary VS Code
 * commands and NOT keyboard-triggered executions of anything (including
 * the curated commands themselves). A user's real end-to-end workflow
 * (e.g. Save → Format → Run Tests → Open Terminal) will only be detected
 * here if every step happened to be a mouse click on a curated shadow
 * command. This is a materially narrower signal than "watch command
 * history" as originally envisioned, and is the honest ceiling of what's
 * detectable without a VS Code API for general command-execution
 * observability (which does not exist).
 */

export interface SequenceObservation {
  readonly commandId: string;
  readonly timestamp: number;
}

const MIN_SEQUENCE_LENGTH = 2;
const MAX_SEQUENCE_LENGTH = 4;
/** Commands more than this far apart are treated as unrelated, not a workflow step. */
const MAX_GAP_MS = 2 * 60 * 1000;
const MAX_HISTORY_LENGTH = 20;

/**
 * Appends a new observation to the rolling history, dropping any prior
 * observations more than MAX_GAP_MS older than the new one (so a burst of
 * activity from yesterday doesn't get spliced onto today's), and capping
 * total length.
 */
export function recordObservation(
  history: readonly SequenceObservation[],
  observation: SequenceObservation,
  maxHistoryLength: number = MAX_HISTORY_LENGTH,
): SequenceObservation[] {
  const withinGap = history.filter((h) => observation.timestamp - h.timestamp <= MAX_GAP_MS);
  const updated = [...withinGap, observation];
  return updated.slice(-maxHistoryLength);
}

/**
 * Extracts every contiguous subsequence of length 2..4 that ends at the
 * most recent observation. Exact match only (not fuzzy/similarity-based)
 * — a simpler, fully deterministic and testable approximation of the
 * "sliding window with similarity threshold" idea, which would require a
 * genuine edit-distance model to implement honestly rather than as a
 * vague approximation.
 */
export function extractCandidateSequences(history: readonly SequenceObservation[]): string[][] {
  const commandIds = history.map((h) => h.commandId);
  const sequences: string[][] = [];

  for (let len = MIN_SEQUENCE_LENGTH; len <= Math.min(MAX_SEQUENCE_LENGTH, commandIds.length); len++) {
    sequences.push(commandIds.slice(commandIds.length - len));
  }
  return sequences;
}

export function sequenceKey(commandIds: readonly string[]): string {
  return commandIds.join('\u2192');
}

/**
 * Merges freshly-extracted candidate sequences into the existing
 * persisted detected-sequence records, incrementing occurrence counts for
 * matches and adding new records for first-time sequences.
 */
export function updateDetectedSequences(
  existing: readonly DetectedSequence[],
  newSequences: readonly string[][],
  now: number,
): DetectedSequence[] {
  const byKey = new Map<string, DetectedSequence>(existing.map((s) => [sequenceKey(s.commandIds), s]));

  for (const seq of newSequences) {
    const key = sequenceKey(seq);
    const prior = byKey.get(key);
    byKey.set(key, {
      commandIds: seq,
      occurrences: (prior?.occurrences ?? 0) + 1,
      lastSeenAt: now,
    });
  }

  return [...byKey.values()];
}

/** Sequences that have crossed the configured repetition threshold. */
export function findSequencesReadyForSuggestion(
  sequences: readonly DetectedSequence[],
  minimumRepetitions: number,
): DetectedSequence[] {
  return sequences.filter((s) => s.occurrences >= minimumRepetitions);
}
