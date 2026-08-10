import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductivityStatusBarItem } from '../../src/ui/statusbar/ProductivityStatusBarItem';
import { StorageService } from '../../src/storage/StorageService';
import { SchemaMigrator } from '../../src/storage/SchemaMigrator';
import { ReportService } from '../../src/services/ReportService';
import { MemoryMemento, window } from '../mocks/vscode.mock';
import type { Logger } from '../../src/utils/logger';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), dispose: vi.fn() } as unknown as Logger;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

afterEach(() => {
  window.__reset();
});

function setup() {
  const logger = makeLogger();
  const storage = new StorageService(new MemoryMemento() as never, new SchemaMigrator(logger), logger);
  const reportService = new ReportService(storage);
  return { storage, reportService };
}

describe('ProductivityStatusBarItem', () => {
  it('creates and shows a status bar item on construction', () => {
    const { storage, reportService } = setup();
    new ProductivityStatusBarItem(storage, reportService);

    const items = window.__getCreatedStatusBarItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.shown).toBe(true);
  });

  it('sets the click command to shortcutSensei.showProductivityReport', () => {
    const { storage, reportService } = setup();
    new ProductivityStatusBarItem(storage, reportService);

    expect(window.__getCreatedStatusBarItems()[0]?.command).toBe('shortcutSensei.showProductivityReport');
  });

  it('shows a placeholder ("--%") when there is no data yet', () => {
    const { storage, reportService } = setup();
    new ProductivityStatusBarItem(storage, reportService);

    expect(window.__getCreatedStatusBarItems()[0]?.text).toContain('--%');
  });

  it('shows the keyboard ratio percentage once there is data', async () => {
    const { storage, reportService } = setup();
    await storage.updateState((draft) => {
      draft.commandStats['x'] = {
        commandId: 'x',
        totalExecutions: 10,
        keyboardExecutions: 8,
        mouseDrivenExecutions: 2,
        firstExecutedAt: Date.now(),
        lastExecutedAt: Date.now(),
      };
    });

    const item = new ProductivityStatusBarItem(storage, reportService);
    void item;

    expect(window.__getCreatedStatusBarItems()[0]?.text).toContain('80%');
  });

  it('refreshes (debounced) when storage state changes', async () => {
    const { storage, reportService } = setup();
    new ProductivityStatusBarItem(storage, reportService);
    expect(window.__getCreatedStatusBarItems()[0]?.text).toContain('--%');

    await storage.updateState((draft) => {
      draft.commandStats['x'] = {
        commandId: 'x',
        totalExecutions: 5,
        keyboardExecutions: 5,
        mouseDrivenExecutions: 0,
        firstExecutedAt: Date.now(),
        lastExecutedAt: Date.now(),
      };
    });

    await wait(1100); // debounce is 1000ms
    expect(window.__getCreatedStatusBarItems()[0]?.text).toContain('100%');
  });

  it('disposes the underlying status bar item and unsubscribes on dispose()', () => {
    const { storage, reportService } = setup();
    const item = new ProductivityStatusBarItem(storage, reportService);
    item.dispose();

    expect(window.__getCreatedStatusBarItems()[0]?.disposed).toBe(true);
  });
});
