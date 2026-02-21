/* ─────────────────────────────────────────────────────────────────────────────
   CanvasStage – Fabric.js canvas wrapper (Photoshop-style workspace)
   ─────────────────────────────────────────────────────────────────────────────
   Architecture:
     • The Fabric Canvas element fills the entire viewport container.
     • The artboard (white design area) is positioned / scaled via the
       Fabric viewportTransform so it sits centred on a dark pasteboard.
     • Ctrl+Scroll = zoom · Scroll = pan · Middle-click / Hand tool = pan
     • Template apply resizes the artboard & re-centres it.
   ───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useRef, useEffect, useCallback } from "react";
import { useDocumentStore } from "@/stores/designer/documentStore";
import { useToolStore } from "@/stores/designer/toolStore";
import { useUIStore } from "@/stores/designer/uiStore";
import { FABRIC_CUSTOM_PROPS } from "@/types/designer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

/* Pasteboard (non-artboard) background colour */
const PASTEBOARD_COLOR = "#2c2c2c";
const ARTBOARD_SHADOW_COLOR = "rgba(0,0,0,0.35)";

interface CanvasStageProps {
  width: number;
  height: number;
  initialJson?: object | null;
  onReady?: (canvas: FabricCanvas) => void;
}

export default function CanvasStage({
  width,
  height,
  initialJson,
  onReady,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas>(null);
  /** Artboard background colour (captured from template / initial JSON) */
  const artboardBgRef = useRef<string>("#ffffff");

  /* ── store selectors ─────────────────────────────────────────────────── */
  const setCanvas = useDocumentStore((s) => s.setCanvas);
  const pushSnapshot = useDocumentStore((s) => s.pushSnapshot);
  const markDirty = useDocumentStore((s) => s.markDirty);
  const storeProject = useDocumentStore((s) => s.project);
  const zoom = useUIStore((s) => s.zoom);
  const setZoom = useUIStore((s) => s.setZoom);
  const setSelectedObjectIds = useUIStore((s) => s.setSelectedObjectIds);
  const activeTool = useToolStore((s) => s.activeTool);

  /* Artboard size — reactive to template changes via the store */
  const artboardW = storeProject?.width ?? width;
  const artboardH = storeProject?.height ?? height;

  /* ── helper: centre the artboard in the viewport ─────────────────────── */
  const centreArtboard = useCallback(
    (canvas: FabricCanvas, z: number, cw: number, ch: number) => {
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      // Place artboard centred with padding on each side
      vpt[0] = z;
      vpt[3] = z;
      vpt[4] = (cw - artboardW * z) / 2;
      vpt[5] = (ch - artboardH * z) / 2;
      canvas.setViewportTransform(vpt);
    },
    [artboardW, artboardH],
  );

  /* ── draw pasteboard + artboard shadow on canvas "before:render" ────── */
  const drawPasteboard = useCallback(
    (canvas: FabricCanvas) => {
      const ctx: CanvasRenderingContext2D = canvas.getContext();
      if (!ctx) return;

      const cw = canvas.width ?? 0;
      const ch = canvas.height ?? 0;

      // Save & reset transform so we paint in screen-space
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Full pasteboard background
      ctx.fillStyle = PASTEBOARD_COLOR;
      ctx.fillRect(0, 0, cw, ch);

      // Draw artboard shadow + white card
      const vpt = canvas.viewportTransform;
      const z = vpt[0];
      const ox = vpt[4];
      const oy = vpt[5];
      const aw = artboardW * z;
      const ah = artboardH * z;

      // Shadow
      ctx.shadowColor = ARTBOARD_SHADOW_COLOR;
      ctx.shadowBlur = 24 * Math.min(z, 1);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4 * Math.min(z, 1);

      // Artboard rectangle (uses template / project background colour)
      ctx.fillStyle = artboardBgRef.current;
      ctx.fillRect(ox, oy, aw, ah);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.restore();
    },
    [artboardW, artboardH],
  );

  /* ── initialise Fabric canvas ────────────────────────────────────────── */
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    let cancelled = false;
    let localCanvas: FabricCanvas = null;

    (async () => {
      const fabric = await import("fabric");
      if (cancelled || !canvasElRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      /* Calculate initial zoom so the artboard fits with padding */
      const PAD = 80; // px padding on each side
      const fitZoom = Math.min(
        (cw - PAD * 2) / width,
        (ch - PAD * 2) / height,
        1, // never upscale beyond 100 %
      );

      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: cw,
        height: ch,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
        selection: true,
        stopContextMenu: true,
        fireRightClick: true,
      });

      localCanvas = canvas;
      fabricRef.current = canvas;

      /* Wrap loadFromJSON so that every call (template apply, undo/redo,
         serialization) captures the JSON's 'background' for our artboard
         fill and then resets canvas.backgroundColor to transparent so it
         doesn't paint over the pasteboard. */
      const _origLoad = canvas.loadFromJSON.bind(canvas);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.loadFromJSON = async (json: any, reviver?: any) => {
        const result = await _origLoad(json, reviver);
        // Capture the canvas background that loadFromJSON set
        const bg = canvas.backgroundColor;
        if (bg && bg !== "transparent") {
          artboardBgRef.current = typeof bg === "string" ? bg : "#ffffff";
        }
        // Clear it so Fabric doesn't paint the whole viewport with it
        canvas.backgroundColor = "transparent";
        return result;
      };

      setCanvas(canvas);

      // Set initial viewport: centred, fit-zoom
      const vpt = canvas.viewportTransform;
      vpt[0] = fitZoom;
      vpt[3] = fitZoom;
      vpt[4] = (cw - width * fitZoom) / 2;
      vpt[5] = (ch - height * fitZoom) / 2;
      canvas.setViewportTransform(vpt);
      setZoom(fitZoom);

      // Draw pasteboard + artboard shadow BEFORE Fabric paints objects
      canvas.on("before:render", () => drawPasteboard(canvas));

      /* ── Attach resize helper (used by template loading) ─────────── */
      (canvas as any).__resizeArtboard = (w: number, h: number) => {
        // Artboard size lives in the store project; the actual Fabric
        // canvas stays full-viewport.  We just re-centre after store
        // dimensions change (handled by the artboard sync effect).
        // Explicitly re-centre now so the template load sees the right
        // viewport immediately.
        const curZoom = canvas.viewportTransform[0];
        centreArtboard(
          canvas,
          curZoom,
          canvas.width ?? cw,
          canvas.height ?? ch,
        );
        canvas.requestRenderAll();
      };

      /* ── Load initial JSON ──────────────────────────────────────────── */
      if (initialJson && typeof initialJson === "object") {
        try {
          await canvas.loadFromJSON(initialJson);
          canvas.requestRenderAll();
        } catch (err) {
          console.warn("Failed to load initial JSON:", err);
        }
      }

      /* ── Selection events ───────────────────────────────────────────── */
      canvas.on("selection:created", (e: any) => {
        const ids = (e.selected || [])
          .map((o: any) => o.id)
          .filter(Boolean) as string[];
        setSelectedObjectIds(ids);
      });
      canvas.on("selection:updated", (e: any) => {
        const ids = (e.selected || [])
          .map((o: any) => o.id)
          .filter(Boolean) as string[];
        setSelectedObjectIds(ids);
      });
      canvas.on("selection:cleared", () => setSelectedObjectIds([]));

      /* ── Modification events ────────────────────────────────────────── */
      canvas.on("object:modified", () => {
        const json = (canvas as any).toJSON([...FABRIC_CUSTOM_PROPS]);
        pushSnapshot(json);
        markDirty();
      });
      canvas.on("object:added", () => markDirty());
      canvas.on("object:removed", () => markDirty());

      /* ── Ctrl+Scroll → zoom  ·  Scroll → pan ───────────────────────── */
      canvas.on("mouse:wheel", (opt: any) => {
        const e = opt.e as WheelEvent;
        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
          // Zoom toward cursor
          const delta = e.deltaY;
          let newZoom = canvas.viewportTransform[0] * (0.999 ** delta);
          newZoom = Math.min(5, Math.max(0.05, newZoom));
          canvas.zoomToPoint(
            new fabric.Point(e.offsetX, e.offsetY),
            newZoom,
          );
          setZoom(newZoom);
        } else {
          // Pan
          const vpt = canvas.viewportTransform!;
          vpt[4] -= e.deltaX;
          vpt[5] -= e.deltaY;
          canvas.setViewportTransform(vpt);
        }
      });

      /* ── Middle-click / Hand tool pan ────────────────────────────────── */
      let isPanning = false;
      let lastPanX = 0;
      let lastPanY = 0;

      canvas.on("mouse:down", (opt: any) => {
        const e = opt.e as MouseEvent;
        if (e.button === 1 || activeTool === "hand") {
          isPanning = true;
          lastPanX = e.clientX;
          lastPanY = e.clientY;
          canvas.selection = false;
          canvas.setCursor("grab");
        }
      });
      canvas.on("mouse:move", (opt: any) => {
        if (!isPanning) return;
        const e = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform!;
        vpt[4] += e.clientX - lastPanX;
        vpt[5] += e.clientY - lastPanY;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        canvas.setViewportTransform(vpt);
      });
      canvas.on("mouse:up", () => {
        isPanning = false;
        if (activeTool !== "hand") canvas.selection = true;
        canvas.setCursor("default");
      });

      /* ── Initial snapshot for undo ──────────────────────────────────── */
      const json = (canvas as any).toJSON([...FABRIC_CUSTOM_PROPS]);
      pushSnapshot(json);

      /* ── ResizeObserver — keep canvas filling container ──────────────── */
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width: rw, height: rh } = entry.contentRect;
        canvas.setDimensions({ width: rw, height: rh });
        const curZoom = canvas.viewportTransform[0];
        const proj = useDocumentStore.getState().project;
        const aw = proj?.width ?? width;
        const ah = proj?.height ?? height;
        const vpt2 = canvas.viewportTransform;
        vpt2[4] = (rw - aw * curZoom) / 2;
        vpt2[5] = (rh - ah * curZoom) / 2;
        canvas.setViewportTransform(vpt2);
      });
      ro.observe(container);

      onReady?.(canvas);

      // Store the observer on the ref for cleanup
      (canvas as any).__ro = ro;
    })();

    return () => {
      cancelled = true;
      if (localCanvas) {
        const ro = (localCanvas as any).__ro as ResizeObserver | undefined;
        ro?.disconnect();
        localCanvas.dispose();
      }
      fabricRef.current = null;
      setCanvas(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync zoom from store → canvas ───────────────────────────────────── */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const currentZoom = canvas.viewportTransform?.[0] ?? 1;
    if (Math.abs(currentZoom - zoom) > 0.001) {
      // Zoom toward centre of viewport
      const cw = canvas.width ?? 1;
      const ch = canvas.height ?? 1;
      canvas.zoomToPoint({ x: cw / 2, y: ch / 2 }, zoom);
    }
  }, [zoom]);

  /* ── Re-centre when artboard dimensions change (template swap) ──────── */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const cw = canvas.width ?? 1;
    const ch = canvas.height ?? 1;
    const curZoom = canvas.viewportTransform?.[0] ?? 1;
    centreArtboard(canvas, curZoom, cw, ch);
    canvas.requestRenderAll();
  }, [artboardW, artboardH, centreArtboard]);

  /* ── Sync tool mode → canvas ─────────────────────────────────────────── */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = "default";

    switch (activeTool) {
      case "hand":
        canvas.selection = false;
        canvas.defaultCursor = "grab";
        canvas.forEachObject((o: any) => {
          o.selectable = false;
          o.evented = false;
        });
        break;

      case "draw": {
        canvas.isDrawingMode = true;
        const brush = useToolStore.getState();
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = brush.brushColor;
          canvas.freeDrawingBrush.width = brush.brushWidth;
        }
        break;
      }

      case "select":
      default:
        canvas.forEachObject((o: any) => {
          if ((o as any).locked) {
            o.selectable = false;
            o.evented = false;
          } else {
            o.selectable = true;
            o.evented = true;
          }
        });
        break;
    }

    canvas.requestRenderAll();
  }, [activeTool]);

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor: activeTool === "hand" ? "grab" : undefined }}
    >
      <canvas ref={canvasElRef} />
    </div>
  );
}
