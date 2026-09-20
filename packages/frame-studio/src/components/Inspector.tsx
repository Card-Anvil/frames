import {
  Badge,
  Box,
  Grid,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import type { TextBoxOverride } from "@cardanvil/frame-kit";
import {
  type OverrideState,
  overrideMatches,
} from "@cardanvil/frame-kit/layout";

import { getSource } from "../api/client.js";
import type { Provenance, TextBox } from "../api/types.js";

export interface InspectorProps {
  slug: string;
  boxKey: string | undefined;
  box: TextBox | undefined;
  basePath: readonly string[];
  /** The border and settings the canvas is showing, to mark active overrides. */
  state: OverrideState;
  editable: boolean;
  onChange: (field: string, value: number | string | boolean) => void;
}

/** The fields edited one input apiece: the box's scalars, not its `overrides`. */
const scalarFields = (box: TextBox): string[] =>
  Object.entries(box)
    .filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value),
    )
    .map(([field]) => field);

function describeWhen(when: TextBoxOverride["when"]): string {
  const parts = [
    ...(when.border === undefined
      ? []
      : [
          `border ${typeof when.border === "string" ? when.border : when.border.join(" | ")}`,
        ]),
    ...Object.entries(when.settings ?? {}).map(
      ([key, value]) => `${key} = ${String(value)}`,
    ),
  ];
  return parts.length > 0 ? parts.join(", ") : "always";
}

const describeStyle = (style: TextBoxOverride["style"]): string =>
  Object.entries(style)
    .map(([field, value]) => `${field} ${String(value)}`)
    .join(", ");

/**
 * A box's conditional restyles, read-only: which rule applies is the point,
 * and the rules are written in the frame's source. The ones that match the
 * border and settings on the canvas are marked, and are what it draws.
 */
function OverrideList(props: {
  overrides: readonly TextBoxOverride[];
  state: OverrideState;
}): React.JSX.Element {
  const { overrides, state } = props;
  return (
    <VStack align="stretch" gap="1" pt="2" borderTopWidth="1px">
      <Text fontSize="xs" textTransform="uppercase" color="fg.muted">
        Overrides
      </Text>
      {overrides.length === 0 && (
        <Text fontSize="xs" color="fg.muted">
          None: this box keeps its own style whatever the border does.
        </Text>
      )}
      {overrides.map((override, index) => {
        const active = overrideMatches(override.when, state);
        return (
          <HStack
            // Rules have no identity beyond their position in the list.
            key={index}
            gap="2"
            align="start"
            opacity={active ? 1 : 0.5}
          >
            <Badge
              size="sm"
              colorPalette={active ? "teal" : "gray"}
              variant={active ? "solid" : "outline"}
            >
              {active ? "active" : "idle"}
            </Badge>
            <Text fontSize="xs">
              {describeWhen(override.when)} → {describeStyle(override.style)}
            </Text>
          </HStack>
        );
      })}
    </VStack>
  );
}

/** Order the contract declares, with geometry first. */
const FIELD_ORDER = [
  "x",
  "y",
  "width",
  "height",
  "fontSize",
  "color",
  "outlineColor",
  "outlineWidth",
  "opacity",
  "textAlign",
  "verticalAlign",
  "fontFamily",
  "shadow",
];

function ProvenanceBadge({ value }: { value: Provenance | undefined }) {
  if (!value) {
    return null;
  }
  if (value.editable) {
    const shared = value.shared.length;
    const where = `${value.file}:${String(value.line)}`;
    return (
      <Text
        fontSize="10px"
        color={shared > 0 ? "fg.warning" : "fg.success"}
        truncate
        title={
          shared > 0
            ? `${where} — also read by ${String(shared)} other box ${
                shared === 1 ? "set" : "sets"
              }: ${value.shared
                .map((impact) => `${impact.layout}.${impact.boxSet}`)
                .join(", ")}`
            : where
        }
      >
        {value.file.split("/").pop()}:{value.line}
        {shared > 0 ? ` · shared ×${String(shared + 1)}` : ""}
        {value.sharedDefault ? " · default" : ""}
      </Text>
    );
  }
  return (
    <Text fontSize="10px" color="fg.warning" truncate title={value.detail}>
      🔒 {value.reason}
    </Text>
  );
}

export function Inspector(props: InspectorProps): React.JSX.Element {
  const { slug, boxKey, box, basePath, state, editable, onChange } = props;
  const [provenance, setProvenance] = useState<Record<string, Provenance>>({});

  // Ask the server where each field is written, so a locked value is visible
  // before the user tries to drag it.
  useEffect(() => {
    setProvenance({});
    if (!boxKey || !box) {
      return;
    }
    let cancelled = false;
    const fields = scalarFields(box);
    void Promise.all(
      fields.map(async (field) => {
        try {
          return [
            field,
            await getSource(slug, [...basePath, boxKey, field], true),
          ] as const;
        } catch {
          return undefined;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      setProvenance(
        Object.fromEntries(entries.filter((entry) => entry !== undefined)),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [slug, boxKey, box, basePath]);

  if (!boxKey || !box) {
    return (
      <Box p="3">
        <Text fontSize="xs" color="fg.muted">
          Select a box to edit it.
        </Text>
      </Box>
    );
  }

  const fields = scalarFields(box);
  const present = FIELD_ORDER.filter((field) => fields.includes(field)).concat(
    fields.filter((field) => !FIELD_ORDER.includes(field)),
  );

  return (
    <VStack align="stretch" gap="2" p="3">
      <HStack>
        <Text fontWeight="600">{boxKey}</Text>
        {!editable && <Badge colorPalette="yellow">read-only</Badge>}
      </HStack>

      {present.map((field) => {
        const value = (box as unknown as Record<string, unknown>)[field];
        const source = provenance[field];
        const locked = !editable || (source !== undefined && !source.editable);
        return (
          <Grid
            key={field}
            templateColumns="90px 1fr"
            gap="2"
            alignItems="center"
          >
            <Text fontSize="xs" color="fg.muted" truncate title={field}>
              {field}
            </Text>
            <VStack align="stretch" gap="0">
              <Input
                size="xs"
                value={
                  typeof value === "string"
                    ? value
                    : typeof value === "number" || typeof value === "boolean"
                      ? String(value)
                      : ""
                }
                disabled={locked}
                onChange={(event) => {
                  const next =
                    typeof value === "number"
                      ? Number(event.target.value)
                      : typeof value === "boolean"
                        ? event.target.value === "true"
                        : event.target.value;
                  if (typeof next === "number" && Number.isNaN(next)) {
                    return;
                  }
                  onChange(field, next);
                }}
              />
              <ProvenanceBadge value={source} />
            </VStack>
          </Grid>
        );
      })}

      {box.overrides !== undefined && (
        <OverrideList overrides={box.overrides} state={state} />
      )}
    </VStack>
  );
}
