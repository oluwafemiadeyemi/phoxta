// ===========================================================================
// exportPage — crop-to-page export utilities for Fabric.js canvas
// ===========================================================================
//
// Every export helper here renders ONLY the Design Page rectangle
// (origin 0,0 → designWidth × designHeight) regardless of the current
// zoom level or viewport pan position.
//
// Key guarantees:
//   1. viewportTransform is temporarily reset to identity so the export
//      captures scene-coordinate content, not screen-coordinate.
//   2. Canvas backgroundColor is set appropriately (white or transparent).
//   3. All state is restored in a finally block even if an error occurs.
//   4. The `left/top/width/height` crop parameters constrain output to the
//      page bounds — workspace overlays, shadows and pasteboard are excluded.
// ===========================================================================

import type { Canvas as FabricCanvas, TMat2D } from 'fabric'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PageExportOptions {
  /** Design-page width in px (scene coords). */
  designWidth: number
  /** Design-page height in px (scene coords). */
  designHeight: number
  /** Image format — 'png' | 'jpeg'. */
  format?: 'png' | 'jpeg'
  /** JPEG quality 0-1 (ignored for png). Default 0.92 */
  quality?: number
  /** Multiplier for resolution (e.g. dpi / 72). Default 1 */
  multiplier?: number
  /** If true, export with transparent background (PNG only). */
  transparent?: boolean
}

// ---------------------------------------------------------------------------
// Helpers — save / restore canvas state
// ---------------------------------------------------------------------------

interface CanvasSnapshot {
  vpt: TMat2D
  backgroundColor: string
  overlayColor: string
}

function snapshotCanvas(canvas: FabricCanvas): CanvasSnapshot {
  return {
    vpt: [...canvas.viewportTransform] as TMat2D,
    backgroundColor: (canvas.backgroundColor as string) ?? '',
    overlayColor: (canvas.overlayColor as string) ?? '',
  }
}

function restoreCanvas(canvas: FabricCanvas, snap: CanvasSnapshot): void {
  canvas.setViewportTransform(snap.vpt)
  canvas.backgroundColor = snap.backgroundColor
  canvas.overlayColor = snap.overlayColor
}

// ---------------------------------------------------------------------------
// Core export — returns a data-URL (PNG / JPEG)
// ---------------------------------------------------------------------------

/**
 * Export only the design-page area as a data-URL string.
 *
 * Works correctly under any zoom / pan state and excludes everything
 * outside the page rectangle.
 */
export function exportPageToDataURL(
  canvas: FabricCanvas,
  opts: PageExportOptions,
): string {
  const {
    designWidth,
    designHeight,
    format = 'png',
    quality = 0.92,
    multiplier = 1,
    transparent = false,
  } = opts

  const snap = snapshotCanvas(canvas)

  try {
    // 1. Reset viewport to identity so we export in scene coordinates
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])

    // 2. Set background: transparent → clear, otherwise white
    canvas.backgroundColor = transparent ? '' : '#ffffff'
    canvas.overlayColor = ''

    // 3. Render & export the page rectangle only
    canvas.renderAll()

    const dataUrl = canvas.toDataURL({
      format,
      quality: format === 'jpeg' ? quality : undefined,
      multiplier,
      left: 0,
      top: 0,
      width: designWidth,
      height: designHeight,
    } as any)

    return dataUrl
  } finally {
    // 4. Always restore original state
    restoreCanvas(canvas, snap)
    canvas.renderAll()
  }
}

// ---------------------------------------------------------------------------
// SVG export — page-cropped
// ---------------------------------------------------------------------------

/**
 * Export the design page as an SVG string, cropped to page bounds.
 */
export function exportPageToSVG(
  canvas: FabricCanvas,
  designWidth: number,
  designHeight: number,
): string {
  const snap = snapshotCanvas(canvas)

  try {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    canvas.backgroundColor = '#ffffff'
    canvas.overlayColor = ''
    canvas.renderAll()

    // Fabric's toSVG uses the current canvas dimensions.
    // We set a viewBox so only the page area is included.
    const svgStr: string = (canvas as any).toSVG({
      viewBox: {
        x: 0,
        y: 0,
        width: designWidth,
        height: designHeight,
      },
      width: `${designWidth}px`,
      height: `${designHeight}px`,
    })

    return svgStr
  } finally {
    restoreCanvas(canvas, snap)
    canvas.renderAll()
  }
}

// ---------------------------------------------------------------------------
// Blob helper — for download / clipboard
// ---------------------------------------------------------------------------

/**
 * Convert a data-URL to a Blob.
 */
export function dataURLToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download for a data-URL or Blob.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  downloadDataUrl(url, filename)
  URL.revokeObjectURL(url)
}
