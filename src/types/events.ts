/**
 * Source classification for a command execution.
 *
 * NOTE: VS Code does not expose a true trigger-source for arbitrary command
 * executions. `menu` and `commandPalette` are inferred from the UI element
 * that fired the command (via `vscode.commands.registerCommand` wrapping and
 * context-menu-specific command IDs); `keyboard` is inferred from keybinding
 * matches recorded via the keybindings registry. `unknown` is used whenever
 * the source cannot be confidently classified, and consumers must treat it
 * as a non-signal rather than guessing.
 */
export type CommandTriggerSource = 'keyboard' | 'menu' | 'commandPalette' | 'toolbar' | 'unknown';

export interface CommandExecutedEvent {
  readonly commandId: string;
  readonly source: CommandTriggerSource;
  readonly timestamp: number;
}

/**
 * A "mouse-driven" event is really a proxy: it represents a command that
 * could only plausibly have been triggered through a UI element (context
 * menu, toolbar button, explorer click), since VS Code does not emit raw
 * mouse coordinates or click events to extensions.
 */
export interface MouseDrivenCommandEvent {
  readonly commandId: string;
  readonly origin: 'contextMenu' | 'toolbar' | 'explorer' | 'editorGutter';
  readonly timestamp: number;
}

export interface KeyboardShortcutUsedEvent {
  readonly commandId: string;
  readonly keybinding: string;
  readonly timestamp: number;
}

export interface SessionBoundaryEvent {
  readonly kind: 'sessionStart' | 'sessionEnd';
  readonly timestamp: number;
}

/**
 * Union of every event carried on the internal EventBus. Extend this union
 * (not individual services) when introducing a new event type, so the bus
 * stays the single source of truth for what can flow through the system.
 */
export type DomainEvent =
  | { type: 'command.executed'; payload: CommandExecutedEvent }
  | { type: 'command.mouseDriven'; payload: MouseDrivenCommandEvent }
  | { type: 'command.keyboardShortcutUsed'; payload: KeyboardShortcutUsedEvent }
  | { type: 'session.boundary'; payload: SessionBoundaryEvent };

export type DomainEventType = DomainEvent['type'];

export type DomainEventPayload<T extends DomainEventType> = Extract<
  DomainEvent,
  { type: T }
>['payload'];
