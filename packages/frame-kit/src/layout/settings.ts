import type { Frame } from "../schema/frame.js";

/** One template setting's value. */
export type SettingValue = boolean | string | number;

/**
 * A frame's template settings as an app stores them: frame-level values as
 * top-level keys, and each layout's own settings as a sub-object under the
 * layout's name.
 */
export type TemplateSettingValues = Record<
  string,
  SettingValue | Record<string, SettingValue>
>;

function isPlainObject(value: unknown): value is Record<string, SettingValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A frame's declared defaults, in that shape. Only `config.layouts`
 * contributes layout settings — an alternate layout shares its base layout's.
 */
export function templateSettingDefaults(frame: Frame): TemplateSettingValues {
  const defaults: TemplateSettingValues = {};
  for (const [key, setting] of Object.entries(frame.templateSettings ?? {})) {
    defaults[key] = setting.defaultValue;
  }
  for (const [layout, config] of Object.entries(frame.config.layouts)) {
    const settings = config.templateSettings;
    if (!settings) {
      continue;
    }
    const layoutDefaults: Record<string, SettingValue> = {};
    for (const [key, setting] of Object.entries(settings)) {
      layoutDefaults[key] = setting.defaultValue;
    }
    defaults[layout] = layoutDefaults;
  }
  return defaults;
}

/**
 * Merges a sparse override onto a base, one level deep so per-layout
 * sub-objects merge by key rather than being replaced wholesale.
 */
export function mergeTemplateSettings(
  base: TemplateSettingValues | undefined,
  override: TemplateSettingValues | undefined,
): TemplateSettingValues | undefined {
  if (!override) {
    return base;
  }
  if (!base) {
    return override;
  }
  const result: TemplateSettingValues = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key];
    result[key] =
      isPlainObject(value) && isPlainObject(baseValue)
        ? { ...baseValue, ...value }
        : value;
  }
  return result;
}

/**
 * The settings in effect for one layout — what the renderer reads, and what a
 * text box's `when.settings` matches: the frame-level values with the
 * layout's own sub-object laid over them. Other layouts' sub-objects are left
 * out.
 */
export function layoutTemplateSettings(
  settings: TemplateSettingValues | undefined,
  layout: string,
): Record<string, SettingValue> {
  const inEffect: Record<string, SettingValue> = {};
  for (const [key, value] of Object.entries(settings ?? {})) {
    if (!isPlainObject(value)) {
      inEffect[key] = value;
    }
  }
  const own = settings?.[layout];
  return isPlainObject(own) ? { ...inEffect, ...own } : inEffect;
}
