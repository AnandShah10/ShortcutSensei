import * as vscode from 'vscode';
import { ServiceContainer, createToken } from './container/ServiceContainer';
import { Logger } from './utils/logger';
import { ConfigService } from './configuration/ConfigService';
import { EventBus } from './analytics/EventBus';
import { StorageService } from './storage/StorageService';
import { SchemaMigrator } from './storage/SchemaMigrator';
import { ExportImportService } from './storage/ExportImportService';
import { CommandTrackerService } from './services/CommandTrackerService';
import { AnalyticsService } from './analytics/AnalyticsService';
import { KeybindingRegistry, detectPlatform } from './keymaps/KeybindingRegistry';
import { CoachService } from './services/CoachService';
import { CooldownManager } from './coach/CooldownManager';
import { CoachNotifier } from './ui/notifications/CoachNotifier';
import { ReportService } from './services/ReportService';
import { ReportPresenter } from './ui/ReportPresenter';
import { ProductivityStatusBarItem } from './ui/statusbar/ProductivityStatusBarItem';
import { OptimizerService } from './services/OptimizerService';
import { OptimizerQuickPick } from './ui/quickpick/OptimizerQuickPick';
import { ConflictService } from './services/ConflictService';
import { ConflictTreeProvider, type ConflictTreeNode } from './ui/treeviews/ConflictTreeProvider';
import { MacroService } from './services/MacroService';
import { MacroRunner } from './macros/MacroRunner';
import { MacroDetectedNotifier } from './ui/notifications/MacroDetectedNotifier';
import { MacroEditorQuickPick } from './ui/quickpick/MacroEditorQuickPick';
import { LeaderKeyService } from './services/LeaderKeyService';
import { ProductivityTreeProvider } from './ui/treeviews/ProductivityTreeProvider';
import { CoachTreeProvider } from './ui/treeviews/CoachTreeProvider';
import { OptimizerTreeProvider } from './ui/treeviews/OptimizerTreeProvider';
import { MacrosTreeProvider } from './ui/treeviews/MacrosTreeProvider';
import { AnalyticsTreeProvider } from './ui/treeviews/AnalyticsTreeProvider';
import { CURATED_COMMANDS } from './coach/CuratedCommandCatalog';
import { buildShortcutStatisticsRows, formatShortcutStatisticsAsMarkdown } from './reports/ShortcutStatisticsFormatter';
import type { IStorageService } from './services/interfaces/IStorageService';
import type { ICommandTracker } from './services/interfaces/ICommandTracker';
import type { IAnalyticsService } from './services/interfaces/IAnalyticsService';
import type { IKeybindingRegistry } from './services/interfaces/IKeybindingRegistry';
import type { ICoachService } from './services/interfaces/ICoachService';
import type { IReportService } from './services/interfaces/IReportService';
import type { IOptimizerService } from './services/interfaces/IOptimizerService';
import type { IConflictService } from './services/interfaces/IConflictService';
import type { IMacroService } from './services/interfaces/IMacroService';
import type { ConflictResolutionAction } from './types/models';

/**
 * Foundational service tokens. Feature-specific tokens (coach, optimizer,
 * conflicts, macros, trackers, UI providers) are added in their own phase
 * alongside their implementation — see PROJECT_STATUS.md for what's live.
 */
const Tokens = {
  Logger: createToken<Logger>('logger'),
  Config: createToken<ConfigService>('config'),
  EventBus: createToken<EventBus>('eventBus'),
  Storage: createToken<IStorageService>('storage'),
  Migrator: createToken<SchemaMigrator>('migrator'),
  ExportImport: createToken<ExportImportService>('exportImport'),
  CommandTracker: createToken<ICommandTracker>('commandTracker'),
  Analytics: createToken<IAnalyticsService>('analytics'),
  KeybindingRegistry: createToken<IKeybindingRegistry>('keybindingRegistry'),
  CooldownManager: createToken<CooldownManager>('cooldownManager'),
  CoachNotifier: createToken<CoachNotifier>('coachNotifier'),
  Coach: createToken<ICoachService>('coach'),
  ReportService: createToken<IReportService>('reportService'),
  ReportPresenter: createToken<ReportPresenter>('reportPresenter'),
  StatusBarItem: createToken<ProductivityStatusBarItem>('statusBarItem'),
  Optimizer: createToken<IOptimizerService>('optimizer'),
  ConflictService: createToken<IConflictService>('conflictService'),
  ConflictTreeProvider: createToken<ConflictTreeProvider>('conflictTreeProvider'),
  MacroRunner: createToken<MacroRunner>('macroRunner'),
  MacroDetectedNotifier: createToken<MacroDetectedNotifier>('macroDetectedNotifier'),
  MacroService: createToken<IMacroService>('macroService'),
  LeaderKey: createToken<LeaderKeyService>('leaderKey'),
  ProductivityTreeProvider: createToken<ProductivityTreeProvider>('productivityTreeProvider'),
  CoachTreeProvider: createToken<CoachTreeProvider>('coachTreeProvider'),
  OptimizerTreeProvider: createToken<OptimizerTreeProvider>('optimizerTreeProvider'),
  MacrosTreeProvider: createToken<MacrosTreeProvider>('macrosTreeProvider'),
  AnalyticsTreeProvider: createToken<AnalyticsTreeProvider>('analyticsTreeProvider'),
};

