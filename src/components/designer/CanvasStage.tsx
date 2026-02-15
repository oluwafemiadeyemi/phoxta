'use client'

// ===========================================================================
// CanvasStage — Fabric.js canvas with viewport-based rendering.
//
// The HTML canvas element fills the entire container.  A white "artboard"
// representing the design area is drawn in `_renderBackground` so it sits
// behind all Fabric objects.  Zoom-to-fit is applied on mount and resize.
//
// Zoom:   Ctrl/⌘ + wheel → zoom to pointer
//         Normal wheel   → pan (scroll)
// Pan:    Middle-click drag, or hold Spacebar + drag
// Fit:    "Fit" button or double-click the zoom percentage
// ===========================================================================

import { useEffect, useRef, useCallback } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { useToolStore, TOOL_SHORTCUTS } from '@/stores/designer/toolStore'
import { activateTool, autoFitTextboxWidth, type ToolContext } from '@/lib/designer/toolHandlers'
import {
  ZOOM_MIN,
  ZOOM_MAX,
  ensureObjectInsidePage,
  drawWorkspaceOverlay,
  drawBleedGuide,
  drawSafeMarginGuide,
  applyDesignClip,
} from '@/lib/designer/canvasWorkspace'
import { v4 as uuid } from 'uuid'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'

/* ── dynamic import (avoids SSR) ────────────────────────────── */
let fabricModule: typeof import('fabric') | null = null
const getFabric = async () => {
  if (!fabricModule) fabricModule = await import('fabric')
  return fabricModule
}

/* ── refresh expired Supabase image URLs in canvas JSON ─────── */

/**
 * Extract the Supabase Storage path from a signed URL.
 * URL format: https://{host}/storage/v1/object/sign/{bucket}/{path}?token=...
 * Returns the path portion (after the bucket name) or null.
 */
