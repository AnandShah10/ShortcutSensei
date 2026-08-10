# Architecture

## Layered structure

```
Trackers (CommandTrackerService)
        ↓ publishes events
    EventBus  (internal pub/sub — the only thing trackers know about)
        ↓ subscribed to by
Services (AnalyticsService, CoachService, OptimizerService, ConflictService, MacroService, ...)
        ↓ read/write
StorageService  (versioned, single-key JSON blob in globalState)
        ↑ read by
UI (status bar, tree views, quick picks, notifications)
```

Trackers never call services directly, and services never call each other's internals directly — everything flows through the `EventBus` or through `StorageService`. This is what let each feature (Coach, Optimizer, Conflicts, Macros) be built and tested independently, and it's why adding Feature 6 (Leader Key) required touching zero existing trackers.

## The central constraint: no general command-execution observability

This shapes more of the codebase than any other single fact, so it's worth stating precisely: **VS Code exposes no API for observing execution of a command an extension didn't itself register.** There is no `vscode.commands.onDidExecuteCommand`. This is a deliberate VS Code platform decision (raised and declined as a feature request upstream), not an oversight.

Every feature that sounds like it "watches what you do" is actually built on **shadow commands** (`src/services/CommandTrackerService.ts`, catalog in `src/coach/CuratedCommandCatalog.ts`): for a curated list of ~10 commands, this extension contributes its own command into the same menu/palette slot, which the user clicks without knowing the difference, and which delegates transparently to the real command via `executeCommand`. Because *we* register that command, we can observe it being invoked — but only via that specific menu entry, not via a keyboard shortcut, and not for any command outside the curated list.

Every module downstream of this — Analytics, Coach, the Optimizer, Macro detection — inherits this narrowed visibility. It's documented at the point of use in each of those modules (search for "curated" or "shadow" in comments) rather than only here, so nobody stumbles into assuming broader coverage than actually exists.

## Module map

```
src/
  extension.ts              Activation entrypoint: wires the DI container, registers commands

  container/
    ServiceContainer.ts      Minimal lazy-singleton DI container

  types/                     Shared TypeScript types — the contract every layer agrees on
    events.ts                 EventBus payload shapes
    models.ts                 Domain types (CommandStats, Macro, KeybindingConflict, ...)
    settings.ts                Typed settings schema + defaults
    storage-schema.ts          Versioned persisted-state shape + migration source types
    keymaps.ts                  Keybinding-related types
    curatedCommands.ts           Curated catalog entry type

  utils/                     debounce, throttle, Logger, DisposableStore — no VS Code API deps

  storage/
    StorageService.ts         Single globalState-backed JSON blob, immutable updates
    SchemaMigrator.ts          Versioned migration (v1 -> v2 so far)
    ExportImportService.ts     Export/Import commands' backing logic

  configuration/
    ConfigService.ts          Typed wrapper over workspace.getConfiguration, change events

  analytics/
    EventBus.ts                Internal pub/sub
    CommandStatsAccumulator.ts  Pure delta-merge logic for command stats
    ProductivityCalculator.ts   Pure metrics: keyboard ratio, time-saved estimate, ranges
    SequenceDetector.ts         Pure sliding-window sequence detection (feeds Macros)
    AnalyticsService.ts         Batches EventBus events, flushes to storage on a debounce

  keymaps/
    PlatformKeyNormalizer.ts    Pure key-string canonicalization
    KeybindingsJsonParser.ts    Tolerant JSONC parser for keybindings.json
    UserKeybindingsPathResolver.ts   Derives keybindings.json path from globalStorageUri
    KeybindingResolver.ts       Pure merge of builtin+extension+user bindings, negation
    DefaultKeybindings.data.ts  Hand-maintained core-default table (see below)
    KeybindingRegistry.ts       VS Code-facing orchestrator tying the above together
    KeybindingWriter.ts         Shared "propose an edit via clipboard" mechanism

  coach/
    CuratedCommandCatalog.ts    The curated command list + cross-catalog validation
    CooldownManager.ts          Pure cooldown/rate-limit evaluation + storage-backed wrapper
    ShortcutKnowledgeModel.ts   "Known shortcut" heuristic
    SuggestionFormatter.ts      Message + keybinding display formatting

  optimizer/
    ErgonomicsScorer.ts         Pure, narrow ergonomics heuristic
    ConflictChecker.ts          Key availability + candidate generation
    SuggestionEngine.ts         Combines frequency + ergonomics + availability

  conflicts/
    ConflictDetector.ts         Pure duplicate/potentialOverride classification

  macros/
    MacroModel.ts                Pure macro construction + step manipulation
    MacroRunner.ts                Sequential step execution, stops on first failure

  reports/
    ReportMarkdownFormatter.ts   Pure markdown rendering of a ProductivityReport
    ShortcutStatisticsFormatter.ts  Pure markdown rendering for Show Shortcut Statistics

  services/                  VS Code-facing orchestrators, one per feature
    interfaces/                Abstractions each service implements
    CommandTrackerService.ts
    CoachService.ts
    OptimizerService.ts
    ConflictService.ts
    MacroService.ts
    ReportService.ts
    LeaderKeyService.ts

  ui/
    statusbar/ProductivityStatusBarItem.ts
    treeviews/                  One TreeDataProvider per activity-bar view
    quickpick/                  OptimizerQuickPick, MacroEditorQuickPick
    notifications/              CoachNotifier, MacroDetectedNotifier
    ReportPresenter.ts           Opens markdown content as a read-only editor tab

  telemetry/
    NullTelemetry.ts            Explicit no-op, making "no telemetry" auditable in code
```

## Design principles actually enforced in this codebase

1. **Pure logic, thin wrapper.** Every feature's actual decision-making (should Coach suggest this? is this a conflict? what's the ergonomics score?) lives in a module with zero `vscode` imports, fully testable with plain data. The corresponding `services/*Service.ts` file is deliberately thin — its job is marshaling real VS Code data into the pure function and real VS Code side effects out of it.
2. **Never mutate `keybindings.json`.** There's no API for it, and `KeybindingWriter.ts` is the single, shared implementation of the "clipboard + open the file" fallback — used by both the Optimizer and Conflict resolution rather than being duplicated.
3. **Storage updates are immutable.** `StorageService.updateState(mutator)` clones, mutates the clone, then swaps — so `getState()` never changes out from under a caller mid-computation.
4. **Debounce anything triggered by frequent events.** `AnalyticsService` batches command-execution deltas and flushes on a 2-second debounce rather than writing to storage on every event; the status bar refreshes on a 1-second debounce keyed off storage changes.
5. **Document the ceiling, don't paper over it.** Anywhere this extension's actual capability is narrower than a feature's name implies (Coach, Anti-Mouse Mode, Macro detection, Conflict coverage), that's stated in the nearest doc comment and in the README, not left implicit.

## Data model

See `src/types/storage-schema.ts` for the full persisted shape. Summary:

| Field | What it holds |
|---|---|
| `commandStats` | Per-command execution counts (total/keyboard/mouse), first/last seen |
| `coachSuggestions` | Per-command: last suggested timestamp + lifetime count (drives the "known" heuristic) |
| `detectedSequences` | Sliding-window sequence occurrence counts (feeds macro suggestions) |
| `macros` | User-created and auto-suggested macros |
| `knownShortcuts` | Reserved for future use — not currently written to |
| `sessionStartedAt` | Set once per activation |

Schema is versioned (`schemaVersion`), with `SchemaMigrator` handling upgrades from any prior shipped version. The v1→v2 migration (splitting a bare timestamp into `{lastSuggestedAt, count}`) is the reference example for how to add the next one.
