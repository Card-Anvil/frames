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

import { getSource } from "../api/client.js";
import type { Provenance, TextBox } from "../api/types.js";

export interface InspectorProps {
  slug: string;
  boxKey: string | undefined;
  box: TextBox | undefined;
  basePath: readonly string[];
  editable: boolean;
  onChange: (field: string, value: number | string | boolean) => void;
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
        color={shared > 0 ? "#e2b93d" : "#6a9955"}
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
    <Text fontSize="10px" color="#e2b93d" truncate title={value.detail}>
      🔒 {value.reason}
    </Text>
  );
}

export function Inspector(props: InspectorProps): React.JSX.Element {
  const { slug, boxKey, box, basePath, editable, onChange } = props;
  const [provenance, setProvenance] = useState<Record<string, Provenance>>({});

  // Ask the server where each field is written, so a locked value is visible
  // before the user tries to drag it.
  useEffect(() => {
    setProvenance({});
    if (!boxKey || !box) {
      return;
    }
    let cancelled = false;
    const fields = Object.keys(box);
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
        <Text fontSize="xs" color="#9d9d9d">
          Select a box to edit it.
        </Text>
      </Box>
    );
  }

  const present = FIELD_ORDER.filter((field) => field in box).concat(
    Object.keys(box).filter((field) => !FIELD_ORDER.includes(field)),
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
            <Text fontSize="xs" color="#9d9d9d" truncate title={field}>
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
    </VStack>
  );
}
