import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  Input,
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
  Bounds,
  Edit,
  FramePayload,
  FrameSummary,
  Impact,
  StudioInfo,
} from "./api/types.js";
import { BoxListbox } from "./components/BoxListbox.js";
import { CanvasPanel } from "./components/CanvasPanel.js";
import { CardShapePanel } from "./components/CardShapePanel.js";
import { Inspector } from "./components/Inspector.js";
import { KnobPanel } from "./components/KnobPanel.js";
import { MaskPanel } from "./components/MaskPanel.js";
import { SharedEditDialog } from "./components/SharedEditDialog.js";
import { ToolbarSelect } from "./components/ToolbarSelect.js";
import { ColorModeButton } from "./components/ui/color-mode.js";
import { DEFAULT_SHAPE, describeSelection } from "./lib/cardShape.js";
import { composite } from "./lib/composite.js";
import { atPath, boxesIn, layoutsOf } from "./lib/frameModel.js";
import { maskLayers } from "./lib/layers.js";
import { type PendingEdits, pathKey, withPending } from "./lib/optimistic.js";
import { PRESETS, useSampleText } from "./state/useSampleText.js";
import { isPreviewable } from "./text/singleLine.js";

const noop = () => undefined;

/** Stands in for `null` — the base `config.layouts` — in the variant picker. */
const BASE_VARIANT = "__base__";

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
  /** Committed but not yet confirmed by a reload. See `withPending`. */
  const [pending, setPending] = useState<PendingEdits>(new Map());
  const awaitingRef = useRef<number | undefined>(undefined);
  const [preset, setPreset] = useState("typical");
  const [useNyxInsert, setUseNyxInsert] = useState(false);
  const [useUBCrowns, setUseUBCrowns] = useState(false);
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

  const view = useMemo(
    () => (payload ? withPending(payload, pending) : undefined),
    [payload, pending],
  );

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
    () => (view && boxSlot ? boxesIn(view, boxSlot) : []),
    [view, boxSlot],
  );
  const selectedBox = boxes.find((entry) => entry.key === selected)?.box;

  const masks = useMemo(
    () => (view ? maskLayers(view, maskSlot) : []),
    [view, maskSlot],
  );

  const composed = useMemo(
    () =>
      view
        ? composite({
            payload: view,
            assetSlot,
            maskSlot,
            boxSlot,
            shape,
            useNyxBorder,
            card: {
              nickname: sampleText.nicknameTitle ?? "",
              power: sampleText.power ?? "",
              toughness: sampleText.toughness ?? "",
            },
            useNyxInsert,
            useUBCrowns,
            inspectMasks: maskOverride,
          })
        : { layers: [], cutoutUrls: [] },
    [
      view,
      assetSlot,
      maskSlot,
      boxSlot,
      shape,
      sampleText,
      useNyxBorder,
      useNyxInsert,
      useUBCrowns,
      maskOverride,
    ],
  );

  // A different frame or layout ships different masks.
  useEffect(() => {
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
        // Nothing was written, so the overlay would be a lie.
        setPending(new Map());
        awaitingRef.current = undefined;
        const first = result.rejected?.[0];
        setStatus(first ? `${first.reason}: ${first.detail}` : "refused");
        refresh(slug);
        return;
      }
      awaitingRef.current = result.revision;
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
      const current = boxesIn(view ?? payload, boxSlot).find(
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
        setPending((current) => {
          const next = new Map(current);
          for (const edit of edits) {
            next.set(pathKey(edit.path), edit.value);
          }
          return next;
        });
        void send(edits, inverse);
      }
    },
    [slug, boxSlot, payload, view, send],
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

  /**
   * Stable identities: the canvas rebuilds every box node when these change,
   * so an inline arrow here would tear the scene down on every render — and
   * redraw it from whatever the payload said at that moment.
   */
  const handleCommit = useCallback(
    (key: string, bounds: Bounds) => {
      commit(key, { ...bounds });
    },
    [commit],
  );

  const editable = info?.writeEnabled === true;

  return (
    <Grid templateRows="auto 1fr" h="100vh">
      <HStack gap="3" px="3" py="2" borderBottomWidth="1px" flexWrap="wrap">
        <Text fontWeight="heavy">Frame Studio</Text>
        <ToolbarSelect
          label="Frame"
          width="200px"
          value={slug ?? ""}
          options={frames.map((frame) => ({
            value: frame.slug,
            label: `${frame.name} (${frame.slug})`,
          }))}
          onChange={(next) => {
            setSlug(next);
            setSelected(undefined);
          }}
        />

        <ToolbarSelect
          label="Variant"
          width="160px"
          value={variant ?? BASE_VARIANT}
          options={variants.map((entry) => ({
            value: entry.variant ?? BASE_VARIANT,
            label: entry.variant ?? "— base layouts",
          }))}
          onChange={(next) => {
            setVariant(next === BASE_VARIANT ? null : next);
          }}
        />

        <ToolbarSelect
          label="Layout"
          width="180px"
          value={layout}
          options={layouts.map((name) => ({ value: name, label: name }))}
          onChange={setLayout}
        />

        <ToolbarSelect
          label="Box set"
          width="190px"
          value={slotKey}
          options={slotsHere
            .filter((slot) => slot.kind === "boxes")
            .map((slot) => ({ value: slot.key, label: slot.key }))}
          onChange={setSlotKey}
        />

        <Button
          size="xs"
          variant={showCardFace ? "solid" : "outline"}
          onClick={() => {
            setShowCardFace((on) => !on);
          }}
        >
          card face
        </Button>

        <ToolbarSelect
          label="Sample text"
          width="130px"
          value={preset}
          options={Object.keys(PRESETS).map((name) => ({
            value: name,
            label: `${name} text`,
          }))}
          onChange={(next) => {
            setPreset(next);
            applyPreset(next);
          }}
        />

        <ColorModeButton size="xs" />

        {!editable && <Badge colorPalette="yellow">read-only</Badge>}
        {composed.fallbackNote !== undefined && (
          <Badge colorPalette="yellow" title={composed.fallbackNote}>
            art fallback
          </Badge>
        )}
        {payload?.stale === true && (
          <Badge colorPalette="red">source has an error</Badge>
        )}
        <Text ml="auto" color="fg.muted" maxW="40%" truncate title={status}>
          {status}
        </Text>
      </HStack>

      <Grid templateColumns="260px 1fr 300px" minH="0">
        <VStack
          align="stretch"
          gap="0"
          bg="bg.panel"
          borderRightWidth="1px"
          overflowY="auto"
          p="2"
        >
          <BoxListbox
            boxes={boxes}
            selected={selected}
            hidden={hidden}
            overflow={overflow}
            onSelect={setSelected}
            onToggleHidden={(key) => {
              setHidden((current) => {
                const next = new Set(current);
                if (!next.delete(key)) {
                  next.add(key);
                }
                return next;
              });
            }}
          />

          <MaskPanel
            masks={masks}
            enabled={maskOverride}
            onToggle={(id) => {
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

        {view ? (
          <CanvasPanel
            payload={view}
            boxSlot={boxSlot}
            art={composed.layers}
            cutoutUrls={composed.cutoutUrls}
            selected={selected}
            hidden={hidden}
            showCardFace={showCardFace}
            editable={editable}
            onSelect={setSelected}
            onCommit={handleCommit}
            onHover={noop}
            sampleText={sampleText}
            ptIsVehicle={shape.isVehicle === true}
            onOverflow={setOverflow}
          />
        ) : (
          <Box display="grid" placeItems="center" color="fg.muted">
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

        <Box bg="bg.panel" borderLeftWidth="1px" overflowY="auto">
          <CardShapePanel
            shape={shape}
            useNyxBorder={useNyxBorder}
            summary={describeSelection(shape, useNyxBorder)}
            useNyxInsert={useNyxInsert}
            useUBCrowns={useUBCrowns}
            onChange={setShape}
            onNyxBorderChange={setUseNyxBorder}
            onNyxInsertChange={setUseNyxInsert}
            onUBCrownsChange={setUseUBCrowns}
          />
          <VStack align="stretch" gap="1" p="3" borderBottomWidth="1px">
            <Text fontSize="sm" textTransform="uppercase" color="fg.muted">
              Sample text
            </Text>
            {["power", "toughness"].map((key) => (
              <HStack key={key} gap="2">
                <Text fontSize="xs" color="fg.muted" w="80px" truncate>
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
            {boxes
              .filter(({ key }) => isPreviewable(key) && key !== "pt")
              .map(({ key }) => (
                <HStack key={key} gap="2">
                  <Text fontSize="xs" color="fg.muted" w="80px" truncate>
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
            <Text fontSize="sm" color="fg.muted" mt="1">
              One line, at the size you authored — no wrapping, no mana symbols
              and no auto-shrink. Card Anvil shrinks the title around the mana
              cost and the type line around the set symbol, so a box flagged
              here may still fit there.
            </Text>
          </VStack>
          {slug && view && knobSlots.length > 0 && (
            <KnobPanel
              slug={slug}
              payload={view}
              slots={knobSlots}
              editable={editable}
              onChange={(path, value) => {
                const before = atPath(view.frame, path);
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
