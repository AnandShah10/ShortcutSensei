import * as vscode from 'vscode';
import { CURATED_COMMANDS } from '../../coach/CuratedCommandCatalog';
import type { IMacroService } from '../../services/interfaces/IMacroService';
import type { Macro } from '../../types/models';

type EditorAction =
  | 'runNow'
  | 'rename'
  | 'toggleEnabled'
  | 'addStep'
  | 'removeStep'
  | 'moveStepUp'
  | 'moveStepDown'
  | 'assignKeybinding'
  | 'delete'
  | 'back';

export class MacroEditorQuickPick {
  public constructor(private readonly macroService: IMacroService) {}

  /** Entry point for "Manage Macros": lists existing macros plus a create option. */
  public async run(): Promise<void> {
    for (;;) {
      const macros = this.macroService.getMacros();
      const items = [
        ...macros.map((m) => ({
          label: `${m.enabled ? '$(check)' : '$(circle-slash)'} ${m.title}`,
          description: `${m.steps.length} step${m.steps.length === 1 ? '' : 's'}`,
          macroId: m.id,
        })),
        { label: '$(add) Create New Macro', description: '', macroId: null as string | null },
      ];

      const pick = await vscode.window.showQuickPick(items, {
        title: 'Shortcut Sensei Macros',
        placeHolder: macros.length === 0 ? 'No macros yet — create one to get started' : 'Select a macro to edit',
      });
      if (!pick) {
        return;
      }

      if (pick.macroId === null) {
        const created = await this.promptCreateBlank();
        if (created) {
          await this.editLoop(created.id);
        }
        continue;
      }

      await this.editLoop(pick.macroId);
    }
  }

  /** Entry point for "Create Macro": skips straight to the create prompt. */
  public async runCreate(): Promise<void> {
    const created = await this.promptCreateBlank();
    if (created) {
      await this.editLoop(created.id);
    }
  }

  private async promptCreateBlank(): Promise<Macro | undefined> {
    const title = await vscode.window.showInputBox({
      prompt: 'Name this macro',
      placeHolder: 'e.g. Save and Format',
    });
    if (!title) {
      return undefined;
    }
    return this.macroService.createBlankMacro(title);
  }

  private async editLoop(macroId: string): Promise<void> {
    for (;;) {
      const macro = this.macroService.getMacros().find((m) => m.id === macroId);
      if (!macro) {
        return; // deleted from elsewhere, or by this loop
      }

      const action = await this.presentEditorMenu(macro);
      if (!action || action === 'back') {
        return;
      }

      const shouldContinue = await this.handleAction(macro, action);
      if (!shouldContinue) {
        return;
      }
    }
  }

  private async presentEditorMenu(macro: Macro): Promise<EditorAction | undefined> {
    const stepsSummary = macro.steps.length === 0 ? '(no steps yet)' : macro.steps.map((s) => s.commandId).join(' \u2192 ');

    const items: Array<{ label: string; description?: string; action: EditorAction }> = [
      { label: '$(play) Run Now', action: 'runNow' },
      { label: '$(edit) Rename', description: macro.title, action: 'rename' },
      {
        label: macro.enabled ? '$(circle-slash) Disable' : '$(check) Enable',
        action: 'toggleEnabled',
      },
      { label: '$(add) Add Step', action: 'addStep' },
      { label: '$(remove) Remove Step', action: 'removeStep' },
      { label: '$(arrow-up) Move Step Up', action: 'moveStepUp' },
      { label: '$(arrow-down) Move Step Down', action: 'moveStepDown' },
      { label: '$(key) Assign Keybinding', description: macro.keybinding ?? 'none', action: 'assignKeybinding' },
      { label: '$(trash) Delete Macro', action: 'delete' },
      { label: '$(arrow-left) Back', action: 'back' },
    ];

    const pick = await vscode.window.showQuickPick(items, {
      title: macro.title,
      placeHolder: `Steps: ${stepsSummary}`,
    });
    return pick?.action;
  }

  /** Returns false if the editor loop for this macro should exit (e.g. after delete). */
  private async handleAction(macro: Macro, action: EditorAction): Promise<boolean> {
    switch (action) {
      case 'runNow':
        await this.macroService.runMacro(macro.id);
        return true;

      case 'rename': {
        const title = await vscode.window.showInputBox({ prompt: 'New name', value: macro.title });
        if (title) {
          await this.macroService.renameMacro(macro.id, title);
        }
        return true;
      }

      case 'toggleEnabled':
        await this.macroService.toggleMacroEnabled(macro.id);
        return true;

      case 'addStep': {
        const commandPick = await vscode.window.showQuickPick(
          CURATED_COMMANDS.map((c) => ({ label: c.title, description: c.realCommandId, commandId: c.realCommandId })),
          { title: 'Add a step', placeHolder: 'Choose a command to append to this macro' },
        );
        if (commandPick) {
          await this.macroService.addStep(macro.id, commandPick.commandId);
        }
        return true;
      }

      case 'removeStep': {
        if (macro.steps.length === 0) {
          void vscode.window.showInformationMessage('This macro has no steps to remove.');
          return true;
        }
        const stepPick = await vscode.window.showQuickPick(
          macro.steps.map((s, index) => ({ label: s.commandId, index })),
          { title: 'Remove which step?' },
        );
        if (stepPick) {
          await this.macroService.removeStep(macro.id, stepPick.index);
        }
        return true;
      }

      case 'moveStepUp':
      case 'moveStepDown': {
        if (macro.steps.length < 2) {
          void vscode.window.showInformationMessage('Add at least two steps before reordering.');
          return true;
        }
        const stepPick = await vscode.window.showQuickPick(
          macro.steps.map((s, index) => ({ label: s.commandId, index })),
          { title: action === 'moveStepUp' ? 'Move which step up?' : 'Move which step down?' },
        );
        if (stepPick) {
          await this.macroService.moveStep(macro.id, stepPick.index, action === 'moveStepUp' ? 'up' : 'down');
        }
        return true;
      }

      case 'assignKeybinding': {
        const key = await vscode.window.showInputBox({
          prompt: 'Enter a key combination for this macro (e.g. ctrl+alt+m)',
          placeHolder: 'ctrl+alt+m',
        });
        if (key) {
          await this.macroService.assignKeybinding(macro.id, key);
        }
        return true;
      }

      case 'delete': {
        const confirmed = await vscode.window.showWarningMessage(
          `Delete macro "${macro.title}"? This cannot be undone.`,
          { modal: true },
          'Delete',
        );
        if (confirmed === 'Delete') {
          await this.macroService.deleteMacro(macro.id);
          return false;
        }
        return true;
      }

      default:
        return true;
    }
  }
}