let container: ServiceContainer | undefined;

export function activate(context: vscode.ExtensionContext): void {
  container = new ServiceContainer();

  container.register(Tokens.Logger, () => new Logger('Shortcut Sensei'));
  container.register(Tokens.Config, () => new ConfigService());
  container.register(Tokens.EventBus, (c) => new EventBus(c.resolve(Tokens.Logger)));
  container.register(Tokens.Migrator, (c) => new SchemaMigrator(c.resolve(Tokens.Logger)));
  container.register(
    Tokens.Storage,
    (c) => new StorageService(context.globalState, c.resolve(Tokens.Migrator), c.resolve(Tokens.Logger)),
  );
  container.register(
    Tokens.ExportImport,
    (c) => new ExportImportService(c.resolve(Tokens.Storage), c.resolve(Tokens.Migrator)),
  );
  container.register(
    Tokens.CommandTracker,
    (c) => new CommandTrackerService(c.resolve(Tokens.EventBus), c.resolve(Tokens.Logger)),
  );
  container.register(
    Tokens.Analytics,
    (c) => new AnalyticsService(c.resolve(Tokens.EventBus), c.resolve(Tokens.Storage), c.resolve(Tokens.Logger)),
  );
  container.register(
    Tokens.KeybindingRegistry,
    (c) =>
      new KeybindingRegistry(
        context.globalStorageUri.fsPath,
        detectPlatform(),
        c.resolve(Tokens.Logger),
      ),
  );
  container.register(Tokens.CooldownManager, (c) => new CooldownManager(c.resolve(Tokens.Storage)));
  container.register(Tokens.CoachNotifier, () => new CoachNotifier());
  container.register(
    Tokens.Coach,
    (c) =>
      new CoachService(
        c.resolve(Tokens.EventBus),
        c.resolve(Tokens.KeybindingRegistry),
        c.resolve(Tokens.CooldownManager),
        c.resolve(Tokens.Config),
        c.resolve(Tokens.CoachNotifier),
        c.resolve(Tokens.Logger),
      ),
  );
  container.register(Tokens.ReportService, (c) => new ReportService(c.resolve(Tokens.Storage)));
  container.register(Tokens.ReportPresenter, () => new ReportPresenter());
  container.register(
    Tokens.StatusBarItem,
    (c) => new ProductivityStatusBarItem(c.resolve(Tokens.Storage), c.resolve(Tokens.ReportService)),
  );
  container.register(
    Tokens.Optimizer,
    (c) =>
      new OptimizerService(
        c.resolve(Tokens.Storage),
        c.resolve(Tokens.KeybindingRegistry),
        c.resolve(Tokens.Config),
        c.resolve(Tokens.Logger),
      ),
  );
  container.register(
    Tokens.ConflictService,
    (c) => new ConflictService(c.resolve(Tokens.KeybindingRegistry), c.resolve(Tokens.Logger)),
  );
  container.register(
    Tokens.ConflictTreeProvider,
    (c) => new ConflictTreeProvider(c.resolve(Tokens.ConflictService)),
  );
  container.register(Tokens.MacroRunner, (c) => new MacroRunner(c.resolve(Tokens.Logger)));
  container.register(Tokens.MacroDetectedNotifier, () => new MacroDetectedNotifier());
  container.register(
    Tokens.MacroService,
    (c) =>
      new MacroService(
        c.resolve(Tokens.EventBus),
        c.resolve(Tokens.Storage),
        c.resolve(Tokens.Config),
        c.resolve(Tokens.MacroRunner),
        c.resolve(Tokens.MacroDetectedNotifier),
        c.resolve(Tokens.Logger),
      ),
  );
  container.register(Tokens.LeaderKey, (c) => new LeaderKeyService(c.resolve(Tokens.Config), c.resolve(Tokens.Logger)));
  container.register(Tokens.ProductivityTreeProvider, (c) => new ProductivityTreeProvider(c.resolve(Tokens.ReportService)));
  container.register(
    Tokens.CoachTreeProvider,
    (c) => new CoachTreeProvider(c.resolve(Tokens.Storage), c.resolve(Tokens.KeybindingRegistry)),
  );
  container.register(Tokens.OptimizerTreeProvider, (c) => new OptimizerTreeProvider(c.resolve(Tokens.Optimizer)));
  container.register(Tokens.MacrosTreeProvider, (c) => new MacrosTreeProvider(c.resolve(Tokens.MacroService)));
  container.register(Tokens.AnalyticsTreeProvider, (c) => new AnalyticsTreeProvider(c.resolve(Tokens.Storage)));

  const logger = container.resolve(Tokens.Logger);
  logger.info('Shortcut Sensei activating.');

  // Force early construction of Config/Storage so config-dependent features
  // (registered in later phases) can rely on both being ready by the time
  // this function returns, without every feature re-triggering construction.
  container.resolve(Tokens.Config);
  container.resolve(Tokens.Storage);
  container.resolve(Tokens.CommandTracker).activate();
  container.resolve(Tokens.Analytics).activate();
  container.resolve(Tokens.Coach).activate();
  void container.resolve(Tokens.KeybindingRegistry).refresh();
  container.resolve(Tokens.StatusBarItem); // constructor wires everything; resolve() is enough to activate it
  container.resolve(Tokens.MacroService).activate();
  container.resolve(Tokens.LeaderKey).activate();

  registerAnalyticsCommands(context, container);
  registerProductivityCommands(context, container);
  registerOptimizerCommands(context, container);
  registerConflictCommands(context, container);
  registerMacroCommands(context, container);
  registerToggleAndStatisticsCommands(context, container);
  registerRemainingTreeViews(context, container);

  context.subscriptions.push({
    dispose: () => {
      container?.disposeAll();
      container = undefined;
    },
  });

  logger.info('Shortcut Sensei activated.');
}

