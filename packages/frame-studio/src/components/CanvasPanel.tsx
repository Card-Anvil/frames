import { Box } from "@chakra-ui/react";
import Konva from "konva";
import { useCallback, useEffect, useRef } from "react";

import { placementOrigin } from "@cardanvil/frame-kit/layout";

import type { Bounds, FramePayload, FrameSlot, TextBox } from "../api/types.js";
import type { ArtLayer, CompositeResult } from "../lib/composite.js";
import { atPath, boxesIn } from "../lib/frameModel.js";
import { boxColor } from "../lib/hues.js";
import { CARD_INSET, type Guide, snapBounds } from "../lib/snapping.js";
import { buildCollectorPreview } from "../text/collector.js";
import { loadFonts } from "../text/fonts.js";
import { buildPreviewText, isPreviewable } from "../text/singleLine.js";

export interface CanvasPanelProps {
  payload: FramePayload;
  boxSlot: FrameSlot | undefined;
  /** Art to composite, bottom first, each with its own placement and masks. */
  art: readonly ArtLayer[];
  /** Cut out of the frame body, before anything is drawn over it. */
  frameCutoutUrls: readonly string[];
  /** The border ring to paint, over what the cutouts leave of the body. */
  ring: CompositeResult["ring"];
  /** Masks applied as cutouts over the finished stack. */
  cutoutUrls: readonly string[];
  /** The box set as the current settings resolve it, for the text previews. */
  previewBoxes: readonly { key: string; box: TextBox }[];
  selected: string | undefined;
  hidden: ReadonlySet<string>;
  showCardFace: boolean;
  /** Sample strings drawn in the single-line boxes, keyed by box name. */
  sampleText: Readonly<Record<string, string>>;
  /** The PT plate is the vehicle one, whose dark art needs white text. */
  ptIsVehicle: boolean;
  editable: boolean;
  onSelect: (key: string | undefined) => void;
  onCommit: (key: string, bounds: Bounds) => void;
  onHover: (key: string | undefined) => void;
  /** Boxes whose sample line does not fit, and by how many pixels. */
  onOverflow: (overflow: Readonly<Record<string, number>>) => void;
}

/**
 * Colours for the Konva overlay.
 *
 * Konva paints to a canvas, so it cannot read the CSS custom properties
 * Chakra's tokens compile to — these have to be literal. They are the accent
 * and surface the theme uses, kept here so the canvas still matches it.
 */
const SELECTION_COLOR = "#4ec9b0";
const ANCHOR_FILL = "#1e1e1e";

/** Konva types a gesture's underlying event loosely; read the modifier safely. */
const isAltDown = (evt: unknown): boolean =>
  typeof evt === "object" &&
  evt !== null &&
  "altKey" in evt &&
  evt.altKey === true;

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      imageCache.set(url, image);
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`could not load ${url}`));
    };
    image.src = url;
  });
}

/**
 * The interactive stage: frame art underneath, one draggable rect per box.
 *
 * Konva is driven imperatively from a ref rather than through react-konva —
 * it mirrors how Card Anvil's own renderer uses it, and keeps the node count
 * under direct control.
 */
