export interface CommandStats {
  readonly commandId: string;
  totalExecutions: number;
  keyboardExecutions: number;
  mouseDrivenExecutions: number;
  lastExecutedAt: number;
  firstExecutedAt: number;
}

export interface ShortcutSuggestion {
  readonly commandId: string;
  readonly commandTitle: string;
  readonly existingKeybinding: string | null;
  readonly suggestedKeybinding: string;
  readonly usageCount: number;
  readonly reason: 'unbound-frequent-command' | 'ergonomics-improvement';
}

export interface CoachSuggestion {
  readonly commandId: string;
  readonly commandTitle: string;
  readonly keybinding: string;
  readonly suggestedAt: number;
}

export type ConflictSeverity = 'duplicate' | 'potentialOverride';

export interface KeybindingConflict {
  readonly keybinding: string;
  readonly severity: ConflictSeverity;
  readonly contributors: ReadonlyArray<{
    readonly source: string; // 'built-in' | extension display name
    readonly commandId: string;
    readonly when: string | null;
  }>;
}

export type ConflictResolutionAction = 'disable' | 'remap' | 'ignore';

export interface MacroStep {
  readonly commandId: string;
  readonly args?: unknown;
}

export interface Macro {
  id: string;
  title: string;
  steps: MacroStep[];
  keybinding: string | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  timesTriggeredSuggestion: number;
}

export interface DetectedSequence {
  readonly commandIds: readonly string[];
  occurrences: number;
  lastSeenAt: number;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ProductivityReport {
  readonly period: ReportPeriod;
  readonly generatedAt: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly mostUsedCommands: ReadonlyArray<{ commandId: string; count: number }>;
  readonly keyboardRatio: number;
  readonly mouseDrivenCount: number;
  readonly keyboardCount: number;
  readonly estimatedSecondsSaved: number;
  readonly shortcutsLearned: readonly string[];
  readonly suggestedOptimizations: readonly ShortcutSuggestion[];
}