export function deactivate(): void {
  container?.disposeAll();
  container = undefined;
}

/**
 * Registers the subset of commands from the CODE_QUALITY/COMMANDS spec
 * that are fully backed by real services today (export/import/reset of
 * local analytics data). Other commands (productivity report, optimizer,
 * macros, conflicts, coach/anti-mouse toggles) are registered in the
 * phases that implement their backing services, per the "never produce
 * placeholder code" rule — a command that can't yet do anything real is
 * worse than no command at all.
 */
function registerAnalyticsCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer,
): void {
  const exportImport = services.resolve(Tokens.ExportImport);
  const storage = services.resolve(Tokens.Storage);
  const logger = services.resolve(Tokens.Logger);

  context.subscriptions.push(
    vscode.commands.registerCommand('shortcutSensei.exportAnalytics', async () => {
      const json = exportImport.exportToJson();
      const uri = await vscode.window.showSaveDialog({
        filters: { JSON: ['json'] },
        saveLabel: 'Export Shortcut Sensei Data',
      });
      if (!uri) {
        return;
      }
      try {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf8'));
        void vscode.window.showInformationMessage('Shortcut Sensei data exported.');
      } catch (error) {
        logger.error('Failed to export analytics', error);
        void vscode.window.showErrorMessage('Failed to export Shortcut Sensei data.');
      }
    }),

    vscode.commands.registerCommand('shortcutSensei.importAnalytics', async () => {
      const uris = await vscode.window.showOpenDialog({
        filters: { JSON: ['json'] },
        canSelectMany: false,
        openLabel: 'Import Shortcut Sensei Data',
      });
      const uri = uris?.[0];
      if (!uri) {
        return;
      }
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        await exportImport.importFromJson(Buffer.from(bytes).toString('utf8'));
        void vscode.window.showInformationMessage('Shortcut Sensei data imported.');
      } catch (error) {
        logger.error('Failed to import analytics', error);
        void vscode.window.showErrorMessage(
          error instanceof Error ? error.message : 'Failed to import Shortcut Sensei data.',
        );
      }
    }),

    vscode.commands.registerCommand('shortcutSensei.resetAnalytics', async () => {
      const confirmed = await vscode.window.showWarningMessage(
        'This will permanently delete all locally stored Shortcut Sensei data. Continue?',
        { modal: true },
        'Reset',
      );
      if (confirmed !== 'Reset') {
        return;
      }
      await storage.resetState();
      void vscode.window.showInformationMessage('Shortcut Sensei data has been reset.');
    }),
  );
}

