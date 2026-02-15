// ===========================================================================
// Canvas Workspace — boundary, page-bounds & clamping utilities
// ===========================================================================
//
// Pure helper functions consumed by CanvasStage.tsx.  They operate on
// Fabric.js objects and enforce the "page rectangle" metaphor:
//   - Page:  fixed-size design area at origin (0,0) → (dw, dh)
//   - Bleed: optional outer margin (bleedPx) beyond the page
//   - Workspace: infinite pan/zoom area around the page
// ===========================================================================

import type { FabricObject, Canvas as FabricCanvas } from 'fabric'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PageBounds {
  left: number
  top: number
  right: number
  bottom: number
}

/** Rectangle form of page bounds — used for export & clipPath. */
export interface PageRect {
  left: number
  top: number
  width: number
  height: number
}

export type BoundaryMode = 'clip' | 'bleed'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 4.0
export const DEFAULT_BLEED_PX = 30
export const SAFE_MARGIN_PX = 40

// ---------------------------------------------------------------------------
// Page bounds helpers
// ---------------------------------------------------------------------------

/** Page bounds in scene coordinates (origin 0,0). */
export function getPageBounds(dw: number, dh: number): PageBounds {
  return { left: 0, top: 0, right: dw, bottom: dh }
}

/** Page rectangle in scene coordinates — {left, top, width, height}. */
export function getPageRect(dw: number, dh: number): PageRect {
  return { left: 0, top: 0, width: dw, height: dh }
}

/** Allowed bounds based on boundary mode. */
export function getAllowedBounds(
  dw: number,
  dh: number,
  mode: BoundaryMode,
  bleedPx: number,
): PageBounds {
  if (mode === 'bleed') {
    return {
      left: -bleedPx,
      top: -bleedPx,
      right: dw + bleedPx,
      bottom: dh + bleedPx,
    }
  }
  return getPageBounds(dw, dh)
}

// ---------------------------------------------------------------------------
// Bounding rect in scene coordinates
// ---------------------------------------------------------------------------

/**
 * Get an object's axis-aligned bounding box in **scene** coordinates.
 * Uses `aCoords` (the four corners) so rotation is accounted for.
 */
export function getSceneBBox(obj: FabricObject): PageBounds {
  obj.setCoords()
  const coords = (obj as any).aCoords
  if (!coords) {
    const l = obj.left ?? 0
    const t = obj.top ?? 0
    return { left: l, top: t, right: l, bottom: t }
  }
  const xs = [coords.tl.x, coords.tr.x, coords.bl.x, coords.br.x]
  const ys = [coords.tl.y, coords.tr.y, coords.bl.y, coords.br.y]
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  }
}

// ---------------------------------------------------------------------------
// Clamping
// ---------------------------------------------------------------------------

/**
 * Clamp an object so its bounding box stays within `bounds`.
 * Adjusts position only (does not change scale / rotation).
 * Returns `true` if the object was moved.
 */
export function clampObjectToBounds(
  obj: FabricObject,
  bounds: PageBounds,
): boolean {
  const bb = getSceneBBox(obj)
  const bbW = bb.right - bb.left
  const bbH = bb.bottom - bb.top
  const boundsW = bounds.right - bounds.left
  const boundsH = bounds.bottom - bounds.top

  let dx = 0
  let dy = 0

  if (bbW > boundsW) {
    // Wider than bounds → centre
    dx = (bounds.left + bounds.right) / 2 - (bb.left + bbW / 2)
  } else {
    if (bb.left < bounds.left) dx = bounds.left - bb.left
    else if (bb.right > bounds.right) dx = bounds.right - bb.right
  }

  if (bbH > boundsH) {
    dy = (bounds.top + bounds.bottom) / 2 - (bb.top + bbH / 2)
  } else {
    if (bb.top < bounds.top) dy = bounds.top - bb.top
    else if (bb.bottom > bounds.bottom) dy = bounds.bottom - bb.bottom
  }

  if (dx !== 0 || dy !== 0) {
    obj.set({
      left: (obj.left ?? 0) + dx,
      top: (obj.top ?? 0) + dy,
    })
    obj.setCoords()
    return true
  }
  return false
}

