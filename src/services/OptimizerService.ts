import { generateSuggestions } from '../optimizer/SuggestionEngine';
import { CURATED_COMMANDS } from '../coach/CuratedCommandCatalog';
import { KeybindingWriter } from '../keymaps/KeybindingWriter';
import type { IStorageService } from './interfaces/IStorageService';
import type { IKeybindingRegistry } from './interfaces/IKeybindingRegistry';
import type { IOptimizerService } from './interfaces/IOptimizerService';
import type { ConfigService } from '../configuration/ConfigService';
import type { Logger } from '../utils/logger';
import type { ShortcutSuggestion } from '../types/models';

const TITLE_BY_COMMAND_ID = new Map<string, string>(CURATED_COMMANDS.map((c) => [c.realCommandId, c.title]));

export class OptimizerService implements IOptimizerService {
  private readonly keybindingWriter: KeybindingWriter;

  public constructor(
    private readonly storage: IStorageService,
    private readonly keybindingRegistry: IKeybindingRegistry,
    private readonly config: ConfigService,
    logger: Logger,
  ) {
    this.keybindingWriter = new KeybindingWriter(logger);
  }

  public generateSuggestions(): ShortcutSuggestion[] {
    const commandStats = Object.values(this.storage.getState().commandStats);
    const entriesByKey = this.keybindingRegistry.getEntriesByKey();

    return generateSuggestions({
      commandStats,
      getBindingsForCommand: (commandId) => this.keybindingRegistry.getBindingsForCommand(commandId),
      entriesByKey,
      getCommandTitle: (commandId) => TITLE_BY_COMMAND_ID.get(commandId) ?? commandId,
      minimumUsage: this.config.get().optimizerMinimumUsage,
    });
  }

  public async applySuggestion(suggestion: ShortcutSuggestion): Promise<void> {
    const entries = [{ key: suggestion.suggestedKeybinding, command: suggestion.commandId }];

    // If replacing an existing binding, also include the negation entry so
    // the old shortcut stops firing once both are pasted in.
    if (suggestion.existingKeybinding) {
      entries.push({ key: suggestion.existingKeybinding, command: `-${suggestion.commandId}` });
    }

    await this.keybindingWriter.proposeEdit(entries);
  }
}

