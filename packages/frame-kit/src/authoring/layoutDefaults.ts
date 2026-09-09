import {
  LayoutConfig,
  TemplateSettingsConfig,
  TextBox,
} from "../schema/frame.js";

/**
 * Applies default collector info bounds to a layout config if not specified.
 */
export function withCollectorInfoDefaults<T extends LayoutConfig>(
  config: T,
  defaultCollectorInfoBounds: TextBox,
): T {
  return {
    ...config,
    boxes: {
      ...config.boxes,
      collectorInfo: config.boxes.collectorInfo ?? defaultCollectorInfoBounds,
    },
    tallBoxes: config.tallBoxes
      ? {
          ...config.tallBoxes,
          collectorInfo:
            config.tallBoxes.collectorInfo ?? defaultCollectorInfoBounds,
        }
      : undefined,
    backBoxes: config.backBoxes
      ? {
          ...config.backBoxes,
          collectorInfo:
            config.backBoxes.collectorInfo ?? defaultCollectorInfoBounds,
        }
      : undefined,
    sagaFrontBoxes: config.sagaFrontBoxes
      ? {
          ...config.sagaFrontBoxes,
          collectorInfo:
            config.sagaFrontBoxes.collectorInfo ?? defaultCollectorInfoBounds,
        }
      : undefined,
    sagaBackBoxes: config.sagaBackBoxes
      ? {
          ...config.sagaBackBoxes,
          collectorInfo:
            config.sagaBackBoxes.collectorInfo ?? defaultCollectorInfoBounds,
        }
      : undefined,
    creatureBoxes: config.creatureBoxes
      ? {
          ...config.creatureBoxes,
          collectorInfo:
            config.creatureBoxes.collectorInfo ?? defaultCollectorInfoBounds,
        }
      : undefined,
    backCreatureBoxes: config.backCreatureBoxes
      ? {
          ...config.backCreatureBoxes,
          collectorInfo:
            config.backCreatureBoxes.collectorInfo ??
            defaultCollectorInfoBounds,
        }
      : undefined,
    sagaFrontCreatureBoxes: config.sagaFrontCreatureBoxes
      ? {
          ...config.sagaFrontCreatureBoxes,
          collectorInfo:
            config.sagaFrontCreatureBoxes.collectorInfo ??
            defaultCollectorInfoBounds,
        }
      : undefined,
    sagaBackCreatureBoxes: config.sagaBackCreatureBoxes
      ? {
          ...config.sagaBackCreatureBoxes,
          collectorInfo:
            config.sagaBackCreatureBoxes.collectorInfo ??
            defaultCollectorInfoBounds,
        }
      : undefined,
    // Saga layouts swap `boxes` for `flipsidePtBoxes` on face 0 when the
    // other face has power/toughness (see renderCardToCanvas) — without this,
    // that swap silently drops collector info whenever it triggers.
    flipsidePtBoxes: config.flipsidePtBoxes
      ? {
          ...config.flipsidePtBoxes,
          collectorInfo:
            config.flipsidePtBoxes.collectorInfo ?? defaultCollectorInfoBounds,
        }
      : undefined,
  };
}

export function withSettingsDefaults<T extends LayoutConfig>(
  config: T,
  defaultSettings: TemplateSettingsConfig,
): T {
  const layoutSettings = config.templateSettings ?? {};
  const mergedSettings = { ...defaultSettings, ...layoutSettings };

  return {
    ...config,
    templateSettings: mergedSettings,
  };
}