/**
 * Constrain an object after a scale / rotate transform.
 * If the result overflows, clamp position first, then scale down if still
 * too large.
 */
export function constrainAfterTransform(
  obj: FabricObject,
  bounds: PageBounds,
): void {
  const bb = getSceneBBox(obj)
  const bbW = bb.right - bb.left
  const bbH = bb.bottom - bb.top
  const boundsW = bounds.right - bounds.left
  const boundsH = bounds.bottom - bounds.top

  if (bbW > boundsW || bbH > boundsH) {
    const ratio = Math.min(boundsW / bbW, boundsH / bbH)
    obj.set({
      scaleX: (obj.scaleX ?? 1) * ratio,
      scaleY: (obj.scaleY ?? 1) * ratio,
    })
    obj.setCoords()
  }
  clampObjectToBounds(obj, bounds)
}

/**
 * Ensure a newly-added object starts visible on the page.
 * If it's too large it is scaled down; if completely outside it is centred.
 * Objects are NOT clamped to the page — they may extend beyond it
 * (clipping is handled via the design-clip render override).
 */
export function ensureObjectInsidePage(
  obj: FabricObject,
  dw: number,
  dh: number,
  _mode: BoundaryMode = 'clip',
  _bleedPx: number = 0,
): void {
  obj.setCoords()

  const bb = getSceneBBox(obj)
  const bbW = bb.right - bb.left
  const bbH = bb.bottom - bb.top

  // Scale down if larger than 90 % of the page
  const maxW = dw * 0.9
  const maxH = dh * 0.9
  if (bbW > maxW || bbH > maxH) {
    const ratio = Math.min(maxW / bbW, maxH / bbH)
    obj.set({
      scaleX: (obj.scaleX ?? 1) * ratio,
      scaleY: (obj.scaleY ?? 1) * ratio,
    })
    obj.setCoords()
  }

  // If completely outside the page → centre on the page
  const nb = getSceneBBox(obj)
  const nbW = nb.right - nb.left
  const nbH = nb.bottom - nb.top
  if (
    nb.right < 0 ||
    nb.left > dw ||
    nb.bottom < 0 ||
    nb.top > dh
  ) {
    const cx = dw / 2 - nbW / 2
    const cy = dh / 2 - nbH / 2
    const offsetX = nb.left - (obj.left ?? 0)
    const offsetY = nb.top - (obj.top ?? 0)
    obj.set({ left: cx - offsetX, top: cy - offsetY })
    obj.setCoords()
  }
  // No clamping — objects may extend beyond the page.
}

// ---------------------------------------------------------------------------
// Rendering helpers (called from _renderBackground / after:render)
// ---------------------------------------------------------------------------

/**
 * Draw the workspace overlay that dims everything outside the page (or bleed)
 * rectangle.  Call from the Fabric `after:render` event so it sits on top of
 * objects but behind selection handles.
 */
