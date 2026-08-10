import * as vscode from 'vscode';
import type { DetectedSequence } from '../../types/models';

const CREATE_ACTION = 'Create Macro';
const DISMISS_ACTION = 'Not Now';

export class MacroDetectedNotifier {
  /** Returns true if the user chose to create a macro from this sequence. */
  public async promptCreateMacro(
    sequence: DetectedSequence,
    getCommandTitle: (commandId: string) => string,
  ): Promise<boolean> {
    const stepsLabel = sequence.commandIds.map(getCommandTitle).join(' \u2192 ');
    const choice = await vscode.window.showInformationMessage(
      `You've repeated this workflow ${sequence.occurrences} times: ${stepsLabel}. Create a macro?`,
      CREATE_ACTION,
      DISMISS_ACTION,
    );
    return choice === CREATE_ACTION;
  }
}
