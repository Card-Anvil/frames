import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CardShape } from "@cardanvil/frame-kit/layout";

import {
  getFrame,
  getFrames,
  getInfo,
  postEdits,
  subscribe,
} from "./api/client.js";
import type {
  Edit,
  FramePayload,
  FrameSummary,
  Impact,
  StudioInfo,
} from "./api/types.js";
import { CanvasPanel } from "./components/CanvasPanel.js";
import { CardShapePanel } from "./components/CardShapePanel.js";
import { Inspector } from "./components/Inspector.js";
import { KnobPanel } from "./components/KnobPanel.js";
import { LayerPanel } from "./components/LayerPanel.js";
import { SharedEditDialog } from "./components/SharedEditDialog.js";
import { DEFAULT_SHAPE, describeSelection } from "./lib/cardShape.js";
import { composite } from "./lib/composite.js";
import { atPath, boxesIn, layoutsOf } from "./lib/frameModel.js";
import { boxColor } from "./lib/hues.js";
import { assetLayers, maskLayers } from "./lib/layers.js";
import { PRESETS, useSampleText } from "./state/useSampleText.js";
import { isPreviewable } from "./text/singleLine.js";

export function App(): React.JSX.Element {
  const [info, setInfo] = useState<StudioInfo | undefined>();
  const [frames, setFrames] = useState<FrameSummary[]>([]);
  const [slug, setSlug] = useState<string | undefined>();
  const [payload, setPayload] = useState<FramePayload | undefined>();
  const [variant, setVariant] = useState<string | null>(null);
  const [layout, setLayout] = useState<string>("normal");
  const [slotKey, setSlotKey] = useState<string>("boxes");
  const [shape, setShape] = useState<CardShape>(DEFAULT_SHAPE);
  const [useNyxBorder, setUseNyxBorder] = useState(true);
  const [selected, setSelected] = useState<string | undefined>();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [showCardFace, setShowCardFace] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [overflow, setOverflow] = useState<Readonly<Record<string, number>>>(
    {},
  );
  const { sampleText, setField, applyPreset } = useSampleText();
  const [pendingShared, setPendingShared] = useState<
    { edits: Edit[]; shared: Impact[] } | undefined
  >();
  const undoRef = useRef<{ edits: Edit[]; inverse: Edit[] }[]>([]);
  const redoRef = useRef<{ edits: Edit[]; inverse: Edit[] }[]>([]);
  /** Decorative art switched on by hand: crowns, nicknames, PT plates. */
  const [enabledExtras, setEnabledExtras] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [maskOverride, setMaskOverride] = useState<ReadonlySet<string>>(
    new Set(),
  );

  useEffect(() => {
    void getInfo().then(setInfo);
    void getFrames().then((list) => {
      setFrames(list);
      setSlug((current) => current ?? list[0]?.slug);
    });
  }, []);

  const refresh = useCallback((target: string) => {
    void getFrame(target)
      .then(setPayload)
      .catch((cause: unknown) => {
        setStatus(cause instanceof Error ? cause.message : String(cause));
      });
  }, []);

  useEffect(() => {
    if (slug) {
      refresh(slug);
    }
  }, [slug, refresh]);

  // Live reload: the server pushes when a source file changes.
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "frames") {
        void getFrames().then(setFrames);
        return;
      }
      if (event.slug !== undefined && event.slug === slug) {
        refresh(event.slug);
        setStatus(event.cause === "self" ? "saved" : "reloaded");
      }
    });
  }, [slug, refresh]);

  const variants = useMemo(
    () => (payload ? layoutsOf(payload) : []),
    [payload],
  );
  const layouts = useMemo(
    () => variants.find((entry) => entry.variant === variant)?.layouts ?? [],
    [variants, variant],
  );
  const slotsHere = useMemo(
    () =>
      payload?.slots.filter(
        (slot) => slot.variant === variant && slot.layout === layout,
      ) ?? [],
    [payload, variant, layout],
  );
  const boxSlot = slotsHere.find(
    (slot) => slot.kind === "boxes" && slot.key === slotKey,
  );
  const assetSlot = slotsHere.find((slot) => slot.kind === "assets");
  const maskSlot = slotsHere.find((slot) => slot.kind === "masks");
  const knobSlots = useMemo(
    () => slotsHere.filter((slot) => slot.kind === "knobs"),
    [slotsHere],
  );
  const boxes = useMemo(
    () => (payload && boxSlot ? boxesIn(payload, boxSlot) : []),
    [payload, boxSlot],
  );
  const selectedBox = boxes.find((entry) => entry.key === selected)?.box;

  const layers = useMemo(
    () => (payload ? assetLayers(payload, assetSlot) : []),
    [payload, assetSlot],
  );
  const masks = useMemo(
    () => (payload ? maskLayers(payload, maskSlot) : []),
    [payload, maskSlot],
  );

  // The frame body is derived from the card shape; only the decorations are
  // picked by hand, so the layer list offers just those.
  const decorations = useMemo(
    () =>
      layers.filter(
        (layer) =>
          !["base", "land", "nyx", "tall", "creature"].includes(layer.family),
      ),
    [layers],
  );

  const composed = useMemo(
    () =>
      payload
        ? composite({
            payload,
            assetSlot,
            maskSlot,
            boxSlot,
            shape,
            useNyxBorder,
            extras: enabledExtras,
            inspectMasks: maskOverride,
          })
        : { layers: [], cutoutUrls: [] },
    [
      payload,
      assetSlot,
      maskSlot,
      boxSlot,
      shape,
      useNyxBorder,
      enabledExtras,
      maskOverride,
    ],
  );

  // A different frame or layout ships different art; start its decorations off.
  useEffect(() => {
    setEnabledExtras(new Set());
    setMaskOverride(new Set());
  }, [slug, variant, layout]);

  // Keep the layout/slot selection valid as the frame changes underneath.
  useEffect(() => {
    const first = layouts[0];
    if (first !== undefined && !layouts.includes(layout)) {
      setLayout(first);
    }
  }, [layouts, layout]);
  useEffect(() => {
    const boxSlots = slotsHere.filter((slot) => slot.kind === "boxes");
    const first = boxSlots[0];
    if (first !== undefined && !boxSlots.some((slot) => slot.key === slotKey)) {
      setSlotKey(first.key);
    }
  }, [slotsHere, slotKey]);

  /** Sends a batch, recording how to undo it. `shared` is confirmed first. */
  const send = useCallback(
    async (
      edits: Edit[],
      inverse: Edit[],
      options: { confirmShared?: boolean; track?: boolean } = {},
    ) => {
      if (!slug) {
        return;
      }
      setStatus("saving…");
      const result = await postEdits(slug, edits, {
        ...(options.confirmShared === true ? { confirmShared: true } : {}),
      });

      if (result.shared) {
        setPendingShared({ edits, shared: result.shared });
        setStatus("shared — confirm");
        return;
      }
      if (!result.ok) {
        const first = result.rejected?.[0];
        setStatus(first ? `${first.reason}: ${first.detail}` : "refused");
        refresh(slug);
        return;
      }
      if (options.track !== false) {
        undoRef.current = [...undoRef.current.slice(-49), { edits, inverse }];
        redoRef.current = [];
      }
      setStatus("saved");
    },
    [slug, refresh],
  );

  const commit = useCallback(
    (
      key: string,
      next: Readonly<Record<string, number | string | boolean>>,
    ) => {
      if (!slug || !boxSlot || !payload) {
        return;
      }
      const current = boxesIn(payload, boxSlot).find(
        (entry) => entry.key === key,
      )?.box as Record<string, number | string | boolean> | undefined;

      const edits: Edit[] = [];
      const inverse: Edit[] = [];
      for (const [field, value] of Object.entries(next)) {
        const before = current?.[field];
        if (before === value) {
          continue; // a drag that ended where it started
        }
        edits.push({ path: [...boxSlot.path, key, field], value });
        if (before !== undefined) {
          inverse.push({ path: [...boxSlot.path, key, field], value: before });
        }
      }
      if (edits.length > 0) {
        void send(edits, inverse);
      }
    },
    [slug, boxSlot, payload, send],
  );

  // Ctrl+Z / Ctrl+Shift+Z. An undo goes through the same checks as any edit —
  // it is just another batch — so it cannot slip past the shared-value guard.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") {
        return;
      }
      const redoing = key === "y" || event.shiftKey;
      const stack = redoing ? redoRef.current : undoRef.current;
      const entry = stack.pop();
      if (!entry) {
        setStatus(redoing ? "nothing to redo" : "nothing to undo");
        return;
      }
      event.preventDefault();
      if (redoing) {
        undoRef.current = [...undoRef.current, entry];
        void send(entry.edits, entry.inverse, {
          confirmShared: true,
          track: false,
        });
      } else {
        redoRef.current = [...redoRef.current, entry];
        void send(entry.inverse, entry.edits, {
          confirmShared: true,
          track: false,
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [send]);

  const editable = info?.writeEnabled === true;

  return (
    <Grid
      templateRows="auto 1fr"
      h="100vh"
      bg="#1e1e1e"
      color="#ccc"
      fontSize="13px"
    >
      <HStack
        gap="3"
        px="3"
        py="2"
        bg="#252526"
        borderBottom="1px solid #3c3c3c"
        flexWrap="wrap"
      >
        <Text fontWeight="700">Frame Studio</Text>
        <NativeSelect.Root size="xs" width="200px">
          <NativeSelect.Field
            value={slug ?? ""}
            onChange={(event) => {
              setSlug(event.currentTarget.value);
              setSelected(undefined);
            }}
          >
            {frames.map((frame) => (
              <option key={frame.slug} value={frame.slug}>
                {frame.name} ({frame.slug})
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>

        <NativeSelect.Root size="xs" width="150px">
          <NativeSelect.Field
            value={variant ?? ""}
            onChange={(event) => {
              setVariant(
                event.currentTarget.value === ""
                  ? null
                  : event.currentTarget.value,
              );
            }}
          >
            {variants.map((entry) => (
              <option key={entry.variant ?? ""} value={entry.variant ?? ""}>
                {entry.variant ?? "— base layouts"}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>

        <NativeSelect.Root size="xs" width="170px">
          <NativeSelect.Field
            value={layout}
            onChange={(event) => {
              setLayout(event.currentTarget.value);
            }}
          >
            {layouts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>

        <NativeSelect.Root size="xs" width="180px">
          <NativeSelect.Field
            value={slotKey}
            onChange={(event) => {
              setSlotKey(event.currentTarget.value);
            }}
          >
            {slotsHere
              .filter((slot) => slot.kind === "boxes")
              .map((slot) => (
                <option key={slot.key} value={slot.key}>
                  {slot.key}
                </option>
              ))}
          </NativeSelect.Field>
        </NativeSelect.Root>

        <Button
          size="xs"
          variant={showCardFace ? "solid" : "outline"}
          onClick={() => {
            setShowCardFace((on) => !on);
          }}
        >
          card face
        </Button>

        <NativeSelect.Root size="xs" width="110px">
          <NativeSelect.Field
            defaultValue="typical"
            onChange={(event) => {
              applyPreset(event.currentTarget.value);
            }}
          >
            {Object.keys(PRESETS).map((name) => (
              <option key={name} value={name}>
                {name} text
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>

        {!editable && <Badge colorPalette="yellow">read-only</Badge>}
        {composed.fallbackNote !== undefined && (
          <Badge colorPalette="yellow" title={composed.fallbackNote}>
            art fallback
          </Badge>
        )}
        {payload?.stale === true && (
          <Badge colorPalette="red">source has an error</Badge>
        )}
        <Text ml="auto" color="#9d9d9d" maxW="40%" truncate title={status}>
          {status}
        </Text>
      </HStack>

      <Grid templateColumns="260px 1fr 300px" minH="0">
        <VStack
          align="stretch"
          gap="0"
          bg="#252526"
          borderRight="1px solid #3c3c3c"
          overflowY="auto"
          p="2"
        >
          <Text
            fontSize="10px"
            textTransform="uppercase"
            color="#9d9d9d"
            mb="1"
          >
            Boxes
          </Text>
          {boxes.map(({ key, box }, index) => (
            <HStack
              key={key}
              gap="2"
              px="2"
              py="1"
              cursor="pointer"
              borderRadius="4px"
              opacity={hidden.has(key) ? 0.4 : 1}
              bg={selected === key ? "#37373d" : "transparent"}
              _hover={{ bg: "#2f2f2f" }}
              onClick={() => {
                setSelected(key);
              }}
            >
              <Box
                w="12px"
                h="12px"
                borderRadius="3px"
                bg={boxColor(index)}
                onClick={(event) => {
                  event.stopPropagation();
                  setHidden((current) => {
                    const next = new Set(current);
                    if (!next.delete(key)) {
                      next.add(key);
                    }
                    return next;
                  });
                }}
              />
              <VStack align="stretch" gap="0" flex="1" minW="0">
                <Text fontWeight="600" truncate>
                  {key}
                </Text>
                <Text fontSize="10px" color="#9d9d9d" truncate>
                  {box.x},{box.y} · {box.width}×{box.height}
                  {box.fontSize === undefined
                    ? ""
                    : ` · ${String(box.fontSize)}pt`}
                </Text>
                {overflow[key] !== undefined && (
                  <Text fontSize="10px" color="#f14c4c">
                    overflows by {overflow[key]}px
                  </Text>
                )}
              </VStack>
            </HStack>
          ))}
          {boxes.length === 0 && (
            <Text fontSize="xs" color="#9d9d9d">
              No boxes in this set.
            </Text>
          )}

          <LayerPanel
            layers={decorations}
            masks={masks}
            enabled={enabledExtras}
            enabledMasks={maskOverride}
            onToggle={(id) => {
              setEnabledExtras((current) => {
                const next = new Set(current);
                if (!next.delete(id)) {
                  next.add(id);
                }
                return next;
              });
            }}
            onToggleMask={(id) => {
              setMaskOverride((current) => {
                const next = new Set(current);
                if (!next.delete(id)) {
                  next.add(id);
                }
                return next;
              });
            }}
          />
        </VStack>

        {payload ? (
          <CanvasPanel
            payload={payload}
            boxSlot={boxSlot}
            art={composed.layers}
            cutoutUrls={composed.cutoutUrls}
            selected={selected}
            hidden={hidden}
            showCardFace={showCardFace}
            editable={editable}
            onSelect={setSelected}
            onCommit={(key, bounds) => {
              commit(key, { ...bounds });
            }}
            onHover={() => undefined}
            sampleText={sampleText}
            onOverflow={setOverflow}
          />
        ) : (
          <Box display="grid" placeItems="center" color="#9d9d9d">
            loading…
          </Box>
        )}

        {pendingShared && (
          <SharedEditDialog
            shared={pendingShared.shared}
            onCancel={() => {
              setPendingShared(undefined);
              setStatus("cancelled");
              if (slug) {
                refresh(slug);
              }
            }}
            onConfirm={() => {
              const { edits } = pendingShared;
              setPendingShared(undefined);
              void send(edits, [], { confirmShared: true });
            }}
          />
        )}

        <Box bg="#252526" borderLeft="1px solid #3c3c3c" overflowY="auto">
          <CardShapePanel
            shape={shape}
            useNyxBorder={useNyxBorder}
            summary={describeSelection(shape, useNyxBorder)}
            onChange={setShape}
            onNyxBorderChange={setUseNyxBorder}
          />
          <VStack
            align="stretch"
            gap="1"
            p="3"
            borderBottom="1px solid #3c3c3c"
          >
            <Text fontSize="10px" textTransform="uppercase" color="#9d9d9d">
              Sample text
            </Text>
            {boxes
              .filter(({ key }) => isPreviewable(key))
              .map(({ key }) => (
                <HStack key={key} gap="2">
                  <Text fontSize="xs" color="#9d9d9d" w="80px" truncate>
                    {key}
                  </Text>
                  <Input
                    size="xs"
                    value={sampleText[key] ?? ""}
                    onChange={(event) => {
                      setField(key, event.target.value);
                    }}
                  />
                </HStack>
              ))}
            <Text fontSize="10px" color="#9d9d9d" mt="1">
              One line, at the size you authored — no wrapping, no mana symbols
              and no auto-shrink. Card Anvil shrinks the title around the mana
              cost and the type line around the set symbol, so a box flagged
              here may still fit there.
            </Text>
          </VStack>
          {slug && payload && knobSlots.length > 0 && (
            <KnobPanel
              slug={slug}
              payload={payload}
              slots={knobSlots}
              editable={editable}
              onChange={(path, value) => {
                const before = atPath(payload.frame, path);
                void send(
                  [{ path: [...path], value }],
                  typeof before === "number" || typeof before === "boolean"
                    ? [{ path: [...path], value: before }]
                    : [],
                );
              }}
            />
          )}

          {slug && boxSlot && (
            <Inspector
              slug={slug}
              boxKey={selected}
              box={selectedBox}
              basePath={boxSlot.path}
              editable={editable}
              onChange={(field, value) => {
                if (selected) {
                  commit(selected, { [field]: value });
                }
              }}
            />
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