export function drawWorkspaceOverlay(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  vpt: number[],
  dw: number,
  dh: number,
  mode: BoundaryMode,
  bleedPx: number,
): void {
  const clipW = mode === 'bleed' ? dw + bleedPx * 2 : dw
  const clipH = mode === 'bleed' ? dh + bleedPx * 2 : dh
  const clipLeft = mode === 'bleed' ? -bleedPx : 0
  const clipTop = mode === 'bleed' ? -bleedPx : 0

  // All calculations must be in **physical pixel** space because we reset
  // the context transform to identity.  On high-DPI / scaled displays
  // (devicePixelRatio > 1) the canvas backing-store is larger than the
  // CSS-pixel dimensions; using CSS-pixel coordinates would leave the
  // cutout smaller than the artboard, causing the dimming overlay to leak
  // onto the design area.
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  const fullW = canvasWidth * dpr
  const fullH = canvasHeight * dpr

  // Convert clip rect to physical-pixel screen coordinates, then
  // floor/ceil to snap to exact pixels (avoids anti-alias fringe).
  const sxRaw = (clipLeft * vpt[0] + vpt[4]) * dpr
  const syRaw = (clipTop * vpt[3] + vpt[5]) * dpr
  const sx = Math.floor(sxRaw)
  const sy = Math.floor(syRaw)
  const sw = Math.ceil(sxRaw + clipW * vpt[0] * dpr) - sx
  const sh = Math.ceil(syRaw + clipH * vpt[3] * dpr) - sy

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  // Use even-odd fill to cut out the page area
  ctx.beginPath()
  ctx.rect(0, 0, fullW, fullH)
  // Counter-clockwise cutout
  ctx.moveTo(sx, sy)
  ctx.lineTo(sx, sy + sh)
  ctx.lineTo(sx + sw, sy + sh)
  ctx.lineTo(sx + sw, sy)
  ctx.closePath()

  ctx.fillStyle = 'rgba(0,0,0,0.06)'
  ctx.fill('evenodd')

  ctx.restore()
}

/**
 * Draw the bleed boundary dashed rectangle.
 */
export function drawBleedGuide(
  ctx: CanvasRenderingContext2D,
  vpt: number[],
  dw: number,
  dh: number,
  bleedPx: number,
): void {
  ctx.save()
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])
  ctx.strokeStyle = 'rgba(239,68,68,0.5)' // red-ish
  ctx.lineWidth = 1 / vpt[0]
  ctx.setLineDash([4 / vpt[0], 4 / vpt[0]])
  ctx.strokeRect(-bleedPx, -bleedPx, dw + bleedPx * 2, dh + bleedPx * 2)
  ctx.setLineDash([])
  ctx.restore()
}

/**
 * Draw safe-margin guides inside the page.
 */
export function drawSafeMarginGuide(
  ctx: CanvasRenderingContext2D,
  vpt: number[],
  dw: number,
  dh: number,
  margin: number = SAFE_MARGIN_PX,
): void {
  if (margin <= 0) return
  ctx.save()
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])
  ctx.strokeStyle = 'rgba(59,130,246,0.35)' // blue
  ctx.lineWidth = 1 / vpt[0]
  ctx.setLineDash([3 / vpt[0], 3 / vpt[0]])
  ctx.strokeRect(margin, margin, dw - margin * 2, dh - margin * 2)
  ctx.setLineDash([])
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Design clip — clips rendered objects to the page rectangle
// ---------------------------------------------------------------------------

/**
 * Override `_renderObjects` so design objects are visually clipped to the
 * page rectangle — like CSS `overflow: hidden`.
 *
 * Unlike the old `canvas.clipPath` approach, this clips ONLY the object
 * layer.  The white artboard background (painted in `_renderBackground`)
 * and the dimming overlay (`after:render`) remain unclipped, which
 * eliminates the anti-aliasing fading artefacts at page edges.
 *
 * Objects can still be moved / scaled / rotated outside the page.
 * Transform controls render on the upper canvas and are not affected.
 *
 * Call once after canvas creation.
 */
export function applyDesignClip(
  canvas: FabricCanvas,
  dw: number,
  dh: number,
): void {
  const orig = (canvas as any)._renderObjects.bind(canvas)
  ;(canvas as any)._renderObjects = function (
    ctx: CanvasRenderingContext2D,
    objects: FabricObject[],
  ) {
    ctx.save()
    // ctx already carries the viewportTransform, so coordinates are in
    // scene space — (0,0)→(dw,dh) maps exactly to the design page.
    ctx.beginPath()
    ctx.rect(0, 0, dw, dh)
    ctx.clip()
    orig(ctx, objects)
    ctx.restore()
  }
}
