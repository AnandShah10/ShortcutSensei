/**
 * A deliberately minimal mock of the `vscode` module — just enough surface
 * area for unit tests to exercise storage, config, and event-bus logic
 * without a running VS Code host. Extend as new API surface is needed;
 * resist the temptation to mock everything up front.
 */

export class EventEmitter<T> {
  private listeners: Array<(value: T) => void> = [];

  public event = (listener: (value: T) => void): Disposable => {
    this.listeners.push(listener);
    return new Disposable(() => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    });
  };

  public fire(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }

  public dispose(): void {
    this.listeners = [];
  }
}

export class Disposable {
  public constructor(private readonly callOnDispose: () => void) {}
  public dispose(): void {
    this.callOnDispose();
  }
}

export class MemoryMemento {
  private store = new Map<string, unknown>();

  public get<T>(key: string, defaultValue?: T): T | undefined {
    return this.store.has(key) ? (this.store.get(key) as T) : defaultValue;
  }

  public update(key: string, value: unknown): Promise<void> {
    if (value === undefined) {
      this.store.delete(key);
    } else {
      this.store.set(key, value);
    }
    return Promise.resolve();
  }

  public keys(): readonly string[] {
    return [...this.store.keys()];
  }
}

class MockOutputChannel {
  public readonly lines: string[] = [];
  public appendLine(value: string): void {
    this.lines.push(value);
  }
  public dispose(): void {
    /* no-op */
  }
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

class MockStatusBarItem {
  public text = '';
  public tooltip: string | undefined;
  public command: string | undefined;
  public shown = false;
  public disposed = false;

  public show(): void {
    this.shown = true;
  }
  public dispose(): void {
    this.disposed = true;
  }
}

const statusBarMessages: Array<{ message: string; timeout?: number }> = [];
const informationMessages: string[] = [];
const errorMessages: string[] = [];
const createdStatusBarItems: MockStatusBarItem[] = [];
const openedDocuments: Array<{ content: string; language?: string }> = [];
const shownDocuments: unknown[] = [];
let inputBoxResponse: string | undefined;

let informationMessageResponse: string | undefined;

export const window = {
  createOutputChannel(_name: string): MockOutputChannel {
    return new MockOutputChannel();
  },
  showInformationMessage(message: string, ..._items: string[]): Promise<string | undefined> {
    informationMessages.push(message);
    return Promise.resolve(informationMessageResponse);
  },
  __setInformationMessageResponse(value: string | undefined): void {
    informationMessageResponse = value;
  },
  showErrorMessage(message: string): Promise<string | undefined> {
    errorMessages.push(message);
    return Promise.resolve(undefined);
  },
  setStatusBarMessage(message: string, timeout?: number): Disposable {
    statusBarMessages.push(timeout === undefined ? { message } : { message, timeout });
    return new Disposable(() => {
      /* no-op */
    });
  },
  createStatusBarItem(_alignment?: StatusBarAlignment, _priority?: number): MockStatusBarItem {
    const item = new MockStatusBarItem();
    createdStatusBarItems.push(item);
    return item;
  },
  async showTextDocument(document: unknown, _options?: unknown): Promise<unknown> {
    shownDocuments.push(document);
    return document;
  },
  async showQuickPick(items: unknown[], options?: unknown): Promise<unknown> {
    shownQuickPicks.push({ items, options });
    if (quickPickResponder) {
      return quickPickResponder(items, options);
    }
    return undefined;
  },
  async showInputBox(_options?: unknown): Promise<string | undefined> {
    return inputBoxResponse;
  },
  __setInputBoxResponse(value: string | undefined): void {
    inputBoxResponse = value;
  },
  registerTreeDataProvider(viewId: string, provider: unknown): Disposable {
    registeredTreeDataProviders.set(viewId, provider);
    return new Disposable(() => {
      registeredTreeDataProviders.delete(viewId);
    });
  },
  __getRegisteredTreeDataProvider(viewId: string): unknown {
    return registeredTreeDataProviders.get(viewId);
  },
  __getInformationMessages(): readonly string[] {
    return informationMessages;
  },
  __getErrorMessages(): readonly string[] {
    return errorMessages;
  },
  __getStatusBarMessages(): ReadonlyArray<{ message: string; timeout?: number }> {
    return statusBarMessages;
  },
  __getCreatedStatusBarItems(): readonly MockStatusBarItem[] {
    return createdStatusBarItems;
  },
  __getShownDocuments(): readonly unknown[] {
    return shownDocuments;
  },
  __reset(): void {
    informationMessages.length = 0;
    errorMessages.length = 0;
    statusBarMessages.length = 0;
    createdStatusBarItems.length = 0;
    shownDocuments.length = 0;
    informationMessageResponse = undefined;
  },
};

/**
 * A settable in-memory configuration store for tests. Call
 * `__setConfig('shortcutSensei', { 'coach.enabled': false })` then fire
 * `__fireConfigChange('shortcutSensei')` to simulate a settings edit.
 */
class MockWorkspaceConfiguration {
  public constructor(
    private readonly section: string,
    private readonly store: Map<string, Record<string, unknown>>,
  ) {}

