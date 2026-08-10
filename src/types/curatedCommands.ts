/**
 * Where a shadow command's menu item should appear. Kept as a closed union
 * (rather than a raw string) so package.json's `contributes.menus` and this
 * catalog can be cross-checked by a test without either drifting silently.
 */
export type ShadowMenuContext = 'editor/context' | 'explorer/context' | 'editor/title';

export interface CuratedCommandDefinition {
  /** The command WE register and contribute to menus/palette. */
  readonly shadowCommandId: string;
  /** The real VS Code (or extension) command this shadow delegates to. */
  readonly realCommandId: string;
  /** Human-readable title, shown in the menu and Command Palette. */
  readonly title: string;
  /** Grouping used in the productivity report and Coach UI. */
  readonly category: string;
  /** Menu locations where the shadow entry is contributed. */
  readonly menuContexts: readonly ShadowMenuContext[];
  /** `when` clause gating menu visibility, mirrored in package.json. */
  readonly when: string;
}
