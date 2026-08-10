import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';

export interface KeybindingEditEntry {
  readonly key: string;
  /** Command id; prefix with "-" to propose a negation (unbind) entry. */
  readonly command: string;
}

const OPEN_KEYBINDINGS_COMMAND_ID = 'workbench.action.openGlobalKeybindingsFile';

/**
 * Proposes one or more keybindings.json edits without ever touching the
 * file directly — there is no VS Code API to edit keybindings.json
 * programmatically (see keymaps/KeybindingRegistry.ts), and even if there
 * were, silently rewriting a user's keybindings would violate the "never
 * overwrite automatically" requirement. Instead: copy the exact JSON to
 * the clipboard, open the file for them, and let them paste and review.
 */
export class KeybindingWriter {
  public constructor(private readonly logger: Logger) {}

  public buildSnippet(entries: readonly KeybindingEditEntry[]): string {
    return entries.map((e) => JSON.stringify({ key: e.key, command: e.command }, null, 2)).join(',\n');
  }

  public async proposeEdit(entries: readonly KeybindingEditEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    const snippet = this.buildSnippet(entries);

    try {
      await vscode.env.clipboard.writeText(snippet);
    } catch (error) {
      this.logger.error('Failed to copy keybinding snippet to clipboard', error);
    }

    try {
      await vscode.commands.executeCommand(OPEN_KEYBINDINGS_COMMAND_ID);
    } catch (error) {
      this.logger.error('Failed to open keybindings.json', error);
      void vscode.window.showErrorMessage(
        'Could not open keybindings.json automatically. The snippet is on your clipboard — ' +
          'open keybindings.json manually and paste it in.',
      );
      return;
    }

    void vscode.window.showInformationMessage(
      'Keybinding snippet copied to clipboard. Paste it into keybindings.json to apply it.',
    );
  }
}
