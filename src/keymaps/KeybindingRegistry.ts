import * as vscode from 'vscode';
import { CORE_DEFAULT_KEYBINDINGS } from './DefaultKeybindings.data';
import { parseUserKeybindingsJson } from './KeybindingsJsonParser';
import { findBindingsForCommand, groupByNormalizedKey, resolveKeybindings } from './KeybindingResolver';
import { resolveUserKeybindingsPath } from './UserKeybindingsPathResolver';
import { debounce } from '../utils/debounce';
import type { Logger } from '../utils/logger';
import type { IKeybindingRegistry } from '../services/interfaces/IKeybindingRegistry';
import type { ExtensionManifestLike, KeybindingEntry, Platform, RawKeybindingContribution } from '../types/keymaps';

const REFRESH_DEBOUNCE_MS = 500;

export function detectPlatform(): Platform {
  if (process.platform === 'darwin') return 'mac';
  if (process.platform === 'win32') return 'win';
  return 'linux';
}

/**
 * Reads all extension-contributed keybindings currently installed,
 * skipping anything malformed rather than failing the whole scan.
 */
function readExtensionManifests(logger: Logger): ExtensionManifestLike[] {
  const manifests: ExtensionManifestLike[] = [];

  for (const ext of vscode.extensions.all) {
    try {
      const packageJson = ext.packageJSON as
        | { contributes?: { keybindings?: unknown }; displayName?: string }
        | undefined;
      const raw = packageJson?.contributes?.keybindings;
      if (!raw) {
        continue;
      }
      const list = Array.isArray(raw) ? raw : [raw];
      const keybindings = list.filter(isRawKeybindingShape);
      if (keybindings.length > 0) {
        manifests.push({
          id: ext.id,
          displayName: packageJson?.displayName ?? ext.id,
          keybindings,
        });
      }
    } catch (error) {
      logger.warn(`Skipping malformed manifest for extension "${ext.id}": ${String(error)}`);
    }
  }

  return manifests;
}

function isRawKeybindingShape(item: unknown): item is RawKeybindingContribution {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Record<string, unknown>).key === 'string' &&
    typeof (item as Record<string, unknown>).command === 'string'
  );
}

export class KeybindingRegistry implements IKeybindingRegistry, vscode.Disposable {
  private entries: KeybindingEntry[] = [];
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  private readonly watcher: vscode.FileSystemWatcher | undefined;
  private readonly debouncedRefresh: () => void;
  private readonly extensionsWatcher: vscode.Disposable | undefined;
  private disposed = false;

  public constructor(
    private readonly globalStorageFsPath: string,
    private readonly platform: Platform,
    private readonly logger: Logger,
  ) {
    this.debouncedRefresh = debounce(() => {
      void this.refresh();
    }, REFRESH_DEBOUNCE_MS);

    try {
      const keybindingsPath = resolveUserKeybindingsPath(this.globalStorageFsPath);
      const pattern = new vscode.RelativePattern(dirnameOf(keybindingsPath), 'keybindings.json');
      this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
      this.watcher.onDidChange(() => this.debouncedRefresh());
      this.watcher.onDidCreate(() => this.debouncedRefresh());
      this.watcher.onDidDelete(() => this.debouncedRefresh());
    } catch (error) {
      this.logger.warn(`Could not watch keybindings.json for changes: ${String(error)}`);
    }

    this.extensionsWatcher = vscode.extensions.onDidChange(() => this.debouncedRefresh());
  }

  public getAllEntries(): readonly KeybindingEntry[] {
    return this.entries;
  }

  public getBindingsForCommand(commandId: string): readonly KeybindingEntry[] {
    return findBindingsForCommand(this.entries, commandId);
  }

  public getEntriesByKey(): ReadonlyMap<string, readonly KeybindingEntry[]> {
    return groupByNormalizedKey(this.entries);
  }

  public async refresh(): Promise<void> {
    if (this.disposed) {
      return;
    }

    const extensionManifests = readExtensionManifests(this.logger);
    const userEntries = await this.readUserKeybindings();

    this.entries = resolveKeybindings(
      CORE_DEFAULT_KEYBINDINGS,
      extensionManifests,
      userEntries,
      this.platform,
    );
    this.changeEmitter.fire();
  }

  public onDidChange(listener: () => void): vscode.Disposable {
    return this.changeEmitter.event(listener);
  }

  public dispose(): void {
    this.disposed = true;
    this.watcher?.dispose();
    this.extensionsWatcher?.dispose();
    this.changeEmitter.dispose();
  }

  private async readUserKeybindings(): Promise<readonly RawKeybindingContribution[]> {
    try {
      const keybindingsPath = resolveUserKeybindingsPath(this.globalStorageFsPath);
      const uri = vscode.Uri.file(keybindingsPath);
      const bytes = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(bytes).toString('utf8');
      const { entries, parseError } = parseUserKeybindingsJson(content);
      if (parseError) {
        this.logger.warn(parseError);
      }
      return entries;
    } catch (error) {
      // File not existing yet (no user keybindings customized) is normal,
      // not an error worth surfacing.
      if (isFileNotFound(error)) {
        return [];
      }
      this.logger.warn(`Could not read keybindings.json: ${String(error)}`);
      return [];
    }
  }
}

function dirnameOf(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return idx >= 0 ? filePath.slice(0, idx) : filePath;
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'FileNotFound'
  );
}
