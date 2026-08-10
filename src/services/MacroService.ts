import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import {
  extractCandidateSequences,
  findSequencesReadyForSuggestion,
  recordObservation,
  sequenceKey,
  updateDetectedSequences,
  type SequenceObservation,
} from '../analytics/SequenceDetector';
import {
  addMacroStep,
  createMacroFromSequence as buildMacroFromSequence,
  moveMacroStep,
  removeMacroStep,
  renameMacro as renameMacroPure,
  setMacroEnabled,
  setMacroKeybinding,
} from '../macros/MacroModel';
import { CURATED_COMMANDS } from '../coach/CuratedCommandCatalog';
import { KeybindingWriter } from '../keymaps/KeybindingWriter';
import { DisposableStore } from '../utils/disposableStore';
import { macroCommandId, type IMacroService } from './interfaces/IMacroService';
import type { EventBus } from '../analytics/EventBus';
import type { IStorageService } from './interfaces/IStorageService';
import type { ConfigService } from '../configuration/ConfigService';
import type { MacroRunner } from '../macros/MacroRunner';
import type { MacroDetectedNotifier } from '../ui/notifications/MacroDetectedNotifier';
import type { Logger } from '../utils/logger';
import type { DetectedSequence, Macro } from '../types/models';

const TITLE_BY_COMMAND_ID = new Map<string, string>(CURATED_COMMANDS.map((c) => [c.realCommandId, c.title]));

function getCommandTitle(commandId: string): string {
  return TITLE_BY_COMMAND_ID.get(commandId) ?? commandId;
}

export class MacroService implements IMacroService {
  private readonly disposables = new DisposableStore();
  private readonly macroCommandDisposables = new Map<string, vscode.Disposable>();
  private readonly keybindingWriter: KeybindingWriter;
  private readonly promptedThisSession = new Set<string>();
  private history: SequenceObservation[] = [];
  private activated = false;

  public constructor(
    private readonly eventBus: EventBus,
    private readonly storage: IStorageService,
    private readonly config: ConfigService,
    private readonly macroRunner: MacroRunner,
    private readonly notifier: MacroDetectedNotifier,
    private readonly logger: Logger,
  ) {
    this.keybindingWriter = new KeybindingWriter(logger);
  }

  public activate(): void {
    if (this.activated) {
      this.logger.warn('MacroService.activate() called more than once; ignoring.');
      return;
    }
    this.activated = true;

    for (const macro of this.storage.getState().macros) {
      this.registerMacroCommand(macro);
    }

    this.disposables.add(
      this.eventBus.subscribe('command.executed', (payload) => {
        void this.handleCommandExecuted(payload.commandId, payload.timestamp);
      }),
    );
  }

  public dispose(): void {
    this.disposables.dispose();
    for (const disposable of this.macroCommandDisposables.values()) {
      disposable.dispose();
    }
    this.macroCommandDisposables.clear();
    this.activated = false;
  }

  public getMacros(): Macro[] {
    return this.storage.getState().macros;
  }

  public async createBlankMacro(title: string): Promise<Macro> {
    const now = Date.now();
    const macro: Macro = {
      id: randomUUID(),
      title,
      steps: [],
      keybinding: null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      timesTriggeredSuggestion: 0,
    };
    await this.storage.updateState((draft) => {
      draft.macros.push(macro);
    });
    this.registerMacroCommand(macro);
    return macro;
  }

  public async createMacroFromSequence(sequence: DetectedSequence): Promise<Macro> {
    const macro = buildMacroFromSequence(sequence, getCommandTitle, Date.now(), randomUUID());
    await this.storage.updateState((draft) => {
      draft.macros.push(macro);
    });
    this.registerMacroCommand(macro);
    return macro;
  }

  public async renameMacro(id: string, title: string): Promise<void> {
    await this.updateMacro(id, (m) => renameMacroPure(m, title, Date.now()));
  }

