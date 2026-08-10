import * as vscode from 'vscode';
import { detectConflicts } from '../conflicts/ConflictDetector';
import { KeybindingWriter } from '../keymaps/KeybindingWriter';
import type { IKeybindingRegistry } from './interfaces/IKeybindingRegistry';
import type { IConflictService } from './interfaces/IConflictService';
import type { Logger } from '../utils/logger';
import type { ConflictResolutionAction, KeybindingConflict } from '../types/models';

export class ConflictService implements IConflictService {
  private readonly keybindingWriter: KeybindingWriter;

  public constructor(
    private readonly keybindingRegistry: IKeybindingRegistry,
    logger: Logger,
  ) {
    this.keybindingWriter = new KeybindingWriter(logger);
  }

  public getConflicts(): KeybindingConflict[] {
    return detectConflicts(this.keybindingRegistry.getEntriesByKey());
  }

  public async resolveConflict(
    conflict: KeybindingConflict,
    action: ConflictResolutionAction,
    contributorCommandId: string,
    newKey?: string,
  ): Promise<void> {
    switch (action) {
      case 'ignore':
        // Deliberately no persisted state: an "ignored" conflict here
        // means "dismissed this time", not "permanently suppressed". A
        // persistent ignore-list is a reasonable future addition, but
        // adding one now would mean silently hiding a real keybinding
        // ambiguity indefinitely with no easy way for the user to review
        // what's been hidden — better to under-promise here than ship a
        // half-considered suppression feature.
        return;

      case 'disable':
        await this.keybindingWriter.proposeEdit([{ key: conflict.keybinding, command: `-${contributorCommandId}` }]);
        return;

      case 'remap':
        if (!newKey) {
          void vscode.window.showErrorMessage('Shortcut Sensei: a new key is required to remap a binding.');
          return;
        }
        await this.keybindingWriter.proposeEdit([
          { key: newKey, command: contributorCommandId },
          { key: conflict.keybinding, command: `-${contributorCommandId}` },
        ]);
        return;
    }
  }
}