export function CanvasPanel(props: CanvasPanelProps): React.JSX.Element {
  const {
    payload,
    boxSlot,
    art,
    frameCutoutUrls,
    ring,
    cutoutUrls,
    previewBoxes,
    selected,
    hidden,
    showCardFace,
    sampleText,
    ptIsVehicle,
    editable,
    onSelect,
    onCommit,
    onHover,
    onOverflow,
  } = props;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const artRef = useRef<Konva.Layer | null>(null);
  const textRef = useRef<Konva.Layer | null>(null);
  const overlayRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  const { width, height } = payload.canvas;

  /** Stage scale at which the whole sheet fits; the zoom baseline. */
  const fitScaleRef = useRef(1);

  /**
   * Sizes the stage to the panel and scales it so the whole sheet fits,
   * centred. The stage box is the viewport: it tracks the panel, never the
   * content, so zooming out can never crop what is drawn.
   */
  const fit = useCallback(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage) {
      return;
    }
    const view = { width: host.clientWidth, height: host.clientHeight };
    const scale = Math.min(
      (view.width - 32) / width,
      (view.height - 32) / height,
    );
    if (scale > 0 && Number.isFinite(scale)) {
      fitScaleRef.current = scale;
      stage.size(view);
      stage.scale({ x: scale, y: scale });
      stage.position({
        x: (view.width - width * scale) / 2,
        y: (view.height - height * scale) / 2,
      });
      stage.batchDraw();
    }
  }, [width, height]);

  /** Zooms about a point in screen space, keeping what is under it fixed. */
  const zoomAbout = useCallback(
    (factor: number, pointer: { x: number; y: number } | null) => {
      const stage = stageRef.current;
      if (!stage) {
        return;
      }
      const from = stage.scaleX();
      const to = Math.min(
        8,
        Math.max(fitScaleRef.current * 0.5, from * factor),
      );
      if (to === from) {
        return;
      }
      const focus = pointer ?? {
        x: stage.width() / 2,
        y: stage.height() / 2,
      };
      const world = {
        x: (focus.x - stage.x()) / from,
        y: (focus.y - stage.y()) / from,
      };
      stage.scale({ x: to, y: to });
      // Only the scale and the pan offset change: the stage box stays the
      // size of the panel, so the sheet is never clipped by its own canvas.
      stage.position({ x: focus.x - world.x * to, y: focus.y - world.y * to });
      stage.batchDraw();
    },
    [],
  );

  // Stage lifetime: created once per canvas size.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const stage = new Konva.Stage({
      container: host,
      width: host.clientWidth,
      height: host.clientHeight,
    });
    const art = new Konva.Layer({ listening: false });
    const text = new Konva.Layer({ listening: false });
    const overlay = new Konva.Layer();
    const transformer = new Konva.Transformer({
      // The contract has no rotation — offering a handle for it would lie.
      rotateEnabled: false,
      keepRatio: false,
      ignoreStroke: true,
      borderStroke: SELECTION_COLOR,
      anchorStroke: SELECTION_COLOR,
      anchorFill: ANCHOR_FILL,
      anchorSize: 12,
      boundBoxFunc: (_old, next) => ({
        ...next,
        width: Math.max(8, next.width),
        height: Math.max(8, next.height),
      }),
    });
    overlay.add(transformer);
    stage.add(art, text, overlay);

    stage.on("click tap", (event) => {
      if (event.target === stage) {
        onSelect(undefined);
      }
    });

    stage.on("wheel", (event) => {
      event.evt.preventDefault();
      zoomAbout(
        event.evt.deltaY < 0 ? 1.1 : 1 / 1.1,
        stage.getPointerPosition(),
      );
    });

    // Middle-drag, or a drag starting on empty canvas, pans.
    let panning: { x: number; y: number } | undefined;
    stage.on("mousedown", (event) => {
      const middle = event.evt.button === 1;
      if (middle || event.target === stage) {
        panning = {
          x: event.evt.clientX - stage.x(),
          y: event.evt.clientY - stage.y(),
        };
        if (middle) {
          event.evt.preventDefault();
        }
      }
    });
    stage.on("mousemove", (event) => {
      if (!panning) {
        return;
      }
      stage.position({
        x: event.evt.clientX - panning.x,
        y: event.evt.clientY - panning.y,
      });
      stage.batchDraw();
    });
    const endPan = () => {
      panning = undefined;
    };
    stage.on("mouseup mouseleave", endPan);

    stageRef.current = stage;
    artRef.current = art;
    textRef.current = text;
    overlayRef.current = overlay;
    transformerRef.current = transformer;
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => {
      observer.disconnect();
      stage.destroy();
      stageRef.current = null;
    };
  }, [width, height, fit, onSelect, zoomAbout]);

  // `0` fits the sheet, `1` goes to 100%, `+`/`-` step.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== document.body || event.ctrlKey || event.metaKey) {
        return;
      }
      const stage = stageRef.current;
      if (!stage) {
        return;
      }
      if (event.key === "0") {
        fit();
      } else if (event.key === "1") {
        zoomAbout(1 / stage.scaleX(), null);
      } else if (event.key === "+" || event.key === "=") {
        zoomAbout(1.2, null);
      } else if (event.key === "-") {
        zoomAbout(1 / 1.2, null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fit, zoomAbout]);

  // Frame art, composited the way the renderer does it: each overlay is
  // clipped to its section by a mask inside its own cached group; the frame
  // body is cut and its ring recolored before the decorations go over it; and
  // then the whole stack is cut down by any masks switched on for inspection.
  useEffect(() => {
    const layer = artRef.current;
    if (!layer) {
      return;
    }
    let cancelled = false;
    const canvas = { width, height };

    const loadAll = async () => {
      const images = await Promise.all(
        art.map(async (item) => ({
          item,
          image: await loadImage(item.url),
          mask:
            item.maskUrl === undefined
              ? undefined
              : await loadImage(item.maskUrl),
          secondary:
            item.secondaryMaskUrl === undefined
              ? undefined
              : await loadImage(item.secondaryMaskUrl),
        })),
      );
      const frameCutouts = await Promise.all(frameCutoutUrls.map(loadImage));
      const ringMask =
        ring === undefined ? undefined : await loadImage(ring.maskUrl);
      const cutouts = await Promise.all(cutoutUrls.map(loadImage));
      return { images, frameCutouts, ringMask, cutouts };
    };

    /** A sheet-sized mask, centred the way the renderer centres them. */
    const sheetMask = (
      image: HTMLImageElement,
      globalCompositeOperation: GlobalCompositeOperation,
    ) =>
      new Konva.Image({
        image,
        x: (width - image.naturalWidth) / 2,
        y: (height - image.naturalHeight) / 2,
        globalCompositeOperation,
        listening: false,
      });

    void loadAll()
      .then(({ images, frameCutouts, ringMask, cutouts }) => {
        if (cancelled) {
          return;
        }
        layer.destroyChildren();
        const stack = new Konva.Group({ listening: false });
        const body = new Konva.Group({ listening: false });
        stack.add(body);

        for (const { item, image, mask, secondary } of images) {
          const size = {
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
          const origin = placementOrigin(item.placement, size, canvas);
          if (!origin) {
            continue; // laid out dynamically by the renderer; nothing to draw
          }
          const target = item.part === "frame" ? body : stack;
          const node = new Konva.Image({
            image,
            x: origin.x,
            y: origin.y,
            listening: false,
          });

          if (item.recolor !== undefined) {
            // Keep the art's own alpha and replace its colour. Cached so
            // `source-in` composites against this art alone.
            const painted = new Konva.Group({ listening: false });
            painted.add(
              node,
              new Konva.Rect({
                ...origin,
                ...size,
                fill: item.recolor,
                globalCompositeOperation: "source-in",
                listening: false,
              }),
            );
            painted.cache();
            target.add(painted);
            continue;
          }

          if (!mask) {
            target.add(node);
            continue;
          }

          // Caching scopes the composite to this overlay, so the mask clips it
          // alone rather than everything drawn beneath it.
          const clipped = new Konva.Group({ listening: false });
          clipped.add(node);
          for (const maskImage of [mask, secondary]) {
            if (maskImage) {
              clipped.add(sheetMask(maskImage, "destination-in"));
            }
          }
          clipped.cache();
          if (item.preserveAlpha === true) {
            // Recolour what is already there instead of painting over it.
            clipped.globalCompositeOperation("source-atop");
          }
          target.add(clipped);
        }

        for (const cutout of frameCutouts) {
          body.add(sheetMask(cutout, "destination-in"));
        }
        if (ring !== undefined && ringMask !== undefined) {
          // The ring's shape in the border color, painted `source-atop` so it
          // lands only where the cut body still has art: a ring "No Border"
          // took away stays away, as it does in the renderer.
          const paint = new Konva.Group({ listening: false });
          paint.add(
            new Konva.Rect({
              ...canvas,
              fill: ring.color,
              listening: false,
            }),
            sheetMask(ringMask, "destination-in"),
          );
          paint.cache();
          paint.globalCompositeOperation("source-atop");
          body.add(paint);
        }
        if (frameCutouts.length > 0 || ringMask !== undefined) {
          body.cache();
        }

        for (const cutout of cutouts) {
          stack.add(sheetMask(cutout, "destination-in"));
        }
        if (cutouts.length > 0) {
          stack.cache();
        }

        layer.add(stack);
        layer.batchDraw();
      })
      .catch(() => {
        /* a missing asset is reported by the frame's own problems */
      });

    return () => {
      cancelled = true;
    };
  }, [art, frameCutoutUrls, ring, cutoutUrls, width, height]);

  // The renderer's Retro collector preset centres its lines; the default runs
  // them from the box's left edge.
  const collectorAlign =
    atPath(payload.frame, [
      ...(boxSlot?.path.slice(0, -1) ?? []),
      "collectorInfoPreset",
    ]) === "retro"
      ? "center"
      : "left";

  // Single-line text preview, at the authored size, in the style the current
  // settings resolve each box to.
  useEffect(() => {
    const layer = textRef.current;
    if (!layer) {
      return;
    }
    let cancelled = false;

    void loadFonts().then(() => {
      if (cancelled) {
        return;
      }
      layer.destroyChildren();
      const overflows: Record<string, number> = {};

      for (const { key, box } of previewBoxes) {
        if (hidden.has(key)) {
          continue;
        }
        if (key === "collectorInfo") {
          const sample = sampleText.collectorInfo;
          if (sample) {
            layer.add(buildCollectorPreview(sample, box, collectorAlign));
          }
          continue;
        }
        const sample =
          key === "pt"
            ? [sampleText.power, sampleText.toughness].every(Boolean)
              ? `${sampleText.power ?? ""}/${sampleText.toughness ?? ""}`
              : ""
            : sampleText[key];
        if (!isPreviewable(key) || !sample) {
          continue;
        }
        // The vehicle plate is dark art; the renderer switches to white on it.
        const preview = buildPreviewText(
          key,
          sample,
          key === "pt" && ptIsVehicle ? { ...box, color: "white" } : box,
        );
        layer.add(preview.node);
        if (preview.overflow > 0) {
          overflows[key] = preview.overflow;
        }
      }

      layer.batchDraw();
      onOverflow(overflows);
    });

    return () => {
      cancelled = true;
    };
  }, [
    previewBoxes,
    sampleText,
    ptIsVehicle,
    hidden,
    onOverflow,
    collectorAlign,
  ]);

  // Boxes and the transformer.
  useEffect(() => {
    const overlay = overlayRef.current;
    const transformer = transformerRef.current;
    if (!overlay || !transformer) {
      return;
    }
    for (const child of [...overlay.getChildren()]) {
      if (child !== transformer) {
        child.destroy();
      }
    }

    if (showCardFace) {
      overlay.add(
        new Konva.Rect({
          x: CARD_INSET,
          y: CARD_INSET,
          width: width - CARD_INSET * 2,
          height: height - CARD_INSET * 2,
          stroke: "rgba(255,255,255,0.75)",
          strokeWidth: 4,
          dash: [26, 18],
          listening: false,
        }),
      );
    }

    const guideGroup = new Konva.Group({ listening: false });
    overlay.add(guideGroup);

    const drawGuides = (guides: readonly Guide[]) => {
      guideGroup.destroyChildren();
      for (const guide of guides) {
        guideGroup.add(
          new Konva.Line({
            points:
              guide.axis === "x"
                ? [guide.at, 0, guide.at, height]
                : [0, guide.at, width, guide.at],
            stroke: SELECTION_COLOR,
            strokeWidth: 2,
            dash: [12, 10],
            listening: false,
          }),
        );
      }
      guideGroup.moveToTop();
      overlay.batchDraw();
    };

    const boxes = boxSlot ? boxesIn(payload, boxSlot) : [];
    let selectedNode: Konva.Rect | undefined;

    boxes.forEach(({ key, box }, index) => {
      if (hidden.has(key)) {
        return;
      }
      const isSelected = key === selected;
      const rect = new Konva.Rect({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        stroke: boxColor(index),
        strokeWidth: isSelected ? 12 : 5,
        fill: boxColor(index, isSelected ? 0.2 : 0.08),
        draggable: editable,
        name: key,
      });

      /** Draws the alignment lines a snap engaged, and returns the snapped box. */
      const applySnap = (alt: boolean) => {
        const live = {
          x: Math.round(rect.x()),
          y: Math.round(rect.y()),
          width: Math.round(rect.width() * rect.scaleX()),
          height: Math.round(rect.height() * rect.scaleY()),
        };
        if (alt) {
          return live;
        }
        const siblings = boxes
          .filter((entry) => entry.key !== key && !hidden.has(entry.key))
          .map((entry) => entry.box);
        const snapped = snapBounds(live, { width, height }, siblings);
        drawGuides(snapped.guides);
        return snapped.bounds;
      };

      rect.on("mouseenter", () => {
        onHover(key);
      });
      rect.on("mouseleave", () => {
        onHover(undefined);
      });
      rect.on("mousedown touchstart", () => {
        onSelect(key);
      });

      // Alt suppresses snapping, for when the guides are in the way.
      rect.on("dragmove", (event) => {
        const snapped = applySnap(isAltDown(event.evt));
        rect.position({ x: snapped.x, y: snapped.y });
      });
      // Commit on gesture end only: a drag produces hundreds of intermediate
      // values, and each commit rewrites a source file.
      rect.on("dragend", (event) => {
        const snapped = applySnap(isAltDown(event.evt));
        drawGuides([]);
        rect.position({ x: snapped.x, y: snapped.y });
        onCommit(key, snapped);
      });
      // Transformer writes scaleX/scaleY, not width/height. Fold the scale
      // back in and reset it, or the next transform compounds.
      rect.on("transformend", () => {
        drawGuides([]);
        const next = {
          x: Math.round(rect.x()),
          y: Math.round(rect.y()),
          width: Math.round(rect.width() * rect.scaleX()),
          height: Math.round(rect.height() * rect.scaleY()),
        };
        rect.scale({ x: 1, y: 1 });
        rect.size({ width: next.width, height: next.height });
        onCommit(key, next);
      });

      overlay.add(rect);
      if (isSelected) {
        selectedNode = rect;
      }
    });

    transformer.nodes(selectedNode && editable ? [selectedNode] : []);
    transformer.moveToTop();
    overlay.batchDraw();
  }, [
    payload,
    boxSlot,
    selected,
    hidden,
    showCardFace,
    editable,
    width,
    height,
    onCommit,
    onHover,
    onSelect,
  ]);

  // Arrow keys nudge in canvas pixels, independent of zoom.
  useEffect(() => {
    if (!selected || !boxSlot || !editable) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const delta = deltas[event.key];
      if (!delta || event.target !== document.body) {
        return;
      }
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const found = boxesIn(payload, boxSlot).find(
        ({ key }) => key === selected,
      );
      if (!found) {
        return;
      }
      const box: TextBox = found.box;
      onCommit(selected, {
        x: box.x + delta[0] * step,
        y: box.y + delta[1] * step,
        width: box.width,
        height: box.height,
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected, boxSlot, payload, editable, onCommit]);

  return (
    <Box
      ref={hostRef}
      flex="1"
      minW="0"
      display="grid"
      placeItems="center"
      overflow="hidden"
      bg="bg.muted"
    />
  );
}