  public async toggleMacroEnabled(id: string): Promise<void> {
    await this.updateMacro(id, (m) => setMacroEnabled(m, !m.enabled, Date.now()));
  }

  public async deleteMacro(id: string): Promise<void> {
    await this.storage.updateState((draft) => {
      draft.macros = draft.macros.filter((m) => m.id !== id);
    });
    this.macroCommandDisposables.get(id)?.dispose();
    this.macroCommandDisposables.delete(id);
  }

  public async addStep(id: string, commandId: string): Promise<void> {
    await this.updateMacro(id, (m) => addMacroStep(m, { commandId }, Date.now()));
  }

  public async removeStep(id: string, index: number): Promise<void> {
    await this.updateMacro(id, (m) => removeMacroStep(m, index, Date.now()));
  }

  public async moveStep(id: string, index: number, direction: 'up' | 'down'): Promise<void> {
    await this.updateMacro(id, (m) => moveMacroStep(m, index, direction, Date.now()));
  }

  public async assignKeybinding(id: string, key: string): Promise<void> {
    await this.updateMacro(id, (m) => setMacroKeybinding(m, key, Date.now()));
    await this.keybindingWriter.proposeEdit([{ key, command: macroCommandId(id) }]);
  }

  public async runMacro(id: string): Promise<void> {
    const macro = this.getMacros().find((m) => m.id === id);
    if (!macro) {
      this.logger.warn(`runMacro: no macro found with id "${id}"`);
      return;
    }
    await this.macroRunner.run(macro);
  }

  private async updateMacro(id: string, mutate: (macro: Macro) => Macro): Promise<void> {
    await this.storage.updateState((draft) => {
      const index = draft.macros.findIndex((m) => m.id === id);
      if (index >= 0) {
        const current = draft.macros[index];
        if (current) {
          draft.macros[index] = mutate(current);
        }
      }
    });
  }

  private registerMacroCommand(macro: Macro): void {
    if (this.macroCommandDisposables.has(macro.id)) {
      return;
    }
    const disposable = vscode.commands.registerCommand(macroCommandId(macro.id), async () => {
      const current = this.getMacros().find((m) => m.id === macro.id);
      if (!current) {
        return;
      }
      if (!current.enabled) {
        void vscode.window.showInformationMessage(`Macro "${current.title}" is disabled.`);
        return;
      }
      try {
        await this.macroRunner.run(current);
      } catch (error) {
        this.logger.error(`Macro "${current.title}" failed to run`, error);
        void vscode.window.showErrorMessage(`Shortcut Sensei: macro "${current.title}" failed. See logs for details.`);
      }
    });
    this.macroCommandDisposables.set(macro.id, disposable);
  }

  private async handleCommandExecuted(commandId: string, timestamp: number): Promise<void> {
    if (!this.config.get().macrosEnabled) {
      return;
    }

    this.history = recordObservation(this.history, { commandId, timestamp });
    const candidates = extractCandidateSequences(this.history);
    if (candidates.length === 0) {
      return;
    }

    await this.storage.updateState((draft) => {
      draft.detectedSequences = updateDetectedSequences(draft.detectedSequences, candidates, timestamp);
    });

    await this.checkForSuggestions();
  }

  private async checkForSuggestions(): Promise<void> {
    const state = this.storage.getState();
    const minimumRepetitions = this.config.get().macrosMinimumRepetitions;
    const ready = findSequencesReadyForSuggestion(state.detectedSequences, minimumRepetitions);

    const existingMacroKeys = new Set(state.macros.map((m) => sequenceKey(m.steps.map((s) => s.commandId))));

    for (const sequence of ready) {
      const key = sequenceKey(sequence.commandIds);
      if (this.promptedThisSession.has(key) || existingMacroKeys.has(key)) {
        continue;
      }
      this.promptedThisSession.add(key);

      const accepted = await this.notifier.promptCreateMacro(sequence, getCommandTitle);
      if (accepted) {
        await this.createMacroFromSequence(sequence);
      }
    }
  }
}
