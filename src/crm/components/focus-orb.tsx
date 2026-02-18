"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { FocusModeTimer, type FocusModeTimerHandle } from "@crm/components/focus-mode-timer";

const STORAGE_KEY = "starterhub.focusOrb.position.v1";

type Position = { left: number; top: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { left: 16, top: 16 };
  const size = 56;
  const margin = 16;
  return {
    left: Math.max(margin, window.innerWidth - size - margin),
    top: Math.max(margin, window.innerHeight - size - 140),
  };
}

function loadPosition(): Position {
  if (typeof window === "undefined") return getDefaultPosition();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPosition();
    const parsed = JSON.parse(raw) as any;
    if (typeof parsed?.left !== "number" || typeof parsed?.top !== "number") return getDefaultPosition();
    return { left: parsed.left, top: parsed.top };
  } catch {
    return getDefaultPosition();
  }
}

function savePosition(pos: Position) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore
  }
}

export function FocusOrb() {
  const focusTimerRef = useRef<FocusModeTimerHandle | null>(null);
  const focusStartedAtRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const popupRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const [popupPlacement, setPopupPlacement] = useState<"top" | "bottom">("top");
  const [popupSize, setPopupSize] = useState<{ width: number; height: number }>({ width: 360, height: 320 });

  const [pos, setPos] = useState<Position>(() => loadPosition());
  const posRef = useRef<Position>(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const dragRef = useRef<{
    dragging: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    moved: boolean;
  }>({ dragging: false, pointerId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0, moved: false });

  const size = 56;
  const margin = 8;

  const computeDockPosition = (): Position => {
    if (typeof window === "undefined") return { left: 16, top: 16 };

    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      const anchor = document.getElementById("header-notification-anchor");
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        const gap = 8;
        const left = Math.round(rect.left - size - gap);
        const top = Math.round(rect.top + rect.height / 2 - size / 2);
        return clampToViewport({ left, top });
      }

      // Fallback: top-right.
      return clampToViewport({ left: window.innerWidth - size - 24, top: 10 });
    }

    const left = window.innerWidth - size - 24;

    const anchor = document.getElementById("dashboard-welcome-header");
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const top = Math.round(rect.top + 6);
      return clampToViewport({ left, top });
    }

    return clampToViewport({ left, top: 18 });
  };

  const clampToViewport = (next: Position): Position => {
    if (typeof window === "undefined") return next;
    const maxLeft = window.innerWidth - size - margin;
    const maxTop = window.innerHeight - size - margin;
    return {
      left: clamp(next.left, margin, maxLeft),
      top: clamp(next.top, margin, maxTop),
    };
  };

  useEffect(() => {
    // Re-clamp on resize; if running, keep it docked.
    const onResize = () => {
      if (runningRef.current) {
        const next = computeDockPosition();
        setPos(next);
        return;
      }
      setPos((p) => clampToViewport(p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringClass = useMemo(() => {
    return running
      ? "bg-[conic-gradient(from_90deg,#22c55e,#86efac,#10b981,#22c55e)]"
      : "bg-[conic-gradient(from_90deg,#a855f7,#3b82f6,#06b6d4,#a855f7)]";
  }, [running]);

  // Measure popup size and choose the best placement (top/bottom) based on available space.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (!open || running) return;

    const raf = window.requestAnimationFrame(() => {
      const el = popupRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setPopupSize({ width: rect.width, height: rect.height });
      }

      const marginEdge = 12;
      const spaceAbove = pos.top - 12 - rect.height;
      const spaceBelow = window.innerHeight - (pos.top + size + 12 + rect.height);

      // Prefer the side that fits; otherwise prefer the larger space.
      const nextPlacement =
        spaceAbove < marginEdge && spaceBelow >= marginEdge
          ? ("bottom" as const)
          : spaceBelow < marginEdge && spaceAbove >= marginEdge
            ? ("top" as const)
            : spaceAbove >= spaceBelow
              ? ("top" as const)
              : ("bottom" as const);

      setPopupPlacement(nextPlacement);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [open, running, pos.left, pos.top]);

  const popupPosition = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: pos.left + size / 2, top: pos.top };
    }

    const marginEdge = 12;
    const anchorX = pos.left + size / 2;
    const clampedLeft = clamp(anchorX - popupSize.width / 2, marginEdge, window.innerWidth - popupSize.width - marginEdge);

    const top =
      popupPlacement === "top"
        ? Math.max(marginEdge, pos.top - 12 - popupSize.height)
        : Math.min(window.innerHeight - popupSize.height - marginEdge, pos.top + size + 12);

    return { left: Math.round(clampedLeft), top: Math.round(top) };
  }, [pos.left, pos.top, popupPlacement, popupSize.height, popupSize.width]);

  const shouldStartDrag = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return true;

    // Don't hijack interaction on controls.
    const interactive = el.closest(
      "button, a, input, textarea, select, option, [role='button'], [role='switch'], [role='slider'], [data-no-drag]"
    );
    if (interactive) return false;

    return true;
  };

  const startDrag = (e: React.PointerEvent) => {
    dragRef.current.dragging = true;
    dragRef.current.pointerId = e.pointerId;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.startLeft = pos.left;
    dragRef.current.startTop = pos.top;
    dragRef.current.moved = false;

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      if (dragRef.current.pointerId !== ev.pointerId) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (!dragRef.current.moved) {
        if (Math.hypot(dx, dy) <= 5) return;
        dragRef.current.moved = true;
      }
      const next = clampToViewport({
        left: dragRef.current.startLeft + dx,
        top: dragRef.current.startTop + dy,
      });
      setPos(next);
    };

    const onUp = (ev: PointerEvent) => {
      if (dragRef.current.pointerId !== ev.pointerId) return;
      dragRef.current.dragging = false;
      dragRef.current.pointerId = null;
      savePosition(posRef.current);
      window.setTimeout(() => {
        dragRef.current.moved = false;
      }, 0);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const onClick = async () => {
    // If the user dragged, never treat it as a click (including when running).
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }

    if (running) {
      const startedAt = focusStartedAtRef.current;
      const elapsedSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
      focusTimerRef.current?.stop();
      setOpen(false);
      dragRef.current.moved = false;

      if (elapsedSeconds > 0) {
        const m = Math.floor(elapsedSeconds / 60);
        const s = elapsedSeconds % 60;
        toast(`Focus stopped • ${m}:${String(s).padStart(2, "0")}`);
      } else {
        toast("Focus stopped");
      }
      return;
    }

    setOpen((v) => !v);
  };

  return (
    <>
      {/* Backdrop to subtly fade the app when the popup is open */}
      <div
        aria-hidden={!open || running}
        className={
          "fixed inset-0 z-[68] bg-white/60 backdrop-blur-[2px] transition-opacity duration-200 " +
          (open && !running ? "opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={() => setOpen(false)}
      />

      <button
        type="button"
        aria-label={running ? "Stop focus mode" : "Open focus mode"}
        onClick={onClick}
        style={{ left: pos.left, top: pos.top, width: size, height: size }}
        className="fixed z-[70] rounded-full touch-none select-none transition-[left,top] duration-500 ease-out motion-reduce:transition-none"
        onPointerDown={startDrag}
      >
          <span className={`absolute -inset-1 rounded-full blur-md opacity-70 ${ringClass} animate-pulse`} />
          <span
            className={`absolute -inset-1 rounded-full ${ringClass} animate-spin [animation-duration:5.5s]`}
          />
          <span
            className={
              "absolute inset-0 rounded-full border bg-background/85 backdrop-blur " +
              (running ? "border-green-400/60" : "border-border")
            }
          />
          <span
            className={
              "relative z-10 flex h-full w-full items-center justify-center text-[11px] font-semibold " +
              (running ? "text-green-700" : "text-foreground")
            }
          >
            Focus
          </span>
      </button>

      {/* Keep the timer mounted so focus + sound keep running even when the popup is collapsed */}
      <div
        aria-hidden={!(open && !running)}
        className={
          "fixed z-[69] w-[320px] sm:w-[360px] md:w-[380px] max-w-[calc(100vw-24px)] transition-opacity duration-200 " +
          (open && !running ? " opacity-100" : " pointer-events-none opacity-0")
        }
        style={{
          left: popupPosition.left,
          top: popupPosition.top,
        }}
        onPointerDownCapture={(e) => {
          if (!shouldStartDrag(e.target)) return;
          startDrag(e);
        }}
      >
        <div ref={popupRef} className="relative">
          {/* Faded swerving aura (fluid gradient shift) */}
          <div aria-hidden="true" className="pointer-events-none absolute -inset-5 sm:-inset-6 rounded-[28px] opacity-45 blur-xl sm:blur-2xl">
            <div
              className={
                "focus-popup-aura absolute inset-0 rounded-[28px] " +
                (running
                  ? "bg-[linear-gradient(120deg,rgba(34,197,94,0.30),rgba(134,239,172,0.16),rgba(16,185,129,0.26),rgba(34,197,94,0.30))]"
                  : "bg-[linear-gradient(120deg,rgba(168,85,247,0.22),rgba(59,130,246,0.20),rgba(6,182,212,0.20),rgba(168,85,247,0.22))]")
              }
            />
            <div
              className={
                "focus-popup-aura-slow absolute inset-0 rounded-[28px] " +
                (running
                  ? "bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.18),transparent_60%)]"
                  : "bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_60%)]")
              }
            />
          </div>

          {/* Glass shell */}
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-background/35 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl supports-[backdrop-filter]:bg-background/25 dark:border-white/10 dark:ring-white/10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-background/20 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/30" />
                <span>Focus mode</span>
              </div>

              <button
                type="button"
                data-no-drag
                aria-label="Close focus"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-background/40 text-foreground/80 shadow-sm backdrop-blur hover:bg-background/55"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-0">
              <FocusModeTimer
                ref={focusTimerRef}
                variant="compact"
                showHeader={false}
                onRunningChange={(isRunning) => {
                  setRunning(isRunning);
                  dragRef.current.moved = false;
                  if (isRunning) {
                    focusStartedAtRef.current = Date.now();
                    setOpen(false);

                    // Dock the orb when focus starts.
                    window.requestAnimationFrame(() => {
                      const next = computeDockPosition();
                      setPos(next);
                      savePosition(next);
                    });
                  } else {
                    focusStartedAtRef.current = null;
                  }
                }}
                onComplete={() => {
                  const startedAt = focusStartedAtRef.current;
                  const elapsedSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
                  focusStartedAtRef.current = null;
                  if (elapsedSeconds > 0) {
                    const m = Math.floor(elapsedSeconds / 60);
                    const s = elapsedSeconds % 60;
                    toast.success(`Focus complete • ${m}:${String(s).padStart(2, "0")}`);
                  } else {
                    toast.success("Focus complete");
                  }
                }}
                className="border-0 bg-transparent shadow-none"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
