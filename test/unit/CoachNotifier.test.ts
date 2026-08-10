import { afterEach, describe, expect, it } from 'vitest';
import { CoachNotifier } from '../../src/ui/notifications/CoachNotifier';
import { window } from '../mocks/vscode.mock';

afterEach(() => {
  window.__reset();
});

describe('CoachNotifier', () => {
  it('shows an information message (toast) for style "toast"', () => {
    new CoachNotifier().show('hello', 'toast');
    expect(window.__getInformationMessages()).toEqual(['hello']);
    expect(window.__getStatusBarMessages()).toEqual([]);
  });

  it('shows a status bar message for style "statusBar"', () => {
    new CoachNotifier().show('hello', 'statusBar');
    expect(window.__getStatusBarMessages()).toHaveLength(1);
    expect(window.__getStatusBarMessages()[0]?.message).toBe('hello');
    expect(window.__getInformationMessages()).toEqual([]);
  });

  it('shows nothing for style "silent"', () => {
    new CoachNotifier().show('hello', 'silent');
    expect(window.__getInformationMessages()).toEqual([]);
    expect(window.__getStatusBarMessages()).toEqual([]);
  });
});
