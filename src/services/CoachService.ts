import { CooldownManager, type CooldownConfig } from '../coach/CooldownManager';
import { formatCoachMessage } from '../coach/SuggestionFormatter';
import { CURATED_COMMANDS } from '../coach/CuratedCommandCatalog';
import { DisposableStore } from '../utils/disposableStore';
import type { EventBus } from '../analytics/EventBus';
import type { ConfigService } from '../configuration/ConfigService';
import type { CoachNotifier } from '../ui/notifications/CoachNotifier';
import type { IKeybindingRegistry } from './interfaces/IKeybindingRegistry';
import type { ICoachService } from './interfaces/ICoachService';
import type { Logger } from '../utils/logger';

/** realCommandId -> display title, built once from the curated catalog. */
const TITLE_BY_REAL_COMMAND_ID = new Map<string, string>(
  CURATED_COMMANDS.map((c) => [c.realCommandId, c.title]),
);

export class CoachService implements ICoachService {
  private readonly disposables = new DisposableStore();
  private activated = false;

  public constructor(
    private readonly eventBus: EventBus,
    private readonly keybindingRegistry: IKeybindingRegistry,
    private readonly cooldownManager: CooldownManager,
    private readonly config: ConfigService,
    private readonly notifier: CoachNotifier,
    private readonly logger: Logger,
  ) {}

  public activate(): void {
    if (this.activated) {
      this.logger.warn('CoachService.activate() called more than once; ignoring.');
      return;
    }
    this.activated = true;

    this.disposables.add(
      this.eventBus.subscribe('command.mouseDriven', (payload) => {
        this.handleMouseDrivenCommand(payload.commandId, payload.timestamp);
      }),
    );
  }

  public dispose(): void {
    this.disposables.dispose();
    this.activated = false;
  }

  private handleMouseDrivenCommand(commandId: string, timestamp: number): void {
    const settings = this.config.get();
    if (!settings.productivityEnabled || !settings.coachEnabled) {
      return;
    }

    const bindings = this.keybindingRegistry.getBindingsForCommand(commandId);
    const activeBinding = bindings[0];
    if (!activeBinding) {
      // Nothing to teach: either the command genuinely has no keybinding,
      // or (for a command outside CORE_DEFAULT_KEYBINDINGS' curated
      // coverage) we simply don't know one. Silence is correct here —
      // surfacing "no shortcut known" would be noise, not a suggestion.
      return;
    }

    const cooldownConfig: CooldownConfig = {
      cooldownMinutes: settings.coachCooldownMinutes,
      maxSuggestionsPerHour: settings.coachMaxSuggestionsPerHour,
    };
    const decision = this.cooldownManager.canSuggest(commandId, cooldownConfig, timestamp);
    if (!decision.allowed) {
      this.logger.debug(`Coach suppressed suggestion for "${commandId}": ${decision.reason}`);
      return;
    }

    void this.cooldownManager.recordSuggestion(commandId, timestamp);

    const title = TITLE_BY_REAL_COMMAND_ID.get(commandId) ?? commandId;
    const message = formatCoachMessage(title, activeBinding.normalizedKey);
    this.notifier.show(message, settings.coachNotificationStyle);
  }
}
