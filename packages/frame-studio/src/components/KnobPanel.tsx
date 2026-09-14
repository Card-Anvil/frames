import { Grid, Input, Text, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

import { getSource } from "../api/client.js";
import type { FramePayload, FrameSlot, Provenance } from "../api/types.js";
import { atPath } from "../lib/frameModel.js";

export interface KnobPanelProps {
  slug: string;
  payload: FramePayload;
  /** The `kind: "knobs"` slots present in the current layout. */
  slots: readonly FrameSlot[];
  editable: boolean;
  onChange: (path: readonly string[], value: number | boolean) => void;
}

/**
 * The layout's render knobs: ability spacing, padding, crown and nickname
 * offsets.
 *
 * These are plain numbers on the layout, so they edit exactly like a box
 * coordinate — and they are the values with no on-canvas handle to drag, which
 * is precisely why they are worth surfacing.
 */
export function KnobPanel(props: KnobPanelProps): React.JSX.Element | null {
  const { slug, payload, slots, editable, onChange } = props;
  const [provenance, setProvenance] = useState<Record<string, Provenance>>({});

  const fields = useMemo(
    () =>
      slots.flatMap((slot) => {
        const value = atPath(payload.frame, slot.path);
        if (value === null || typeof value !== "object") {
          return [];
        }
        return Object.entries(value as Record<string, unknown>)
          .filter(
            ([, item]) => typeof item === "number" || typeof item === "boolean",
          )
          .map(([key, item]) => ({
            slot: slot.key,
            key,
            value: item as number | boolean,
            path: [...slot.path, key],
          }));
      }),
    [slots, payload],
  );

  useEffect(() => {
    setProvenance({});
    if (fields.length === 0) {
      return;
    }
    let cancelled = false;
    void Promise.all(
      fields.map(async (field) => {
        try {
          return [
            field.path.join("."),
            await getSource(slug, field.path),
          ] as const;
        } catch {
          return undefined;
        }
      }),
    ).then((entries) => {
      if (!cancelled) {
        setProvenance(
          Object.fromEntries(entries.filter((entry) => entry !== undefined)),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug, fields]);

  if (fields.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" gap="2" p="3" borderTopWidth="1px">
      <Text fontSize="xs" textTransform="uppercase" color="fg.muted">
        Layout knobs
      </Text>
      {fields.map((field) => {
        const source = provenance[field.path.join(".")];
        const locked = !editable || (source !== undefined && !source.editable);
        return (
          <Grid
            key={field.path.join(".")}
            templateColumns="120px 1fr"
            gap="2"
            alignItems="center"
          >
            <Text
              fontSize="xs"
              color="fg.muted"
              truncate
              title={`${field.slot}.${field.key}`}
            >
              {slots.length > 1
                ? `${field.slot.replace(/Config$/, "")}.${field.key}`
                : field.key}
            </Text>
            <VStack align="stretch" gap="0">
              <Input
                size="xs"
                value={String(field.value)}
                disabled={locked}
                onChange={(event) => {
                  if (typeof field.value === "boolean") {
                    onChange(field.path, event.target.value === "true");
                    return;
                  }
                  const next = Number(event.target.value);
                  if (!Number.isNaN(next)) {
                    onChange(field.path, next);
                  }
                }}
              />
              {source && !source.editable && (
                <Text
                  fontSize="xs"
                  color="fg.warning"
                  truncate
                  title={source.detail}
                >
                  🔒 {source.reason}
                </Text>
              )}
              {source?.editable === true && (
                <Text fontSize="xs" color="fg.success" truncate>
                  {source.file.split("/").pop()}:{source.line}
                </Text>
              )}
            </VStack>
          </Grid>
        );
      })}
    </VStack>
  );
}
