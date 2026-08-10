import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import type { Macro } from '../types/models';

export class MacroRunner {
  public constructor(private readonly logger: Logger) {}

  /**
   * Runs each step in order, awaiting completion before starting the
   * next. Stops and rethrows on the first failure rather than continuing
   * — running steps 3-5 after step 2 failed could leave the workspace in
   * a state the user didn't ask for (e.g. running tests against
   * unformatted code because "Format Document" silently failed).
   */
  public async run(macro: Macro): Promise<void> {
    for (const step of macro.steps) {
      try {
        if (step.args !== undefined) {
          await vscode.commands.executeCommand(step.commandId, step.args);
        } else {
          await vscode.commands.executeCommand(step.commandId);
        }
      } catch (error) {
        this.logger.error(`Macro "${macro.title}" failed at step "${step.commandId}"`, error);
        throw error;
      }
    }
  }
}
