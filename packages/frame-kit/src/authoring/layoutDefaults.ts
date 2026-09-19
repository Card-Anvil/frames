import {
  LayoutConfig,
  TemplateSettingsConfig,
  TextBox,
  TextBoxOverride,
} from "../schema/frame.js";

/**
 * `overrides` for text printed on the frame's outer border ring — on most
 * frames, the collector line. The text turns black once a light border color
 * is picked, and gains a black outline when "No Border" cuts the ring away and
 * leaves it over the art.
 *
 * `withCollectorInfoDefaults` gives these to collector info unless its bounds
 * bring their own.
 */
export const onBorderTextOverrides: readonly TextBoxOverride[] = [
  {
    when: { border: "none" },
    style: { outlineColor: "black", outlineWidth: 19 },
  },
  { when: { border: "light" }, style: { color: "black" } },
];

/**
 * Applies default collector info bounds to a layout config if not specified.
 *
 * The collector info this fills in is taken to sit on the border ring, so it
 * gets `onBorderTextOverrides` — unless `defaultCollectorInfoBounds` brings its
 * own `overrides`, with `[]` for a collector line printed where the border
 * settings never reach. A collector box the layout defines itself is left
 * exactly as written.
 */
export function withCollectorInfoDefaults<T extends LayoutConfig>(
  config: T,
  defaultCollectorInfoBounds: TextBox,
): T {
  const collectorInfo: TextBox = {
    ...defaultCollectorInfoBounds,
    overrides: defaultCollectorInfoBounds.overrides ?? onBorderTextOverrides,
  };
  return {
    ...config,
    boxes: {
      ...config.boxes,
      collectorInfo: config.boxes.collectorInfo ?? collectorInfo,
    },
    tallBoxes: config.tallBoxes
      ? {
          ...config.tallBoxes,
          collectorInfo: config.tallBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    backBoxes: config.backBoxes
      ? {
          ...config.backBoxes,
          collectorInfo: config.backBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    sagaFrontBoxes: config.sagaFrontBoxes
      ? {
          ...config.sagaFrontBoxes,
          collectorInfo: config.sagaFrontBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    sagaBackBoxes: config.sagaBackBoxes
      ? {
          ...config.sagaBackBoxes,
          collectorInfo: config.sagaBackBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    creatureBoxes: config.creatureBoxes
      ? {
          ...config.creatureBoxes,
          collectorInfo: config.creatureBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    backCreatureBoxes: config.backCreatureBoxes
      ? {
          ...config.backCreatureBoxes,
          collectorInfo:
            config.backCreatureBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    sagaFrontCreatureBoxes: config.sagaFrontCreatureBoxes
      ? {
          ...config.sagaFrontCreatureBoxes,
          collectorInfo:
            config.sagaFrontCreatureBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    sagaBackCreatureBoxes: config.sagaBackCreatureBoxes
      ? {
          ...config.sagaBackCreatureBoxes,
          collectorInfo:
            config.sagaBackCreatureBoxes.collectorInfo ?? collectorInfo,
        }
      : undefined,
    // Saga layouts swap `boxes` for `flipsidePtBoxes` on face 0 when the
    // other face has power/toughness (see renderCardToCanvas) — without this,
    // that swap silently drops collector info whenever it triggers.
    flipsidePtBoxes: config.flipsidePtBoxes
      ? {
          ...config.flipsidePtBoxes,
          collectorInfo: config.flipsidePtBoxes.collectorInfo ?? collectorInfo,
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
