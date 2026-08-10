import { afterEach, describe, expect, it } from 'vitest';
import { MacroDetectedNotifier } from '../../src/ui/notifications/MacroDetectedNotifier';
import { window } from '../mocks/vscode.mock';
import type { DetectedSequence } from '../../src/types/models';

afterEach(() => {
  window.__reset();
});

const sequence: DetectedSequence = { commandIds: ['a', 'b'], occurrences: 6, lastSeenAt: 1000 };

describe('MacroDetectedNotifier.promptCreateMacro', () => {
  it('returns true when the user chooses "Create Macro"', async () => {
    window.__setInformationMessageResponse('Create Macro');
    const notifier = new MacroDetectedNotifier();

    const result = await notifier.promptCreateMacro(sequence, (id) => id);
    expect(result).toBe(true);
  });

  it('returns false when the user chooses "Not Now"', async () => {
    window.__setInformationMessageResponse('Not Now');
    const notifier = new MacroDetectedNotifier();

    const result = await notifier.promptCreateMacro(sequence, (id) => id);
    expect(result).toBe(false);
  });

  it('returns false when the user dismisses the notification', async () => {
    window.__setInformationMessageResponse(undefined);
    const notifier = new MacroDetectedNotifier();

    const result = await notifier.promptCreateMacro(sequence, (id) => id);
    expect(result).toBe(false);
  });

  it('includes the occurrence count and titled steps in the message', async () => {
    window.__setInformationMessageResponse('Not Now');
    const notifier = new MacroDetectedNotifier();

    await notifier.promptCreateMacro(sequence, (id) => `Title(${id})`);

    const message = window.__getInformationMessages()[0] ?? '';
    expect(message).toContain('6 times');
    expect(message).toContain('Title(a)');
    expect(message).toContain('Title(b)');
  });
});