/** Registers "Show Productivity Report", backed by ReportService + ReportPresenter. */
function registerProductivityCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer,
): void {
  const reportService = services.resolve(Tokens.ReportService);
  const presenter = services.resolve(Tokens.ReportPresenter);
  const logger = services.resolve(Tokens.Logger);

  context.subscriptions.push(
    vscode.commands.registerCommand('shortcutSensei.showProductivityReport', async () => {
      try {
        const report = reportService.generateReport('daily');
        await presenter.show(report);
      } catch (error) {
        logger.error('Failed to show productivity report', error);
        void vscode.window.showErrorMessage('Failed to generate the Shortcut Sensei productivity report.');
      }
    }),
  );
}

/** Registers "Optimize My Shortcuts", backed by OptimizerService + OptimizerQuickPick. */
function registerOptimizerCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer,
): void {
  const optimizerService = services.resolve(Tokens.Optimizer);
  const logger = services.resolve(Tokens.Logger);

  context.subscriptions.push(
    vscode.commands.registerCommand('shortcutSensei.optimizeShortcuts', async () => {
      try {
        await new OptimizerQuickPick(optimizerService).run();
      } catch (error) {
        logger.error('Optimizer flow failed', error);
        void vscode.window.showErrorMessage('Shortcut Sensei: something went wrong while optimizing shortcuts.');
      }
    }),
  );
}

const CONFLICT_ACTION_OPTIONS: ReadonlyArray<{ label: string; description: string; action: ConflictResolutionAction }> = [
  { label: '$(circle-slash) Disable', description: 'Unbind this command from the conflicting key', action: 'disable' },
  { label: '$(replace) Remap', description: 'Move this command to a new key', action: 'remap' },
  { label: '$(eye-closed) Ignore', description: 'Dismiss for now (not remembered)', action: 'ignore' },
];

/**
 * Registers the Conflicts tree view, keeps it refreshed as the underlying
 * keybinding data changes, and registers "Open Conflict Visualizer" plus
 * the context-menu "Resolve Conflict" action on individual contributors.
 */
function registerConflictCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer,
): void {
  const conflictService = services.resolve(Tokens.ConflictService);
  const treeProvider = services.resolve(Tokens.ConflictTreeProvider);
  const keybindingRegistry = services.resolve(Tokens.KeybindingRegistry);
  const logger = services.resolve(Tokens.Logger);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('shortcutSensei.conflicts', treeProvider),
    keybindingRegistry.onDidChange(() => treeProvider.refresh()),

    vscode.commands.registerCommand('shortcutSensei.openConflictVisualizer', async () => {
      try {
        await vscode.commands.executeCommand('workbench.view.extension.shortcutSensei');
      } catch (error) {
        logger.error('Failed to reveal the Shortcut Sensei activity bar view', error);
      }
    }),

    vscode.commands.registerCommand('shortcutSensei.resolveConflict', async (node: unknown) => {
      const contributorNode = node as ConflictTreeNode | undefined;
      if (!contributorNode || contributorNode.kind !== 'contributor') {
        return;
      }

      const pick = await vscode.window.showQuickPick(CONFLICT_ACTION_OPTIONS, {
        title: `Resolve "${contributorNode.contributor.commandId}" on ${contributorNode.conflict.keybinding}`,
        placeHolder: 'Choose how to resolve this contributor\u2019s side of the conflict',
      });
      if (!pick) {
        return;
      }

      let newKey: string | undefined;
      if (pick.action === 'remap') {
        newKey = await vscode.window.showInputBox({
          prompt: 'Enter the new key combination (e.g. ctrl+alt+r)',
          placeHolder: 'ctrl+alt+r',
        });
        if (!newKey) {
          return;
        }
      }

      try {
        await conflictService.resolveConflict(
          contributorNode.conflict,
          pick.action,
          contributorNode.contributor.commandId,
          newKey,
        );
        treeProvider.refresh();
      } catch (error) {
        logger.error('Failed to resolve conflict', error);
        void vscode.window.showErrorMessage('Shortcut Sensei: failed to resolve the conflict.');
      }
    }),
  );
}

