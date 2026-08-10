import { describe, expect, it } from 'vitest';
import { CURATED_COMMANDS } from '../../src/coach/CuratedCommandCatalog';
import packageJson from '../../package.json';

interface PackageJsonCommand {
  command: string;
  title: string;
}
interface PackageJsonMenuItem {
  command: string;
  when?: string;
}

describe('package.json / CuratedCommandCatalog sync', () => {
  const commands = packageJson.contributes.commands as PackageJsonCommand[];
  const menus = packageJson.contributes.menus as Record<string, PackageJsonMenuItem[]>;

  it('declares a contributes.commands entry for every curated shadow command', () => {
    const declaredIds = new Set(commands.map((c) => c.command));
    for (const entry of CURATED_COMMANDS) {
      expect(declaredIds.has(entry.shadowCommandId)).toBe(true);
    }
  });

  it('declares a matching title for every curated shadow command', () => {
    const byId = new Map(commands.map((c) => [c.command, c.title]));
    for (const entry of CURATED_COMMANDS) {
      expect(byId.get(entry.shadowCommandId)).toBe(entry.title);
    }
  });

  it('contributes a menu entry for every menuContext declared in the catalog', () => {
    for (const entry of CURATED_COMMANDS) {
      for (const context of entry.menuContexts) {
        const menuItems = menus[context] ?? [];
        const found = menuItems.find((item) => item.command === entry.shadowCommandId);
        expect(found, `expected "${entry.shadowCommandId}" in menus["${context}"]`).toBeDefined();
        expect(found?.when).toBe(entry.when);
      }
    }
  });

  it('does not contribute menu entries for commands no longer in the catalog', () => {
    const catalogIds = new Set(CURATED_COMMANDS.map((c) => c.shadowCommandId));
    for (const [context, items] of Object.entries(menus)) {
      for (const item of items) {
        if (item.command.startsWith('shortcutSensei.shadow.')) {
          expect(
            catalogIds.has(item.command),
            `"${item.command}" in menus["${context}"] has no catalog entry`,
          ).toBe(true);
        }
      }
    }
  });
});