  public get<T>(key: string, defaultValue: T): T {
    const sectionValues = this.store.get(this.section) ?? {};
    return key in sectionValues ? (sectionValues[key] as T) : defaultValue;
  }

  public update(key: string, value: unknown, _target?: unknown): Promise<void> {
    const current = this.store.get(this.section) ?? {};
    this.store.set(this.section, { ...current, [key]: value });
    return Promise.resolve();
  }
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

const configStore = new Map<string, Record<string, unknown>>();
const configChangeEmitter = new EventEmitter<{ affectsConfiguration: (section: string) => boolean }>();

export const workspace = {
  getConfiguration(section: string): MockWorkspaceConfiguration {
    return new MockWorkspaceConfiguration(section, configStore);
  },
  onDidChangeConfiguration: configChangeEmitter.event,
  async openTextDocument(options: { content: string; language?: string }): Promise<{
    content: string;
    language?: string;
  }> {
    openedDocuments.push(options);
    return options;
  },
  __setConfig(section: string, values: Record<string, unknown>): void {
    configStore.set(section, { ...(configStore.get(section) ?? {}), ...values });
  },
  __fireConfigChange(section: string): void {
    configChangeEmitter.fire({ affectsConfiguration: (s: string) => s === section });
  },
  __getOpenedDocuments(): ReadonlyArray<{ content: string; language?: string }> {
    return openedDocuments;
  },
  __reset(): void {
    configStore.clear();
    openedDocuments.length = 0;
  },
};

const clipboardWrites: string[] = [];

export const env = {
  clipboard: {
    async writeText(value: string): Promise<void> {
      clipboardWrites.push(value);
    },
  },
  __getClipboardWrites(): readonly string[] {
    return clipboardWrites;
  },
  __reset(): void {
    clipboardWrites.length = 0;
  },
};

type QuickPickResponder = (items: unknown[], options: unknown) => unknown;
let quickPickResponder: QuickPickResponder | null = null;
const shownQuickPicks: Array<{ items: unknown[]; options: unknown }> = [];

export function __setQuickPickResponder(responder: QuickPickResponder | null): void {
  quickPickResponder = responder;
}
export function __getShownQuickPicks(): ReadonlyArray<{ items: unknown[]; options: unknown }> {
  return shownQuickPicks;
}
export function __resetQuickPick(): void {
  quickPickResponder = null;
  shownQuickPicks.length = 0;
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class ThemeIcon {
  public constructor(public readonly id: string) {}
}

export class TreeItem {
  public description?: string;
  public iconPath?: unknown;
  public contextValue?: string;
  public command?: unknown;

  public constructor(
    public readonly label: string,
    public readonly collapsibleState?: TreeItemCollapsibleState,
  ) {}
}

const registeredTreeDataProviders = new Map<string, unknown>();

export default { EventEmitter, Disposable, window, workspace };

type CommandHandler = (...args: unknown[]) => unknown;

const registeredCommands = new Map<string, CommandHandler>();
const executedCommands: Array<{ command: string; args: unknown[] }> = [];

export const commands = {
  registerCommand(command: string, callback: CommandHandler): Disposable {
    registeredCommands.set(command, callback);
    return new Disposable(() => {
      registeredCommands.delete(command);
    });
  },
  async executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
    executedCommands.push({ command, args });
    const handler = registeredCommands.get(command);
    if (handler) {
      return handler(...args);
    }
    return undefined;
  },
  __isRegistered(command: string): boolean {
    return registeredCommands.has(command);
  },
  __getExecutedCommands(): ReadonlyArray<{ command: string; args: unknown[] }> {
    return executedCommands;
  },
  __reset(): void {
    registeredCommands.clear();
    executedCommands.length = 0;
  },
};
