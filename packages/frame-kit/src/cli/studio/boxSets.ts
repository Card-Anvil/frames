import { z } from "zod";

import { CardBoxesSchema, LayoutConfigSchema } from "../../schema/frame.js";
import {
  FrameAssetsSchema,
  LayoutMasksSchema,
} from "../../schema/frameAssets.js";

/**
 * What a `LayoutConfig` slot holds.
 *
 * `boxes` is the only kind the studio can edit geometry in; the other two are
 * listed so the layer panel can offer them without hard-coding field names.
 */
export type SlotKind = "boxes" | "assets" | "masks" | "knobs";

export interface LayoutSlot {
  /** The `LayoutConfig` property, e.g. `sagaBackCreatureBoxes`. */
  readonly key: string;
  readonly kind: SlotKind;
  /** False for every slot the contract marks optional. */
  readonly required: boolean;
}

interface SchemaNode {
  readonly type: string;
  readonly innerType?: z.ZodType;
  readonly shape?: Record<string, z.ZodType>;
}

/** Strips `.optional()` and friends to reach the schema that carries identity. */
function unwrap(schema: z.ZodType): { inner: z.ZodType; wrapped: boolean } {
  let current = schema;
  let wrapped = false;
  for (;;) {
    const node = current.def as SchemaNode;
    if (
      node.innerType === undefined ||
      ![
        "optional",
        "nullable",
        "default",
        "prefault",
        "readonly",
        "nonoptional",
      ].includes(node.type)
    ) {
      return { inner: current, wrapped };
    }
    current = node.innerType;
    wrapped = true;
  }
}

const KIND_BY_SCHEMA = new Map<z.ZodType, SlotKind>([
  [CardBoxesSchema, "boxes"],
  [FrameAssetsSchema, "assets"],
  [LayoutMasksSchema, "masks"],
]);

/**
 * Whether a schema is a plain object of numbers — a layout's render knobs
 * (`planeswalkerConfig`, `sagaConfig`, `crownConfig`, `nicknameConfig`).
 *
 * Recognised by shape rather than by name, so a knob group added to the
 * contract is editable in the studio without a change here. Records and enums
 * do not qualify, which is what keeps `templateSettings`, `colorArtOverrides`
 * and `hybridTitleMask` out.
 */
function isNumericObject(schema: z.ZodType): boolean {
  const node = schema.def as SchemaNode;
  if (node.type !== "object" || !node.shape) {
    return false;
  }
  const fields: z.ZodType[] = Object.values(node.shape);
  return (
    fields.length > 0 &&
    fields.every((field) => {
      const inner = unwrap(field).inner.def as SchemaNode;
      return inner.type === "number" || inner.type === "boolean";
    })
  );
}

/**
 * Every box / asset / mask / knob slot the frame contract defines, read off
 * the schema rather than listed by hand.
 *
 * Identity is the test: a slot counts as boxes because its schema *is*
 * `CardBoxesSchema`, not because its name ends in "Boxes". So a slot added to
 * `LayoutConfigSchema` shows up here — and in the studio — with no change,
 * and `boxSets.test.ts` fails if one is added that this cannot classify.
 */
export function layoutSlots(): LayoutSlot[] {
  const shape = (LayoutConfigSchema.def as { shape: Record<string, z.ZodType> })
    .shape;
  const slots: LayoutSlot[] = [];

  for (const [key, schema] of Object.entries(shape)) {
    const { inner, wrapped } = unwrap(schema);
    const kind =
      KIND_BY_SCHEMA.get(inner) ??
      (isNumericObject(inner) ? "knobs" : undefined);
    if (kind) {
      slots.push({ key, kind, required: !wrapped });
    }
  }
  return slots;
}

/** Just the slots holding `CardBoxes` — what the studio can edit. */
export function boxSlots(): LayoutSlot[] {
  return layoutSlots().filter((slot) => slot.kind === "boxes");
}

/**
 * Names of every member a `CardBoxes` can hold, in contract order.
 *
 * Used to enumerate a box set without assuming which optional members a given
 * frame happens to define.
 */
export function cardBoxKeys(): string[] {
  const shape = (CardBoxesSchema.def as { shape: Record<string, z.ZodType> })
    .shape;
  return Object.keys(shape);
}
