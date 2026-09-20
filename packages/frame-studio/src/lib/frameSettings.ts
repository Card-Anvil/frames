import type {
  Frame,
  LayoutConfig,
  TemplateSettingConfig,
} from "@cardanvil/frame-kit";
import {
  type SettingValue,
  type TemplateSettingValues,
  layoutTemplateSettings,
  mergeTemplateSettings,
  templateSettingDefaults,
} from "@cardanvil/frame-kit/layout";

/**
 * Settings the studio already controls elsewhere: `frameVariant` is the
 * toolbar's variant picker, and nyx borders and UB crowns are Card toggles.
 */
export const SETTINGS_WITH_OWN_CONTROL: ReadonlySet<string> = new Set([
  "frameVariant",
  "useNyxBorder",
  "useUBCrowns",
]);

export interface SettingEntry {
  /** Where the value lives: at the frame level, or under the layout's key. */
  readonly scope: "frame" | "layout";
  readonly key: string;
  readonly config: TemplateSettingConfig;
}

/**
 * The payload's `frame` is the schema-validated frame serialized to JSON, so it
 * really is a `Frame` — asserted once, here.
 */
export const asFrame = (value: unknown): Frame => value as Frame;

function layoutConfig(frame: Frame, layout: string): LayoutConfig | undefined {
  return Object.entries(frame.config.layouts).find(
    ([name]) => name === layout,
  )?.[1];
}

/**
 * The settings a layout offers, frame-level ones first, as Card Anvil lists
 * them — minus the ones the studio already has a control for.
 */
export function settingEntries(frame: Frame, layout: string): SettingEntry[] {
  const at = (
    scope: SettingEntry["scope"],
    settings: Readonly<Record<string, TemplateSettingConfig>> | undefined,
  ): SettingEntry[] =>
    Object.entries(settings ?? {}).map(([key, config]) => ({
      scope,
      key,
      config,
    }));
  return [
    ...at("frame", frame.templateSettings),
    ...at("layout", layoutConfig(frame, layout)?.templateSettings),
  ].filter((entry) => !SETTINGS_WITH_OWN_CONTROL.has(entry.key));
}

/** `values` with one setting changed, stored where Card Anvil stores it. */
export function withSetting(
  values: TemplateSettingValues,
  entry: SettingEntry,
  layout: string,
  value: SettingValue,
): TemplateSettingValues {
  const change =
    entry.scope === "frame"
      ? { [entry.key]: value }
      : { [layout]: { [entry.key]: value } };
  return mergeTemplateSettings(values, change) ?? change;
}

export interface SettingsInEffect {
  /** Frame-level values, with each layout's sub-object — the stored shape. */
  readonly frame: TemplateSettingValues;
  /** What the renderer reads for this layout. */
  readonly layout: Readonly<Record<string, SettingValue>>;
}

/** The frame's declared defaults under whatever the studio has set. */
export function settingsInEffect(
  frame: Frame,
  values: TemplateSettingValues,
  layout: string,
): SettingsInEffect {
  const merged =
    mergeTemplateSettings(templateSettingDefaults(frame), values) ?? {};
  return { frame: merged, layout: layoutTemplateSettings(merged, layout) };
}
