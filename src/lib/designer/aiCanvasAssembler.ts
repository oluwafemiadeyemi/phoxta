// ===========================================================================
// AI Design — Canvas Assembler
//
// Takes AIPageSpec (positioned element specs) and assembles them into
// actual Fabric.js objects on the canvas. Runs client-side.
//
// Key constraint: the Fabric canvas uses a viewport transform to center the
// artboard on-screen.  Object coordinates (0,0)–(dw,dh) map to the artboard.
// We must NEVER call canvas.clear() because that resets the viewport
// transform and pasteboard colour.  Instead we remove objects individually.
// ===========================================================================

import type { Canvas as FabricCanvas } from 'fabric'
import type { AIPageSpec, AIElementSpec } from '@/types/aiDesign'
import { v4 as uuid } from 'uuid'

/* ── dynamic import (avoids SSR) ────────────────────────────── */
let fabricModule: typeof import('fabric') | null = null
const getFabric = async () => {
  if (!fabricModule) fabricModule = await import('fabric')
  return fabricModule
}

// ---------------------------------------------------------------------------
// Assemble a single page spec onto the given canvas
// ---------------------------------------------------------------------------

/**
 * Build Fabric.js objects from element specs and add them to the canvas.
 * Returns the number of objects successfully added.
 *
 * @param designWidth  – explicit artboard width (avoids guessing from specs)
 * @param designHeight – explicit artboard height
 */
export async function assemblePageOnCanvas(
  canvas: FabricCanvas,
  pageSpec: AIPageSpec,
  opts?: {
    clearFirst?: boolean
    designWidth?: number
    designHeight?: number
    pushUndo?: () => void
    markDirty?: () => void
    refreshLayers?: () => void
  },
): Promise<number> {
  const fabric = await getFabric()
  const { clearFirst = true, pushUndo, markDirty, refreshLayers } = opts ?? {}

  if (clearFirst) {
    pushUndo?.()

    // Save viewport transform BEFORE clearing — canvas.clear() would
    // reset it and move objects off-screen.
    const savedVpt = canvas.viewportTransform
      ? (canvas.viewportTransform.slice() as [number, number, number, number, number, number])
      : null

    // Remove all objects individually instead of canvas.clear().
    const objs = canvas.getObjects().slice()
    for (const obj of objs) canvas.remove(obj)

    // If the design has a non-white background, add a full-page rect.
    const bg = pageSpec.backgroundColor
    if (bg && bg !== '#ffffff' && bg !== '#FFFFFF' && bg !== 'white') {
      const dw = opts?.designWidth ?? 1080
      const dh = opts?.designHeight ?? 1080

      const bgRect = new fabric.Rect({
        left: 0,
        top: 0,
        width: dw,
        height: dh,
        fill: bg,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      })
      ;(bgRect as any).id = uuid()
      ;(bgRect as any)._aiBgRect = true
      canvas.add(bgRect)
    }

    // Restore viewport transform so the artboard stays centred.
    if (savedVpt) {
      canvas.setViewportTransform(savedVpt)
    }
  }

  let added = 0

  for (const spec of pageSpec.elements) {
    try {
      const obj = await createFabricObject(fabric, spec)
      if (obj) {
        ;(obj as any).id = uuid()
        canvas.add(obj)
        added++
      }
    } catch (err) {
      console.warn('[aiAssemble] Failed to create object:', spec.type, err)
    }
  }

  canvas.requestRenderAll()
  markDirty?.()
  refreshLayers?.()

  return added
}

// ---------------------------------------------------------------------------
// Create individual Fabric objects from specs
// ---------------------------------------------------------------------------

async function createFabricObject(
  fabric: typeof import('fabric'),
  spec: AIElementSpec,
): Promise<import('fabric').FabricObject | null> {
  switch (spec.type) {
    case 'image':
      return createImage(fabric, spec)
    case 'textbox':
      return createTextbox(fabric, spec)
    case 'rect':
      return createRect(fabric, spec)
    default:
      return null
  }
}

async function createImage(
  fabric: typeof import('fabric'),
  spec: AIElementSpec,
): Promise<import('fabric').FabricObject | null> {
  if (!spec.src) {
    console.warn('[aiAssemble] Image spec has no src, creating placeholder')
    return createPlaceholderRect(fabric, spec)
  }

  try {
    const img = await fabric.FabricImage.fromURL(spec.src, {
      crossOrigin: 'anonymous',
    })

    if (!img || !img.width || !img.height) {
      console.warn('[aiAssemble] Image loaded but has zero dimensions:', spec.src)
      return createPlaceholderRect(fabric, spec)
    }

    // Scale to fit the target dimensions
    const natW = img.width
    const natH = img.height
    const targetW = spec.width
    const targetH = spec.height

    // Scale to cover the target area (crop-to-fill)
    const scaleX = targetW / natW
    const scaleY = targetH / natH
    const scale = Math.max(scaleX, scaleY)

    img.set({
      left: spec.left,
      top: spec.top,
      scaleX: scale,
      scaleY: scale,
      originX: 'left',
      originY: 'top',
    })

    // Crop to target dimensions using clipPath
    const clipW = targetW / scale
    const clipH = targetH / scale
    const clipLeft = (natW - clipW) / 2
    const clipTop = (natH - clipH) / 2

    const clipRect = new fabric.Rect({
      left: -natW / 2 + clipLeft,
      top: -natH / 2 + clipTop,
      width: clipW,
      height: clipH,
      originX: 'left',
      originY: 'top',
      absolutePositioned: false,
    })
    img.clipPath = clipRect

    return img
  } catch (err) {
    console.warn('[aiAssemble] Image load failed:', spec.src, err)
    return createPlaceholderRect(fabric, spec)
  }
}

/**
 * Create a subtle placeholder rect when an image can't be loaded.
 */
function createPlaceholderRect(
  fabric: typeof import('fabric'),
  spec: AIElementSpec,
): import('fabric').FabricObject {
  return new fabric.Rect({
    left: spec.left,
    top: spec.top,
    width: spec.width,
    height: spec.height,
    fill: '#d1d5db',
    originX: 'left',
    originY: 'top',
    rx: 4,
    ry: 4,
  })
}

function createTextbox(
  fabric: typeof import('fabric'),
  spec: AIElementSpec,
): import('fabric').FabricObject {
  return new fabric.Textbox(spec.text ?? '', {
    left: spec.left,
    top: spec.top,
    width: spec.width,
    fontSize: spec.fontSize ?? 24,
    fontFamily: spec.fontFamily ?? 'Inter',
    fontWeight: spec.fontWeight ?? 'normal',
    fill: spec.fill ?? '#000000',
    textAlign: (spec.textAlign ?? 'left') as import('fabric').Textbox['textAlign'],
    lineHeight: spec.lineHeight ?? 1.3,
    splitByGrapheme: false,
    originX: 'left',
    originY: 'top',
  })
}

function createRect(
  fabric: typeof import('fabric'),
  spec: AIElementSpec,
): import('fabric').FabricObject {
  return new fabric.Rect({
    left: spec.left,
    top: spec.top,
    width: spec.width,
    height: spec.height,
    fill: spec.rectFill ?? '#000000',
    opacity: spec.opacity ?? 1,
    rx: spec.rx ?? 0,
    ry: spec.ry ?? 0,
    originX: 'left',
    originY: 'top',
    selectable: true,
  })
}
