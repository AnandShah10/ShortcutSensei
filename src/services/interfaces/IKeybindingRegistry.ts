import type { KeybindingEntry } from '../../types/keymaps';

export interface IKeybindingRegistry {
  /** Current resolved, active keybinding entries (post-negation). */
  getAllEntries(): readonly KeybindingEntry[];

  /** All active bindings for a given command, across all sources. */
  getBindingsForCommand(commandId: string): readonly KeybindingEntry[];

  /** Entries grouped by normalized key — the basis for conflict detection. */
  getEntriesByKey(): ReadonlyMap<string, readonly KeybindingEntry[]>;

  /** Re-reads extension manifests and the user's keybindings.json. */
  refresh(): Promise<void>;

  onDidChange(listener: () => void): { dispose: () => void };
}
