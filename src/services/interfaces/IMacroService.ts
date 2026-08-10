import type * as vscode from 'vscode';
import type { DetectedSequence, Macro } from '../../types/models';

export interface IMacroService extends vscode.Disposable {
  activate(): void;
  getMacros(): Macro[];
  createBlankMacro(title: string): Promise<Macro>;
  createMacroFromSequence(sequence: DetectedSequence): Promise<Macro>;
  renameMacro(id: string, title: string): Promise<void>;
  toggleMacroEnabled(id: string): Promise<void>;
  deleteMacro(id: string): Promise<void>;
  addStep(id: string, commandId: string): Promise<void>;
  removeStep(id: string, index: number): Promise<void>;
  moveStep(id: string, index: number, direction: 'up' | 'down'): Promise<void>;
  assignKeybinding(id: string, key: string): Promise<void>;
  runMacro(id: string): Promise<void>;
}

/** The dynamically-registered VS Code command id for a given macro. */
export function macroCommandId(macroId: string): string {
  return `shortcutSensei.runMacro.${macroId}`;
}
