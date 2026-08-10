import { describe, expect, it } from 'vitest';
import {
  extractCandidateSequences,
  findSequencesReadyForSuggestion,
  recordObservation,
  sequenceKey,
  updateDetectedSequences,
} from '../../src/analytics/SequenceDetector';
import type { DetectedSequence } from '../../src/types/models';

describe('recordObservation', () => {
  it('appends a new observation to an empty history', () => {
    const result = recordObservation([], { commandId: 'a', timestamp: 100 });
    expect(result).toEqual([{ commandId: 'a', timestamp: 100 }]);
  });

  it('drops observations older than the gap threshold relative to the new one', () => {
    const history = [{ commandId: 'a', timestamp: 0 }];
    const result = recordObservation(history, { commandId: 'b', timestamp: 10 * 60 * 1000 }); // 10 min later
    expect(result).toEqual([{ commandId: 'b', timestamp: 10 * 60 * 1000 }]);
  });

  it('keeps observations within the gap threshold', () => {
    const history = [{ commandId: 'a', timestamp: 0 }];
    const result = recordObservation(history, { commandId: 'b', timestamp: 60 * 1000 }); // 1 min later
    expect(result).toEqual([
      { commandId: 'a', timestamp: 0 },
      { commandId: 'b', timestamp: 60 * 1000 },
    ]);
  });

  it('caps the history at maxHistoryLength', () => {
    let history: Array<{ commandId: string; timestamp: number }> = [];
    for (let i = 0; i < 10; i++) {
      history = recordObservation(history, { commandId: `cmd${i}`, timestamp: i * 1000 }, 5);
    }
    expect(history).toHaveLength(5);
    expect(history[0]?.commandId).toBe('cmd5');
    expect(history[4]?.commandId).toBe('cmd9');
  });
});

describe('extractCandidateSequences', () => {
  it('returns an empty array when history has fewer than 2 entries', () => {
    expect(extractCandidateSequences([])).toEqual([]);
    expect(extractCandidateSequences([{ commandId: 'a', timestamp: 0 }])).toEqual([]);
  });

  it('returns the length-2 sequence when history has exactly 2 entries', () => {
    const history = [
      { commandId: 'a', timestamp: 0 },
      { commandId: 'b', timestamp: 1 },
    ];
    expect(extractCandidateSequences(history)).toEqual([['a', 'b']]);
  });

  it('returns all sequences from length 2 up to 4 for longer history', () => {
    const history = ['a', 'b', 'c', 'd'].map((commandId, i) => ({ commandId, timestamp: i }));
    expect(extractCandidateSequences(history)).toEqual([
      ['c', 'd'],
      ['b', 'c', 'd'],
      ['a', 'b', 'c', 'd'],
    ]);
  });

  it('caps sequence length at 4 even with much longer history', () => {
    const history = ['a', 'b', 'c', 'd', 'e', 'f'].map((commandId, i) => ({ commandId, timestamp: i }));
    const sequences = extractCandidateSequences(history);
    expect(sequences).toHaveLength(3); // lengths 2, 3, 4
    expect(sequences[2]).toEqual(['c', 'd', 'e', 'f']);
  });
});

describe('sequenceKey', () => {
  it('joins command ids into a stable string', () => {
    expect(sequenceKey(['a', 'b', 'c'])).toBe('a\u2192b\u2192c');
  });
});

describe('updateDetectedSequences', () => {
  it('creates new records for first-time sequences with occurrences=1', () => {
    const result = updateDetectedSequences([], [['a', 'b']], 1000);
    expect(result).toEqual([{ commandIds: ['a', 'b'], occurrences: 1, lastSeenAt: 1000 }]);
  });

  it('increments occurrences for a matching existing sequence', () => {
    const existing: DetectedSequence[] = [{ commandIds: ['a', 'b'], occurrences: 3, lastSeenAt: 500 }];
    const result = updateDetectedSequences(existing, [['a', 'b']], 1000);
    expect(result).toEqual([{ commandIds: ['a', 'b'], occurrences: 4, lastSeenAt: 1000 }]);
  });

  it('leaves unrelated existing sequences untouched', () => {
    const existing: DetectedSequence[] = [{ commandIds: ['x', 'y'], occurrences: 2, lastSeenAt: 100 }];
    const result = updateDetectedSequences(existing, [['a', 'b']], 1000);
    expect(result).toHaveLength(2);
    expect(result.find((s) => sequenceKey(s.commandIds) === 'x\u2192y')?.occurrences).toBe(2);
  });

  it('applies multiple candidate sequences from one observation batch', () => {
    const result = updateDetectedSequences([], [['b', 'c'], ['a', 'b', 'c']], 1000);
    expect(result).toHaveLength(2);
  });
});

describe('findSequencesReadyForSuggestion', () => {
  it('returns sequences meeting or exceeding the threshold', () => {
    const sequences: DetectedSequence[] = [
      { commandIds: ['a', 'b'], occurrences: 5, lastSeenAt: 1 },
      { commandIds: ['c', 'd'], occurrences: 2, lastSeenAt: 1 },
    ];
    expect(findSequencesReadyForSuggestion(sequences, 5)).toEqual([sequences[0]]);
  });

  it('returns an empty array when nothing meets the threshold', () => {
    const sequences: DetectedSequence[] = [{ commandIds: ['a', 'b'], occurrences: 1, lastSeenAt: 1 }];
    expect(findSequencesReadyForSuggestion(sequences, 5)).toEqual([]);
  });
});
