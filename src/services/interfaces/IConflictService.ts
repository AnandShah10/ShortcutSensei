import type { ConflictResolutionAction, KeybindingConflict } from '../../types/models';

export interface IConflictService {
  getConflicts(): KeybindingConflict[];
  /**
   * Resolves one contributor's participation in a conflict.
   * - 'disable': proposes unbinding that contributor's command from this key.
   * - 'remap': proposes moving that contributor's command to `newKey` and
   *   unbinding it from this key. `newKey` is required for this action.
   * - 'ignore': no persisted or file-level effect — see ConflictService for why.
   */
  resolveConflict(
    conflict: KeybindingConflict,
    action: ConflictResolutionAction,
    contributorCommandId: string,
    newKey?: string,
  ): Promise<void>;
}
