import type {
  BorderState,
  CardBoxes,
  SecondFaceBoxes,
  TextBox,
  TextBoxOverride,
} from "../schema/frame.js";

/** What text boxes' `overrides` are matched against, for one render. */
export interface OverrideState {
  /** The border as it is about to be drawn; see `BorderStateSchema`. */
  border: BorderState;
  /** The template settings in effect for the layout, defaults included. */
  settings: Readonly<Record<string, unknown>>;
}

/**
 * The `CardBoxes` members that are text boxes, and so can carry `overrides`.
 * `boxOverrides.test.ts` fails if the contract gains one this does not list.
 */
const TEXT_BOX_KEYS = [
  "mana",
  "title",
  "type",
  "rules",
  "abilities",
  "pt",
  "collectorInfo",
  "startingLoyalty",
  "nicknameTitle",
  "keyword",
  "flipsidePt",
  "flipsideType",
  "flipsideManaCost",
  "flipsideRules",
  "insetTitle",
  "insetMana",
  "insetType",
  "insetRules",
  "defense",
  "fuse",
] as const satisfies readonly (keyof CardBoxes)[];

/**
 * The same for a second face's set. `boxOverrides.test.ts` holds this list to
 * the contract too.
 */
const SECOND_FACE_TEXT_BOX_KEYS = [
  "title",
  "mana",
  "type",
  "rules",
  "pt",
] as const satisfies readonly (keyof SecondFaceBoxes)[];

/** Whether every condition an override names holds for one render. */
export function overrideMatches(
  when: TextBoxOverride["when"],
  state: OverrideState,
): boolean {
  if (when.border !== undefined) {
    const borders =
      typeof when.border === "string" ? [when.border] : when.border;
    if (!borders.includes(state.border)) {
      return false;
    }
  }
  return Object.entries(when.settings ?? {}).every(
    ([key, value]) => state.settings[key] === value,
  );
}

function resolveTextBox(box: TextBox, state: OverrideState): TextBox {
  const { overrides = [], ...resolved } = box;
  for (const override of overrides) {
    if (overrideMatches(override.when, state)) {
      Object.assign(resolved, override.style);
    }
  }
  return resolved;
}

/**
 * A box set as the renderer draws it for one render: each text box with its
 * matching `overrides` merged over it in order, and the list itself dropped.
 * Bare bounds (`art`, `setSymbol`, `ptImage`) pass through untouched.
 */
export function resolveBoxOverrides(
  boxes: CardBoxes,
  state: OverrideState,
): CardBoxes {
  const resolved = { ...boxes };
  for (const key of TEXT_BOX_KEYS) {
    const box = boxes[key];
    if (box?.overrides) {
      resolved[key] = resolveTextBox(box, state);
    }
  }
  return resolved;
}

/** {@link resolveBoxOverrides} for the set a second face is drawn from. */
export function resolveSecondFaceBoxOverrides(
  boxes: SecondFaceBoxes,
  state: OverrideState,
): SecondFaceBoxes {
  const resolved = { ...boxes };
  for (const key of SECOND_FACE_TEXT_BOX_KEYS) {
    const box = boxes[key];
    if (box?.overrides) {
      resolved[key] = resolveTextBox(box, state);
    }
  }
  return resolved;
}