function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url)
    // Match /storage/v1/object/sign/design-projects/{storagePath}
    const match = u.pathname.match(/\/storage\/v1\/object\/sign\/design-projects\/(.+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * Batch-fetch fresh signed URLs for a set of storage paths.
 * Returns a map of path → fresh URL, or empty on failure.
 */
async function batchRefreshUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  try {
    const res = await fetch('/api/designer/refresh-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    })
    if (!res.ok) {
      console.warn(`[batchRefreshUrls] API returned ${res.status}`)
      return {}
    }
    const { urls } = (await res.json()) as { urls: Record<string, string> }
    return urls ?? {}
  } catch (err) {
    console.warn('[batchRefreshUrls] Network error:', err)
    return {}
  }
}

/**
 * Walk a canvas JSON structure, collect the Supabase storage path for
 * every image-type object, then batch-fetch fresh signed URLs and
 * patch each object's `src` so `loadFromJSON` can load them.
 *
 * Supports two cases:
 *   1. Objects that already have `_storagePath` (new images).
 *   2. Legacy objects without `_storagePath` — the path is extracted
 *      from the expired signed URL in `src`.
 */
async function refreshImageUrls(
  json: Record<string, unknown>,
): Promise<void> {
  const objects = (json as any).objects as any[] | undefined
  if (!objects?.length) return

  const entries: { obj: any; path: string }[] = []
  const collectPaths = (objs: any[]) => {
    for (const obj of objs) {
      if (obj.type === 'image') {
        // Ensure crossOrigin is always set for Supabase signed URLs
        obj.crossOrigin = 'anonymous'

        // Prefer explicit _storagePath; fall back to extracting from src URL
        let path: string | null = obj._storagePath ?? null
        if (!path && obj.src) {
          path = extractStoragePath(obj.src)
          // Back-fill so future saves include it
          if (path) obj._storagePath = path
        }
        if (path) entries.push({ obj, path })
      }
      // Recurse into groups
      if (obj.objects) collectPaths(obj.objects)
    }
  }
  collectPaths(objects)

  if (entries.length === 0) return

  const uniquePaths = [...new Set(entries.map((e) => e.path))]
  const urls = await batchRefreshUrls(uniquePaths)

  let patched = 0
  for (const entry of entries) {
    const freshUrl = urls[entry.path]
    if (freshUrl) {
      entry.obj.src = freshUrl
      patched++
    } else {
      console.warn(`[refreshImageUrls] No fresh URL for path: ${entry.path}`)
    }
  }
  console.debug(`[refreshImageUrls] Patched ${patched}/${entries.length} image URLs`)
}

/**
 * Resilient canvas loader that tolerates individual object-load failures.
 *
 * Fabric's built-in `loadFromJSON` uses `Promise.all` — ONE broken image
 * (e.g. an expired signed URL that `refreshImageUrls` couldn't fix) aborts
 * the entire canvas load, leaving the user with a blank canvas.
 *
 * This function instead:
 *   1. Enlivens every object individually via `Promise.allSettled`.
 *   2. For any images that fail, retries with freshly-signed URLs.
 *   3. Adds all successfully-loaded objects in the correct z-order.
 */
async function resilientLoadFromJSON(
  fabricCanvas: import('fabric').Canvas,
  json: Record<string, unknown>,
): Promise<void> {
  const fabric = await getFabric()
  const {
    objects = [],
    backgroundImage,
    background,
    overlayImage,
    overlay,
    clipPath,
    ...serialized
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = json as any

  const serObjects = objects as any[]
  if (serObjects.length === 0) {
    fabricCanvas.clear()
    fabricCanvas.set(serialized)
    return
  }

  const renderOnAddRemove = fabricCanvas.renderOnAddRemove
  fabricCanvas.renderOnAddRemove = false

  try {
    // ── Phase 1: attempt to enliven every object individually ──
    const results = await Promise.allSettled(
      serObjects.map((obj: any) => {
        const Klass = fabric.classRegistry.getClass<typeof fabric.FabricObject>(obj.type)
        return Klass.fromObject(obj)
      }),
    )

    // Sort results into slots (preserving z-order) and failures
    const slots: (import('fabric').FabricObject | null)[] = new Array(
      serObjects.length,
    ).fill(null)
    const failedIndices: number[] = []

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      if (r.status === 'fulfilled') {
        slots[i] = r.value as import('fabric').FabricObject
      } else {
        failedIndices.push(i)
        console.warn(
          `[resilientLoad] Object ${i} (${serObjects[i].type}) failed:`,
          r.reason,
        )
      }
    }

    // ── Phase 2: retry failed images with fresh URLs ──
    if (failedIndices.length > 0) {
      const imageIndices = failedIndices.filter(
        (i) => serObjects[i].type === 'image',
      )
      if (imageIndices.length > 0) {
        // Collect storage paths for failed images
        const pathEntries: { idx: number; path: string }[] = []
        for (const idx of imageIndices) {
          const obj = serObjects[idx]
          const path: string | null =
            obj._storagePath ?? extractStoragePath(obj.src ?? '')
          if (path) {
            pathEntries.push({ idx, path })
          }
        }

        if (pathEntries.length > 0) {
          const freshUrls = await batchRefreshUrls(
            [...new Set(pathEntries.map((e) => e.path))],
          )

          const retryResults = await Promise.allSettled(
            pathEntries.map(({ idx, path }) => {
              const obj = serObjects[idx]
              const freshUrl = freshUrls[path]
              if (!freshUrl) {
                return Promise.reject(
                  new Error(`No fresh URL for ${path}`),
                )
              }
              obj.src = freshUrl
              obj.crossOrigin = 'anonymous'
              const Klass = fabric.classRegistry.getClass<typeof fabric.FabricImage>('image')
              return Klass.fromObject(obj)
            }),
          )

          for (let ri = 0; ri < retryResults.length; ri++) {
            const r = retryResults[ri]
            const idx = pathEntries[ri].idx
            if (r.status === 'fulfilled') {
              slots[idx] = r.value as import('fabric').FabricObject
              console.debug(
                `[resilientLoad] Retry succeeded for image ${idx}`,
              )
            } else {
              console.warn(
                `[resilientLoad] Retry also failed for image ${idx}:`,
                r.reason,
              )
            }
          }
        }
      }
    }

    // ── Phase 3: assemble canvas ──
    const ordered = slots.filter(Boolean) as import('fabric').FabricObject[]

    fabricCanvas.clear()
    if (ordered.length > 0) fabricCanvas.add(...ordered)

    // Apply canvas-level serialized properties
    fabricCanvas.set(serialized)

    // Enliven canvas-level images (background, overlay, clipPath)
    try {
      const enliveFn = (fabric as any).enlivenObjectEnlivables as (
        props: Record<string, unknown>,
      ) => Promise<Record<string, unknown>>
      const enlivedMap = await enliveFn({
        backgroundImage,
        backgroundColor: background,
        overlayImage,
        overlayColor: overlay,
        clipPath,
      })
      fabricCanvas.set(enlivedMap)
    } catch (e) {
      console.warn(
        '[resilientLoad] Failed to enliven canvas options:',
        e,
      )
    }

    const total = serObjects.length
    const loaded = ordered.length
    if (loaded < total) {
      console.warn(
        `[resilientLoad] Loaded ${loaded}/${total} objects (${total - loaded} failed)`,
      )
    } else {
      console.debug(`[resilientLoad] All ${total} objects loaded OK`)
    }
  } finally {
    fabricCanvas.renderOnAddRemove = renderOnAddRemove
  }
}

/* ── props ──────────────────────────────────────────────────── */
interface CanvasStageProps {
  projectId: string
  pageId: string
  initialFabricUrl?: string | null
  width: number  // design width  (the artboard, NOT the viewport)
  height: number // design height (the artboard, NOT the viewport)
}

/** Padding around the artboard when auto-fitting */
const FIT_PADDING = 50

export default function CanvasStage({
  projectId,
  pageId,
  initialFabricUrl,
  width: designWidth,
  height: designHeight,
}: CanvasStageProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const clipboardRef = useRef<any>(null)
  const isLoadingRef = useRef(false)
  const isPanningRef = useRef(false)
  const lastPanRef = useRef({ x: 0, y: 0 })
  const spaceHeldRef = useRef(false)
  const toolCleanupRef = useRef<(() => void) | null>(null)
  /** Snapshot taken on mouse:down — captures canvas state BEFORE any
   *  interactive transform so that object:modified can push it as the
   *  undo entry (the "before" state). */
  const preInteractionRef = useRef<string | null>(null)

  const {
    canvas, setCanvas,
    setActiveObjectIds, refreshLayers, pushUndo,
    zoom, setZoom, markDirty,
    project, isDirty, setIsSaving, markClean,
    currentPageId,
  } = useDocumentStore()

  const { snapEnabled, boundaryMode, bleedPx, showSafeMargins } = useUIStore()

  // ── Zoom helpers ──────────────────────────────────────────
  /** Compute the zoom level that fits the artboard inside the container */
  const calcFitZoom = useCallback(
    (containerW: number, containerH: number) => {
      if (containerW <= 0 || containerH <= 0) return 0.5
      return Math.min(
        (containerW - FIT_PADDING * 2) / designWidth,
        (containerH - FIT_PADDING * 2) / designHeight,
        ZOOM_MAX, // cap at max zoom
      )
    },
    [designWidth, designHeight],
  )

  /** Apply zoom-to-fit on the given Fabric canvas */
  const applyFitZoom = useCallback(
    (fc: import('fabric').Canvas) => {
      const w = wrapperRef.current?.clientWidth ?? 800
      const h = wrapperRef.current?.clientHeight ?? 600
      const z = calcFitZoom(w, h)
      const panX = (w - designWidth * z) / 2
      const panY = (h - designHeight * z) / 2
      fc.setViewportTransform([z, 0, 0, z, panX, panY])
      setZoom(z)
    },
    [calcFitZoom, designWidth, designHeight, setZoom],
  )

  /** Zoom to a specific level, keeping the viewport centre steady */
  const zoomToLevel = useCallback(
    (newZoom: number) => {
      if (!canvas || !wrapperRef.current) return
      const cw = wrapperRef.current.clientWidth
      const ch = wrapperRef.current.clientHeight
      const vpt = canvas.viewportTransform!.slice() as number[]
      const cx = cw / 2
      const cy = ch / 2
      // scene point at the current viewport centre
      const sx = (cx - vpt[4]) / vpt[0]
      const sy = (cy - vpt[5]) / vpt[3]
      // build new transform that keeps this scene point centred
      vpt[0] = newZoom
      vpt[3] = newZoom
      vpt[4] = cx - sx * newZoom
      vpt[5] = cy - sy * newZoom
      canvas.setViewportTransform(vpt as any)
      setZoom(newZoom)
    },
    [canvas, setZoom],
  )

  // ── Initialise Fabric ─────────────────────────────────────
  useEffect(() => {
    let fabricCanvas: import('fabric').Canvas | null = null
    let disposed = false
    let resizeObs: ResizeObserver | null = null
    const cleanups: (() => void)[] = []

    const init = async () => {
      const fabric = await getFabric()
      if (disposed || !canvasElRef.current || !wrapperRef.current) return

      const wrapper = wrapperRef.current
      const containerW = wrapper.clientWidth || 800
      const containerH = wrapper.clientHeight || 600

      // ── Create the Fabric canvas at the CONTAINER size (not the design
      //    size).  The design artboard is drawn via _renderBackground.
      fabricCanvas = new fabric.Canvas(canvasElRef.current, {
        width: containerW,
        height: containerH,
        backgroundColor: '#27272a', // dark pasteboard
        preserveObjectStacking: true,
        selection: true,
        stopContextMenu: true,
      })

      // ── Artboard rendering ──
      // Override _renderBackground to paint the white design artboard between
      // the gray pasteboard fill and the object layer.  This avoids adding an
      // artboard object (which would pollute JSON save / undo / layers).
      // Store artboard dimensions on the canvas instance so they can be
      // updated dynamically (e.g. after PSD import resizes the artboard).
      ;(fabricCanvas as any).__artboardW = designWidth
      ;(fabricCanvas as any).__artboardH = designHeight
      // Helper: resize artboard on the fly (e.g. after PSD import)
      ;(fabricCanvas as any).__resizeArtboard = (w: number, h: number) => {
        ;(fabricCanvas as any).__artboardW = w
        ;(fabricCanvas as any).__artboardH = h
        // Re-apply clip & re-centre viewport
        applyDesignClip(fabricCanvas!, w, h)
        const cw = fabricCanvas!.width ?? 800
        const ch = fabricCanvas!.height ?? 600
        const fz = Math.min(
          (cw - FIT_PADDING * 2) / w,
          (ch - FIT_PADDING * 2) / h,
          ZOOM_MAX,
        )
        const px = (cw - w * fz) / 2
        const py = (ch - h * fz) / 2
        fabricCanvas!.setViewportTransform([fz, 0, 0, fz, px, py])
        setZoom(fz)
        fabricCanvas!.requestRenderAll()
      }
      const origRenderBg = (fabricCanvas as any)._renderBackground.bind(fabricCanvas)
      ;(fabricCanvas as any)._renderBackground = function (
        ctx: CanvasRenderingContext2D,
      ) {
        origRenderBg(ctx)
        const vpt = this.viewportTransform
        if (!vpt) return
        const aw: number = (this as any).__artboardW ?? designWidth
        const ah: number = (this as any).__artboardH ?? designHeight
        ctx.save()
        ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])
        // drop-shadow behind artboard
        ctx.shadowColor = 'rgba(0,0,0,0.10)'
        ctx.shadowBlur = 16
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 3
        // white artboard
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, aw, ah)
        // subtle border
        ctx.shadowColor = 'transparent'
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 1 / vpt[0]
        ctx.strokeRect(0, 0, aw, ah)
        ctx.restore()

        // Bleed guide (when in bleed mode)
        const uiState = useUIStore.getState()
        if (uiState.boundaryMode === 'bleed') {
          drawBleedGuide(ctx, vpt, aw, ah, uiState.bleedPx)
        }
        // Safe-margin guide
        if (uiState.showSafeMargins) {
          drawSafeMarginGuide(ctx, vpt, aw, ah)
        }
      }

      // ── Initial zoom-to-fit ──
      const fitZ = calcFitZoom(containerW, containerH)
      const panX = (containerW - designWidth * fitZ) / 2
      const panY = (containerH - designHeight * fitZ) / 2
      fabricCanvas.setViewportTransform([fitZ, 0, 0, fitZ, panX, panY])
      setZoom(fitZ)

      // ── Resize observer – keeps canvas filling the container ──
      resizeObs = new ResizeObserver((entries) => {
        if (!fabricCanvas || disposed) return
        const { width: w, height: h } = entries[0].contentRect
        const cw = Math.floor(w)
        const ch = Math.floor(h)
        if (cw <= 0 || ch <= 0) return
        fabricCanvas.setDimensions({ width: cw, height: ch })
        // re-centre at the current zoom level — read artboard dims
        // from the canvas instance so resizes are picked up.
        const abW: number = (fabricCanvas as any).__artboardW ?? designWidth
        const abH: number = (fabricCanvas as any).__artboardH ?? designHeight
        const curZ = fabricCanvas.getZoom()
        const px = (cw - abW * curZ) / 2
        const py = (ch - abH * curZ) / 2
        fabricCanvas.setViewportTransform([curZ, 0, 0, curZ, px, py])
      })
      resizeObs.observe(wrapper)

      // ── Pre-interaction snapshot ──
      // Capture the canvas state on mouse:down so that when object:modified
      // fires (AFTER Fabric applies the transform) we can push the BEFORE
      // state onto the undo stack instead of the after state.
      fabricCanvas.on('mouse:down', () => {
        if (isLoadingRef.current || (fabricCanvas as any).__isUndoRedoLoading) return
        preInteractionRef.current = JSON.stringify(
          (fabricCanvas as any).toJSON(['id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath'])
        )
      })

      // ── Selection / modification events ──
      fabricCanvas.on('object:added', (e: any) => {
        if (isLoadingRef.current || (fabricCanvas as any).__isUndoRedoLoading) return
        const obj = e.target
        if (obj && !obj.id) obj.id = uuid()
      })

      fabricCanvas.on('selection:created', (e: any) => {
        const ids = (e.selected ?? []).map((o: any) => o.id).filter(Boolean)
        setActiveObjectIds(ids)
      })
      fabricCanvas.on('selection:updated', (e: any) => {
        const ids = (e.selected ?? []).map((o: any) => o.id).filter(Boolean)
        setActiveObjectIds(ids)
      })
      fabricCanvas.on('selection:cleared', () => setActiveObjectIds([]))

      fabricCanvas.on('object:modified', (e: any) => {
        if (isLoadingRef.current || (fabricCanvas as any).__isUndoRedoLoading) return

        // Normalize textbox scale BEFORE capturing undo so the undo
        // snapshot has the correctly normalised state.
        const target = e.target
        if (target?.type === 'textbox') {
          const sx = target.scaleX ?? 1
          const sy = target.scaleY ?? 1
          if (sx !== 1 || sy !== 1) {
            target.set({
              fontSize: Math.round((target.fontSize ?? 24) * sy),
              width: (target.width ?? 100) * sx,
              scaleX: 1,
              scaleY: 1,
            })
            target.setCoords()
          }
        }

        // Push the PRE-interaction snapshot (captured on mouse:down)
        // so that undo restores the state from BEFORE the transform.
        if (preInteractionRef.current) {
          useDocumentStore.getState().pushUndoSnapshot('edit', preInteractionRef.current)
          preInteractionRef.current = null
        } else {
          pushUndo('edit')
        }
        markDirty()
        refreshLayers()
        fabricCanvas!.renderAll()
      })

      // Auto-fit textbox width when the user finishes editing
      fabricCanvas.on('text:changed', (e: any) => {
        if (e.target) autoFitTextboxWidth(e.target)
        fabricCanvas!.renderAll()
      })

      fabricCanvas.on('object:added', () => {
        if (isLoadingRef.current || (fabricCanvas as any).__isUndoRedoLoading) return
        refreshLayers()
        markDirty()
      })
      fabricCanvas.on('object:removed', () => {
        if (isLoadingRef.current || (fabricCanvas as any).__isUndoRedoLoading) return
        refreshLayers()
        markDirty()
      })

      // ── Snapping ──
      if (snapEnabled) {
        fabricCanvas.on('object:moving', (e: any) => {
          const obj = e.target
          if (!obj || !fabricCanvas) return
          const threshold = 5 / fabricCanvas.getZoom()
          const _dw = (fabricCanvas as any).__artboardW ?? designWidth
          const _dh = (fabricCanvas as any).__artboardH ?? designHeight
          const cx = _dw / 2
          const cy = _dh / 2
          const ocx = obj.left + (obj.width * obj.scaleX) / 2
          const ocy = obj.top + (obj.height * obj.scaleY) / 2
          if (Math.abs(ocx - cx) < threshold)
            obj.set('left', cx - (obj.width * obj.scaleX) / 2)
          if (Math.abs(ocy - cy) < threshold)
            obj.set('top', cy - (obj.height * obj.scaleY) / 2)
          if (Math.abs(obj.left) < threshold) obj.set('left', 0)
          if (Math.abs(obj.top) < threshold) obj.set('top', 0)
          if (Math.abs(obj.left + obj.width * obj.scaleX - _dw) < threshold)
            obj.set('left', _dw - obj.width * obj.scaleX)
          if (Math.abs(obj.top + obj.height * obj.scaleY - _dh) < threshold)
            obj.set('top', _dh - obj.height * obj.scaleY)
        })
      }

      // ── Boundary enforcement ──
      // Objects may extend beyond the page; clipping is via _renderObjects override.
      // We only centre new objects that spawn completely off-page.

      // Boundary-check new objects (skip during JSON load)
      fabricCanvas.on('object:added', (e: any) => {
        if (isLoadingRef.current || (fabricCanvas as any).__isUndoRedoLoading || !e.target) return
        ensureObjectInsidePage(e.target, (fabricCanvas as any).__artboardW ?? designWidth, (fabricCanvas as any).__artboardH ?? designHeight)
      })

      // ── Workspace overlay (dims area outside page / bleed) ──
      fabricCanvas.on('after:render', () => {
        if (!fabricCanvas) return
        const ctx = fabricCanvas.getContext()
        const vpt = fabricCanvas.viewportTransform
        if (!ctx || !vpt) return
        const ui = useUIStore.getState()
        drawWorkspaceOverlay(
          ctx,
          fabricCanvas.width ?? 800,
          fabricCanvas.height ?? 600,
          vpt as unknown as number[],
          (fabricCanvas as any).__artboardW ?? designWidth,
          (fabricCanvas as any).__artboardH ?? designHeight,
          ui.boundaryMode,
          ui.bleedPx,
        )
      })

      // ── Design clip (overflow hidden for the design page) ──
      // Clips rendered objects to the page rectangle without clipping the
      // artboard background, eliminating anti-alias fading at page edges.
      applyDesignClip(fabricCanvas, (fabricCanvas as any).__artboardW ?? designWidth, (fabricCanvas as any).__artboardH ?? designHeight)

      // ── Prevent selecting objects when clicking outside the artboard ──
      // Even if part of an object extends beyond the visible page, clicks
      // outside the artboard rectangle should not select anything.
      fabricCanvas.on('mouse:down:before', (opt: any) => {
        if (!fabricCanvas) return
        const pointer = fabricCanvas.getScenePoint(opt.e)
        const aw = (fabricCanvas as any).__artboardW ?? designWidth
        const ah = (fabricCanvas as any).__artboardH ?? designHeight
        if (pointer.x < 0 || pointer.y < 0 || pointer.x > aw || pointer.y > ah) {
          // Click is outside the artboard — clear selection and skip target
          fabricCanvas.discardActiveObject()
          opt.target = undefined            // prevent Fabric from selecting
          fabricCanvas.requestRenderAll()
        }
      })

      // ── Middle-click panning (always available regardless of tool) ──
      fabricCanvas.on('mouse:down', (opt: any) => {
        const e = opt.e as MouseEvent
        if (e.button === 1) {
          isPanningRef.current = true
          lastPanRef.current = { x: e.clientX, y: e.clientY }
          fabricCanvas!.selection = false
          wrapper.style.cursor = 'grabbing'
        }
      })
      fabricCanvas.on('mouse:move', (opt: any) => {
        if (!isPanningRef.current || !fabricCanvas) return
        const e = opt.e as MouseEvent
        const vpt = fabricCanvas.viewportTransform!.slice() as number[]
        vpt[4] += e.clientX - lastPanRef.current.x
        vpt[5] += e.clientY - lastPanRef.current.y
        fabricCanvas.setViewportTransform(vpt as any)
        lastPanRef.current = { x: e.clientX, y: e.clientY }
      })
      fabricCanvas.on('mouse:up', () => {
        if (isPanningRef.current) {
          isPanningRef.current = false
          fabricCanvas!.selection = true
          wrapper.style.cursor = ''
        }
      })

      // ── Spacebar → temporarily activate hand tool ──
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ' && !spaceHeldRef.current) {
          const tag = (e.target as HTMLElement)?.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
          e.preventDefault()
          spaceHeldRef.current = true
          useToolStore.getState().temporarilyActivateTool('hand')
        }
      }
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === ' ') {
          spaceHeldRef.current = false
          useToolStore.getState().restorePreviousTool()
        }
      }
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      cleanups.push(() => {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
      })

      // ── Expose canvas to the store ──
      setCanvas(fabricCanvas)

      // ── Load saved JSON for this page ──
      if (initialFabricUrl) {
        isLoadingRef.current = true
        try {
          const res = await fetch(initialFabricUrl)
          if (res.ok) {
            const json = await res.json()
            // Remove saved backgroundColor — the pasteboard manages its own
            delete json.backgroundColor

            // Refresh expired Supabase signed URLs on image objects.
            // Each image stores its storage path as `_storagePath`; we
            // batch-request fresh signed URLs and patch `src` before load.
            await refreshImageUrls(json)

            // Use resilient loader: individual object failures don't abort
            // the entire canvas.  Failed images are retried with fresh URLs.
            await resilientLoadFromJSON(fabricCanvas, json)
            // Ensure every loaded object has a unique id (the object:added
            // handler skips assignment during load to avoid duplicate undos)
            for (const obj of fabricCanvas.getObjects()) {
              if (!(obj as any).id) (obj as any).id = uuid()
            }
            // Restore pasteboard bg (loadFromJSON may have cleared it)
            fabricCanvas.backgroundColor = '#27272a'

            fabricCanvas.renderAll()
            refreshLayers()
          }
        } catch (err) {
          console.error('Failed to load canvas:', err)
        } finally {
          isLoadingRef.current = false
        }
      }
    }

    init()

    return () => {
      disposed = true
      resizeObs?.disconnect()
      cleanups.forEach((fn) => fn())
      if (fabricCanvas) {
        fabricCanvas.dispose()
        setCanvas(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, designWidth, designHeight])

  // ── Periodic signed-URL refresh ───────────────────────────
  // Supabase signed URLs expire after 1 hour. Re-sign every 45 min
  // so images never break during a long editing session.
  useEffect(() => {
    if (!canvas) return

    const REFRESH_INTERVAL = 45 * 60 * 1000 // 45 minutes

    const refreshLiveUrls = async () => {
      const objects = canvas.getObjects()
      const entries: { obj: any; path: string }[] = []

      const collect = (objs: any[]) => {
        for (const obj of objs) {
          if (obj.type === 'image') {
            const path: string | null = obj._storagePath ?? null
            if (path) entries.push({ obj, path })
          }
          if (obj.objects) collect(obj.objects)
        }
      }
      collect(objects as any[])

      if (entries.length === 0) return

      const uniquePaths = [...new Set(entries.map(e => e.path))]
      try {
        const res = await fetch('/api/designer/refresh-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: uniquePaths }),
        })
        if (!res.ok) return
        const { urls } = (await res.json()) as { urls: Record<string, string> }

        let changed = false
        for (const entry of entries) {
          const freshUrl = urls[entry.path]
          if (freshUrl && entry.obj.src !== freshUrl) {
            entry.obj.setSrc(freshUrl, { crossOrigin: 'anonymous' }).then(() => {
              canvas.requestRenderAll()
            })
            changed = true
          }
        }
        if (changed) {
          console.debug(`[CanvasStage] Refreshed ${entries.length} image URL(s)`)
        }
      } catch {
        console.warn('[CanvasStage] Periodic URL refresh failed')
      }
    }

    const timer = setInterval(refreshLiveUrls, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [canvas])

  // ── Tool activation / cleanup ─────────────────────────────
  // Subscribe to toolStore changes and (re-)activate the current tool's
  // handlers on the Fabric canvas.  Each tool returns a cleanup function that
  // removes its listeners so there are never conflicting handlers active.
  useEffect(() => {
    if (!canvas || !wrapperRef.current) return

    const ctx: ToolContext = {
      canvas,
      dw: designWidth,
      dh: designHeight,
      wrapper: wrapperRef.current,
      getFabric,
    }

    // Activate the initial tool
    toolCleanupRef.current?.()
    toolCleanupRef.current = activateTool(
      useToolStore.getState().activeTool,
      ctx,
    )

    // Re-activate whenever the active tool changes
    const unsub = useToolStore.subscribe((state, prev) => {
      if (state.activeTool === prev.activeTool) return
      toolCleanupRef.current?.()
      toolCleanupRef.current = activateTool(state.activeTool, ctx)
    })

    return () => {
      unsub()
      toolCleanupRef.current?.()
      toolCleanupRef.current = null
    }
  }, [canvas, designWidth, designHeight])

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (!canvas) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const ctrl = e.ctrlKey || e.metaKey

      // ── Tool shortcuts (single letter, no modifiers) ──
      // Skip while crop tool is active — crop handles its own keys
      if (!ctrl && !e.altKey && !e.shiftKey) {
        const currentTool = useToolStore.getState().activeTool
        if (currentTool === 'crop') return // let cropTool's capture handler decide
        const toolId = TOOL_SHORTCUTS[e.key.toLowerCase()]
        if (toolId) {
          e.preventDefault()
          useToolStore.getState().setActiveTool(toolId)
          return
        }
      }

      // Escape → return to move tool (skip when crop tool handles its own escape)
      if (e.key === 'Escape') {
        if (useToolStore.getState().activeTool === 'crop') return
        useToolStore.getState().setActiveTool('move')
        canvas.discardActiveObject()
        canvas.renderAll()
        return
      }

      // Delete (disabled during crop mode)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (useToolStore.getState().activeTool === 'crop') return
        e.preventDefault()
        const active = canvas.getActiveObjects()
        if (active.length) {
          pushUndo('delete')
          active.forEach((o) => canvas.remove(o))
          canvas.discardActiveObject()
          canvas.renderAll()
          refreshLayers()
          markDirty()
        }
      }

      // Undo / Redo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        useDocumentStore.getState().undo()
      }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        useDocumentStore.getState().redo()
      }

      // Copy / Paste
      if (ctrl && e.key === 'c') {
        const active = canvas.getActiveObject()
        if (active) clipboardRef.current = await active.clone()
      }
      if (ctrl && e.key === 'v') {
        const clip = clipboardRef.current
        if (clip) {
          pushUndo('paste')
          const pasted = await clip.clone()
          pasted.set({
            left: (pasted.left ?? 0) + 20,
            top: (pasted.top ?? 0) + 20,
          })
          pasted.id = uuid()
          // canvas.add triggers object:added which calls ensureObjectInsidePage
          canvas.add(pasted)
          canvas.setActiveObject(pasted)
          clipboardRef.current = await clip.clone()
          markDirty()
          refreshLayers()
        }
      }

      // Select all
      if (ctrl && e.key === 'a') {
        e.preventDefault()
        const fabric = await getFabric()
        const objs = canvas.getObjects()
        if (objs.length) {
          const sel = new fabric.ActiveSelection(objs, { canvas })
          canvas.setActiveObject(sel)
          canvas.renderAll()
        }
      }

      // Duplicate
      if (ctrl && e.key === 'd') {
        e.preventDefault()
        const active = canvas.getActiveObject()
        if (active) {
          pushUndo('duplicate')
          const cloned = await active.clone()
          cloned.set({
            left: (cloned.left ?? 0) + 20,
            top: (cloned.top ?? 0) + 20,
          })
          ;(cloned as any).id = uuid()
          // canvas.add triggers object:added which calls ensureObjectInsidePage
          canvas.add(cloned)
          canvas.setActiveObject(cloned)
          markDirty()
          refreshLayers()
        }
      }

      // ── Arrow-key nudging (with boundary enforcement) ──
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (arrowKeys.includes(e.key)) {
        const active = canvas.getActiveObject()
        if (!active) return
        e.preventDefault()
        pushUndo('nudge')
        const step = e.shiftKey ? 10 : 1
        switch (e.key) {
          case 'ArrowLeft':
            active.set('left', (active.left ?? 0) - step)
            break
          case 'ArrowRight':
            active.set('left', (active.left ?? 0) + step)
            break
          case 'ArrowUp':
            active.set('top', (active.top ?? 0) - step)
            break
          case 'ArrowDown':
            active.set('top', (active.top ?? 0) + step)
            break
        }
        active.setCoords()
        canvas.renderAll()
        markDirty()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canvas, pushUndo, markDirty, refreshLayers, designWidth, designHeight])

  // ── Mouse-wheel zoom / pan ────────────────────────────────
  useEffect(() => {
    if (!canvas) return
    const handler = (opt: any) => {
      const e = opt.e as WheelEvent
      e.preventDefault()
      e.stopPropagation()

      if (e.ctrlKey || e.metaKey) {
        // Pinch / Ctrl+wheel → zoom to pointer position
        const delta = e.deltaY
        let newZoom = canvas.getZoom() * (1 - delta / 500)
        newZoom = Math.min(Math.max(newZoom, ZOOM_MIN), ZOOM_MAX)

        // Use offsetX/offsetY — coordinates within the canvas element
        const point = new (fabricModule!.Point)(e.offsetX, e.offsetY)
        canvas.zoomToPoint(point, newZoom)
        setZoom(newZoom)
      } else {
        // Normal scroll → pan
        const vpt = canvas.viewportTransform!.slice() as number[]
        vpt[4] -= e.deltaX
        vpt[5] -= e.deltaY
        canvas.setViewportTransform(vpt as any)
      }
    }

    canvas.on('mouse:wheel', handler)
    return () => {
      canvas.off('mouse:wheel', handler)
    }
  }, [canvas, setZoom])

  // ── Touch gestures: pinch-to-zoom & two-finger pan ────────
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    let lastTouchDist = 0
    let lastTouchMid = { x: 0, y: 0 }
    let isTouchPanning = false
    let lastSingleTouch = { x: 0, y: 0 }

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

    const getMidpoint = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    })

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Prevent default scrolling/zooming
        e.preventDefault()
        isTouchPanning = true
        lastTouchDist = getDistance(e.touches[0], e.touches[1])
        lastTouchMid = getMidpoint(e.touches[0], e.touches[1])
        // Disable Fabric object selection during gesture
        canvas.selection = false
        canvas.discardActiveObject()
        canvas.requestRenderAll()
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isTouchPanning) {
        e.preventDefault()
        const dist = getDistance(e.touches[0], e.touches[1])
        const mid = getMidpoint(e.touches[0], e.touches[1])

        // --- Zoom ---
        const scaleFactor = dist / lastTouchDist
        let newZoom = canvas.getZoom() * scaleFactor
        newZoom = Math.min(Math.max(newZoom, ZOOM_MIN), ZOOM_MAX)

        // Zoom toward the midpoint of the two fingers
        const wrapperRect = wrapper.getBoundingClientRect()
        const offsetX = mid.x - wrapperRect.left
        const offsetY = mid.y - wrapperRect.top
        const point = new (fabricModule!.Point)(offsetX, offsetY)
        canvas.zoomToPoint(point, newZoom)

        // --- Pan ---
        const vpt = canvas.viewportTransform!.slice() as number[]
        vpt[4] += mid.x - lastTouchMid.x
        vpt[5] += mid.y - lastTouchMid.y
        canvas.setViewportTransform(vpt as any)

        setZoom(newZoom)
        lastTouchDist = dist
        lastTouchMid = mid
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isTouchPanning = false
        canvas.selection = true
      }
    }

    // Passive: false is needed so we can preventDefault on touch events
    wrapper.addEventListener('touchstart', onTouchStart, { passive: false })
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false })
    wrapper.addEventListener('touchend', onTouchEnd)

    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart)
      wrapper.removeEventListener('touchmove', onTouchMove)
      wrapper.removeEventListener('touchend', onTouchEnd)
    }
  }, [canvas, setZoom])

  // ── Autosave ──────────────────────────────────────────────
  const save = useCallback(async () => {
    const state = useDocumentStore.getState()
    const c = state.canvas
    const pid = currentPageId
    if (!c || !state.isDirty || state.isSaving || !pid) return

    setIsSaving(true)
    try {
      // Serialise canvas state
      const canvasJson = (c as any).toJSON([
        'id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath',
      ])
      // Store a white background in the saved JSON for standalone loading
      canvasJson.backgroundColor = '#ffffff'

      // Generate a preview thumbnail: toDataURL internally resets the
      // viewport transform, so the crop coordinates are in design space.
      const savedBg = c.backgroundColor
      const savedVpt = [...c.viewportTransform]
      c.backgroundColor = '#ffffff'
      c.setViewportTransform([1, 0, 0, 1, 0, 0])

      const thumbScale = 400 / Math.max(designWidth, designHeight)
      const dataUrl = c.toDataURL({
        format: 'png',
        left: 0,
        top: 0,
        width: designWidth,
        height: designHeight,
        multiplier: Math.min(thumbScale, 1),
      } as any)

      c.backgroundColor = savedBg
      c.setViewportTransform(savedVpt as any)
      c.renderAll()

      await fetch(`/api/designer/${projectId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: pid,
          canvasJson,
          previewDataUrl: dataUrl,
          name: state.project?.name,
        }),
      })

      markClean(new Date().toISOString())
    } catch (err) {
      console.error('Autosave failed:', err)
    } finally {
      setIsSaving(false)
    }
  }, [projectId, currentPageId, designWidth, designHeight, setIsSaving, markClean])

  useEffect(() => {
    ;(window as any).__designerSave = save
    return () => { delete (window as any).__designerSave }
  }, [save])

  // Save before navigating away / closing tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!useDocumentStore.getState().isDirty) return
      // Use sendBeacon to reliably deliver the save even during page unload
      const state = useDocumentStore.getState()
      const c = state.canvas
      const pid = currentPageId
      if (!c || !pid) return
      try {
        const canvasJson = (c as any).toJSON([
          'id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath',
        ])
        canvasJson.backgroundColor = '#ffffff'
        const payload = JSON.stringify({ pageId: pid, canvasJson, name: state.project?.name })
        navigator.sendBeacon(
          `/api/designer/${projectId}/save`,
          new Blob([payload], { type: 'application/json' }),
        )
      } catch { /* best effort */ }
    }
    const handleVisChange = () => {
      if (document.visibilityState === 'hidden' && useDocumentStore.getState().isDirty) {
        save()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisChange)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisChange)
    }
  }, [save, projectId, currentPageId])

  useEffect(() => {
    autosaveTimer.current = setInterval(() => {
      if (useDocumentStore.getState().isDirty) save()
    }, 10_000)
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
    }
  }, [save])

  // ── Zoom toolbar handlers ─────────────────────────────────
  const handleZoomIn = () =>
    zoomToLevel(Math.min((canvas?.getZoom() ?? 1) * 1.2, ZOOM_MAX))
  const handleZoomOut = () =>
    zoomToLevel(Math.max((canvas?.getZoom() ?? 1) / 1.2, ZOOM_MIN))
  const handleZoomFit = () => {
    if (canvas) applyFitZoom(canvas)
  }
  const handleZoom100 = () => zoomToLevel(1)

  // ── Drag-and-drop from panels ─────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-designer-image')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData('application/x-designer-image')
    if (!raw || !canvas) return
    e.preventDefault()

    const data = JSON.parse(raw) as {
      type: 'asset' | 'stock'
      url: string
      path?: string
      name?: string
      alt?: string
      photographer?: string
    }

    const fabricModule = await import('fabric')
    const { pushUndo, markDirty } = useDocumentStore.getState()
    pushUndo('Add image')

    const img = await fabricModule.FabricImage.fromURL(data.url, { crossOrigin: 'anonymous' })
    const maxDim = 400
    if (img.width! > maxDim || img.height! > maxDim) {
      const scale = maxDim / Math.max(img.width!, img.height!)
      img.scale(scale)
    }

    // Convert drop position (screen) to canvas scene coordinates
    const wrapperRect = wrapperRef.current!.getBoundingClientRect()
    const vpt = canvas.viewportTransform!
    const canvasX = (e.clientX - wrapperRect.left - vpt[4]) / vpt[0]
    const canvasY = (e.clientY - wrapperRect.top - vpt[5]) / vpt[3]
    const scaledW = img.getScaledWidth()
    const scaledH = img.getScaledHeight()
    img.set({ left: canvasX - scaledW / 2, top: canvasY - scaledH / 2 })

    if (data.type === 'asset' && data.path) {
      ;(img as any)._storagePath = data.path
    }

    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.requestRenderAll()
    markDirty()
  }, [canvas])

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      ref={wrapperRef}
      className="w-full h-full relative overflow-hidden"
      style={{ background: '#27272a' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Zoom toolbar */}
      <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 z-10 flex items-center gap-0.5 md:gap-1 bg-zinc-900/90 backdrop-blur rounded-lg shadow-sm border border-white/[0.06] px-1 py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={handleZoomOut}>
              <ZoomOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Zoom out</p></TooltipContent>
        </Tooltip>

        <span
          className="text-[10px] md:text-xs font-mono w-10 md:w-12 text-center cursor-pointer select-none"
          onDoubleClick={handleZoomFit}
          title="Double-click to fit"
        >
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={handleZoomIn}>
              <ZoomIn className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Zoom in</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={handleZoomFit}>
              <Maximize className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Fit to screen</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Fabric canvas — fills the container */}
      <canvas ref={canvasElRef} className="block" />
    </div>
  )
}