/** Registers "Manage Macros" and "Create Macro", both backed by MacroEditorQuickPick. */
function registerMacroCommands(context: vscode.ExtensionContext, services: ServiceContainer): void {
  const macroService = services.resolve(Tokens.MacroService);
  const logger = services.resolve(Tokens.Logger);
  const quickPick = new MacroEditorQuickPick(macroService);

  context.subscriptions.push(
    vscode.commands.registerCommand('shortcutSensei.manageMacros', async () => {
      try {
        await quickPick.run();
      } catch (error) {
        logger.error('Macro management flow failed', error);
        void vscode.window.showErrorMessage('Shortcut Sensei: something went wrong while managing macros.');
      }
    }),

    vscode.commands.registerCommand('shortcutSensei.createMacro', async () => {
      try {
        await quickPick.runCreate();
      } catch (error) {
        logger.error('Macro creation flow failed', error);
        void vscode.window.showErrorMessage('Shortcut Sensei: something went wrong while creating the macro.');
      }
    }),
  );
}

/** Toggles a boolean setting under the shortcutSensei section and confirms the new state. */
async function toggleSetting(settingPath: string, currentValue: boolean, label: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('shortcutSensei');
  await config.update(settingPath, !currentValue, vscode.ConfigurationTarget.Global);
  void vscode.window.showInformationMessage(`${label} ${!currentValue ? 'enabled' : 'disabled'}.`);
}

/**
 * Registers "Toggle Shortcut Coach", "Toggle Anti-Mouse Mode", and "Show
 * Shortcut Statistics" — the remaining commands declared in package.json
 * that didn't yet have a backing implementation.
 */
function registerToggleAndStatisticsCommands(
  context: vscode.ExtensionContext,
  services: ServiceContainer,
): void {
  const config = services.resolve(Tokens.Config);
  const storage = services.resolve(Tokens.Storage);
  const keybindingRegistry = services.resolve(Tokens.KeybindingRegistry);
  const presenter = services.resolve(Tokens.ReportPresenter);
  const logger = services.resolve(Tokens.Logger);

  context.subscriptions.push(
    vscode.commands.registerCommand('shortcutSensei.toggleShortcutCoach', async () => {
      await toggleSetting('coach.enabled', config.get().coachEnabled, 'Shortcut Coach');
    }),

    vscode.commands.registerCommand('shortcutSensei.toggleAntiMouseMode', async () => {
      // "Anti-Mouse Mode" maps to the master productivity toggle: the
      // status bar indicator, report generation, and coaching all read
      // from this same setting, so there's no separate signal to flip
      // that would mean something different from turning the feature set
      // off entirely.
      await toggleSetting('productivity.enabled', config.get().productivityEnabled, 'Anti-Mouse Mode');
    }),

    vscode.commands.registerCommand('shortcutSensei.showShortcutStatistics', async () => {
      try {
        const rows = buildShortcutStatisticsRows(
          CURATED_COMMANDS,
          (commandId) => keybindingRegistry.getBindingsForCommand(commandId),
          storage.getState().commandStats,
        );
        await presenter.showMarkdown(formatShortcutStatisticsAsMarkdown(rows));
      } catch (error) {
        logger.error('Failed to show shortcut statistics', error);
        void vscode.window.showErrorMessage('Shortcut Sensei: failed to generate shortcut statistics.');
      }
    }),
  );
}

/**
 * Registers the five remaining Activity Bar views (Conflicts is wired
 * separately in registerConflictCommands, since it's paired with its own
 * resolve-conflict command). Each provider refreshes on the data sources
 * it actually reads from.
 */
function registerRemainingTreeViews(context: vscode.ExtensionContext, services: ServiceContainer): void {
  const storage = services.resolve(Tokens.Storage);
  const keybindingRegistry = services.resolve(Tokens.KeybindingRegistry);

  const productivityProvider = services.resolve(Tokens.ProductivityTreeProvider);
  const coachProvider = services.resolve(Tokens.CoachTreeProvider);
  const optimizerProvider = services.resolve(Tokens.OptimizerTreeProvider);
  const macrosProvider = services.resolve(Tokens.MacrosTreeProvider);
  const analyticsProvider = services.resolve(Tokens.AnalyticsTreeProvider);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('shortcutSensei.productivity', productivityProvider),
    vscode.window.registerTreeDataProvider('shortcutSensei.shortcutCoach', coachProvider),
    vscode.window.registerTreeDataProvider('shortcutSensei.optimizer', optimizerProvider),
    vscode.window.registerTreeDataProvider('shortcutSensei.macros', macrosProvider),
    vscode.window.registerTreeDataProvider('shortcutSensei.analytics', analyticsProvider),

    storage.onDidChangeState(() => {
      productivityProvider.refresh();
      coachProvider.refresh();
      optimizerProvider.refresh();
      macrosProvider.refresh();
      analyticsProvider.refresh();
    }),
    keybindingRegistry.onDidChange(() => {
      coachProvider.refresh();
      optimizerProvider.refresh();
    }),
  );
}
