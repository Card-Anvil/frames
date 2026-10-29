import { Frame, TemplateSettingsConfig, TextBox } from "@cardanvil/frame-kit";
import { withCollectorInfoDefaults } from "@cardanvil/frame-kit";

import { borderlessAdventureLayoutConfig } from "./adventureStorybooks/config";
import { borderlessCaseLayoutConfig } from "./caseClass/config";
import {
  adventureStyleSettings,
  borderlessInsetLayoutConfig,
  borderlessPrepareInsetLayoutConfig,
  omenStyleSettings,
  prepareStyleSettings,
} from "./inset/config";
import {
  borderlessMdfcLayoutConfig,
  borderlessMdfcTextlessLayoutConfig,
} from "./mdfc/config";
import { borderlessPlaneswalkerLayoutConfig } from "./planewalker/config";
import borderlessPreview from "./preview.jpg";
import {
  borderlessNormalLayoutConfig,
  borderlessNormalTextlessLayoutConfig,
  borderlessShortLayoutConfig,
  borderlessTokenLayoutConfig,
  borderlessTokenTextlessLayoutConfig,
  borderlessTokenShortLayoutConfig,
} from "./regular/config";
import {
  borderlessSagaLayoutConfig,
  borderlessSagaCreatureLayoutConfig,
  borderlessSagaTextlessLayoutConfig,
  borderlessSagaCreatureTextlessLayoutConfig,
} from "./saga/config";
import {
  borderlessSagaTransformLayoutConfig,
  borderlessSagaTransformCreatureLayoutConfig,
  borderlessSagaTransformTextlessLayoutConfig,
  borderlessSagaTransformCreatureTextlessLayoutConfig,
} from "./saga/transform/config";
import { borderlessTransformLayoutConfig } from "./transform/config";
import { borderlessTransformTextlessLayoutConfig } from "./transform/config";

export const defaultCollectorInfoBounds: TextBox = {
  x: 333,
  y: 4019,
  width: 2200,
  height: 200,
  fontSize: 50,
  color: "white",
  letterSpacing: 5,
};

export const borderlessSettings = {
  frameVariant: {
    type: "select",
    label: "Frame Variant",
    defaultValue: "normal",
    options: ["normal", "short", "textless"],
  },
  useNyxBorder: {
    type: "boolean",
    label: "Use Nyx Insert For Legendary Enchantments",
    defaultValue: false,
  },
  useUBCrowns: {
    type: "boolean",
    label: "Use Universes Beyond Crowns",
    defaultValue: false,
  },
  useNoBorder: {
    type: "boolean",
    label: "No Border",
    defaultValue: false,
  },
} as const satisfies TemplateSettingsConfig;

export const borderlessFrame = {
  name: "Borderless",
  description: "Borderless Frame",
  previewImage: borderlessPreview,
  tags: ["Borderless 2023"],
  config: {
    layouts: {
      normal: withCollectorInfoDefaults(
        borderlessNormalLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      // Tokens have no mana cost — widen the title by 10px and center it.
      token: withCollectorInfoDefaults(
        borderlessTokenLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      adventure: withCollectorInfoDefaults(
        {
          ...borderlessAdventureLayoutConfig,
          templateSettings: adventureStyleSettings,
        },
        defaultCollectorInfoBounds,
      ),
      // Omen and Prepare have no storybook art yet, so they are drawn inset.
      omen: withCollectorInfoDefaults(
        { ...borderlessInsetLayoutConfig, templateSettings: omenStyleSettings },
        defaultCollectorInfoBounds,
      ),
      prepare: withCollectorInfoDefaults(
        {
          ...borderlessPrepareInsetLayoutConfig,
          templateSettings: prepareStyleSettings,
        },
        defaultCollectorInfoBounds,
      ),
      case: withCollectorInfoDefaults(
        borderlessCaseLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      normal_planeswalker: withCollectorInfoDefaults(
        borderlessPlaneswalkerLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      saga: withCollectorInfoDefaults(
        borderlessSagaLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      saga_creature: withCollectorInfoDefaults(
        borderlessSagaCreatureLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      saga_transform: withCollectorInfoDefaults(
        borderlessSagaTransformLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      saga_transform_creature: withCollectorInfoDefaults(
        borderlessSagaTransformCreatureLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      transform: withCollectorInfoDefaults(
        borderlessTransformLayoutConfig,
        defaultCollectorInfoBounds,
      ),
      modal_dfc: withCollectorInfoDefaults(
        borderlessMdfcLayoutConfig,
        defaultCollectorInfoBounds,
      ),
    },
    // Alternate configs used instead of `layouts` (per-layout) when a
    // non-default frame variant is selected. Each key is a variant name
    // matching an option in the `frameVariant` select setting — or in a
    // layout's own select setting, as `inset` is; only layouts listed under
    // that key get the alternate look, any other layout falls back to its
    // normal config unaffected.
    alternateLayouts: {
      textless: {
        normal: withCollectorInfoDefaults(
          borderlessNormalTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        // Tokens have no mana cost — widen the title by 10px and center it.
        token: withCollectorInfoDefaults(
          borderlessTokenTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        saga: withCollectorInfoDefaults(
          borderlessSagaTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        saga_creature: withCollectorInfoDefaults(
          borderlessSagaCreatureTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        saga_transform: withCollectorInfoDefaults(
          borderlessSagaTransformTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        saga_transform_creature: withCollectorInfoDefaults(
          borderlessSagaTransformCreatureTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        transform: withCollectorInfoDefaults(
          borderlessTransformTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        modal_dfc: withCollectorInfoDefaults(
          borderlessMdfcTextlessLayoutConfig,
          defaultCollectorInfoBounds,
        ),
      },
      short: {
        normal: withCollectorInfoDefaults(
          borderlessShortLayoutConfig,
          defaultCollectorInfoBounds,
        ),
        // Tokens have no mana cost — widen the title by 10px and center it.
        token: withCollectorInfoDefaults(
          borderlessTokenShortLayoutConfig,
          defaultCollectorInfoBounds,
        ),
      },
      // Not a frame variant: named by the Adventure layout's own "Adventure"
      // setting, which draws an Adventure inset on the regular frame instead
      // of in its storybook.
      inset: {
        adventure: withCollectorInfoDefaults(
          borderlessInsetLayoutConfig,
          defaultCollectorInfoBounds,
        ),
      },
    },
  },
  templateSettings: {
    ...borderlessSettings,
  },
} as const satisfies Frame;
