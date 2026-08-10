import { describe, expect, it } from 'vitest';
import {
  CURATED_COMMANDS,
  findCuratedCommand,
  validateCuratedCommandCatalog,
  validateCuratedCommandsHaveDefaults,
} from '../../src/coach/CuratedCommandCatalog';
import { CORE_DEFAULT_KEYBINDINGS } from '../../src/keymaps/DefaultKeybindings.data';
import type { CuratedCommandDefinition } from '../../src/types/curatedCommands';

describe('validateCuratedCommandCatalog', () => {
  it('reports no problems for the real, shipped catalog', () => {
    expect(validateCuratedCommandCatalog(CURATED_COMMANDS)).toEqual([]);
  });

  it('flags a duplicate shadowCommandId', () => {
    const catalog: CuratedCommandDefinition[] = [
      { shadowCommandId: 'shortcutSensei.shadow.a', realCommandId: 'x.a', title: 'A', category: 'C', menuContexts: ['editor/context'], when: 'true' },
      { shadowCommandId: 'shortcutSensei.shadow.a', realCommandId: 'x.b', title: 'A2', category: 'C', menuContexts: ['editor/context'], when: 'true' },
    ];
    const problems = validateCuratedCommandCatalog(catalog);
    expect(problems.some((p) => p.includes('Duplicate shadowCommandId'))).toBe(true);
  });

  it('flags a real command shadowed more than once', () => {
    const catalog: CuratedCommandDefinition[] = [
      { shadowCommandId: 'shortcutSensei.shadow.a', realCommandId: 'x.same', title: 'A', category: 'C', menuContexts: ['editor/context'], when: 'true' },
      { shadowCommandId: 'shortcutSensei.shadow.b', realCommandId: 'x.same', title: 'B', category: 'C', menuContexts: ['editor/context'], when: 'true' },
    ];
    const problems = validateCuratedCommandCatalog(catalog);
    expect(problems.some((p) => p.includes('shadowed more than once'))).toBe(true);
  });

  it('flags an entry with no menu contexts as unreachable', () => {
    const catalog: CuratedCommandDefinition[] = [
      { shadowCommandId: 'shortcutSensei.shadow.a', realCommandId: 'x.a', title: 'A', category: 'C', menuContexts: [], when: 'true' },
    ];
    const problems = validateCuratedCommandCatalog(catalog);
    expect(problems.some((p) => p.includes('unreachable'))).toBe(true);
  });

  it('flags a shadowCommandId that does not follow the naming convention', () => {
    const catalog: CuratedCommandDefinition[] = [
      { shadowCommandId: 'wrongPrefix.a', realCommandId: 'x.a', title: 'A', category: 'C', menuContexts: ['editor/context'], when: 'true' },
    ];
    const problems = validateCuratedCommandCatalog(catalog);
    expect(problems.some((p) => p.includes('naming convention'))).toBe(true);
  });
});

describe('findCuratedCommand', () => {
  it('finds an existing entry by shadowCommandId', () => {
    const entry = findCuratedCommand('shortcutSensei.shadow.formatDocument');
    expect(entry?.realCommandId).toBe('editor.action.formatDocument');
  });

  it('returns undefined for an unknown id', () => {
    expect(findCuratedCommand('shortcutSensei.shadow.doesNotExist')).toBeUndefined();
  });
});

describe('validateCuratedCommandsHaveDefaults', () => {
  it('reports no problems for the real, shipped catalog against the real defaults table', () => {
    expect(validateCuratedCommandsHaveDefaults(CURATED_COMMANDS, CORE_DEFAULT_KEYBINDINGS)).toEqual([]);
  });

  it('flags a curated command whose real command has no entry in the defaults table', () => {
    const catalog: CuratedCommandDefinition[] = [
      {
        shadowCommandId: 'shortcutSensei.shadow.unknownDefault',
        realCommandId: 'some.command.with.no.known.default',
        title: 'Unknown',
        category: 'C',
        menuContexts: ['editor/context'],
        when: 'true',
      },
    ];
    const problems = validateCuratedCommandsHaveDefaults(catalog, CORE_DEFAULT_KEYBINDINGS);
    expect(problems.some((p) => p.includes('unknownDefault'))).toBe(true);
  });
});
