// ===========================================================================
// PSD Importer — parse .psd files and convert layers to Fabric.js objects
// Uses ag-psd for parsing, fabric v7 for canvas objects
// ===========================================================================

import type { Canvas as FabricCanvas } from 'fabric'
import type { Psd, Layer } from 'ag-psd'

export interface PsdImportResult {
  width: number
  height: number
  layerCount: number
  errors: string[]
}

/**
 * Parse a PSD file buffer and add all layers to the Fabric canvas.
 */
export async function importPsdToCanvas(
  file: File,
  canvas: FabricCanvas,
  options: {
    pushUndo: (label: string) => void
    markDirty: () => void
    refreshLayers: () => void
    /** Pass the actual design dimensions — canvas.getWidth()/getHeight()
     *  may return the viewport size when a viewport transform is applied. */
    designWidth?: number
    designHeight?: number
    /** When provided, the importer calls this with the PSD dimensions so that
     *  the caller can resize the artboard / project to match. This avoids
     *  scaling and preserves the original PSD layout 1:1. */
    onResize?: (w: number, h: number) => Promise<void> | void
  }
): Promise<PsdImportResult> {
  const fabricModule = await import('fabric')
  const agPsd = await import('ag-psd')

  // Initialize ag-psd's canvas creation for the browser.
  // This is critical — without it, ag-psd cannot create canvas elements for
  // layer image data and layer.canvas will be undefined for all layers.
  // Next.js bundling may evaluate the module where `document` is unavailable,
  // so we must explicitly initialize regardless.
  if (typeof document !== 'undefined') {
    agPsd.initializeCanvas(
      (width: number, height: number) => {
        const c = document.createElement('canvas')
        c.width = width
        c.height = height
        return c
      }
    )
  }

  const buffer = await file.arrayBuffer()
  const psd: Psd = agPsd.readPsd(new Uint8Array(buffer) as any, {
    skipThumbnail: true,
    skipCompositeImageData: false,
  })

  console.log('[PSD Import] Parsed file:', {
    width: psd.width,
    height: psd.height,
    hasChildren: !!(psd.children && psd.children.length),
    childCount: psd.children?.length ?? 0,
    hasComposite: !!psd.canvas,
  })

  const result: PsdImportResult = {
    width: psd.width,
    height: psd.height,
    layerCount: 0,
    errors: [],
  }

  options.pushUndo('Import PSD')

  // Calculate scale factor if PSD is larger than the design area.
  // When onResize is provided the caller will resize the artboard to match
  // the PSD dimensions, so we import at 1:1 (no scaling).
  const canvasW = options.designWidth ?? canvas.getWidth()
  const canvasH = options.designHeight ?? canvas.getHeight()
  let scale: number
  if (options.onResize) {
    scale = 1
    await options.onResize(psd.width, psd.height)
  } else {
    scale = Math.min(1, canvasW / psd.width, canvasH / psd.height)
  }

  console.log('[PSD Import] Scale factor:', scale, `(PSD: ${psd.width}x${psd.height}, Canvas: ${canvasW}x${canvasH})`)

  // Process layers recursively
  if (psd.children && psd.children.length > 0) {
    await processLayers(psd.children, canvas, fabricModule, result, 0, 0, scale, psd)
  }

  // If no layers were imported from children, use the flattened composite
  if (result.layerCount === 0 && psd.canvas) {
    console.log('[PSD Import] No individual layers imported, using composite image')
    try {
      await addCanvasAsImage(psd.canvas, canvas, fabricModule, 0, 0, 'PSD Composite', 1, scale)
      result.layerCount = 1
    } catch (err) {
      result.errors.push(`Failed to import composite: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (result.layerCount === 0) {
    result.errors.push('No visible layers could be imported from this PSD file')
  }

  console.log('[PSD Import] Result:', { layers: result.layerCount, errors: result.errors })

  canvas.requestRenderAll()
  options.refreshLayers()
  options.markDirty()

  return result
}

/**
 * Recursively process PSD layers and convert them to Fabric objects.
 */
async function processLayers(
  layers: Layer[],
  canvas: FabricCanvas,
  fabricModule: typeof import('fabric'),
  result: PsdImportResult,
  offsetX: number,
  offsetY: number,
  scale: number,
  psd?: Psd
): Promise<void> {
  // Process layers in order (bottom to top in PSD = first to last in array)
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex]
    if (layer.hidden) {
      console.log(`[PSD Import] Skipping hidden layer: "${layer.name}"`)
      continue
    }

    const layerName = layer.name || `Layer ${result.layerCount + 1}`
    // ag-psd opacity is already 0-1
    const opacity = layer.opacity !== undefined ? layer.opacity : 1
    const x = ((layer.left ?? 0) + offsetX) * scale
    const y = ((layer.top ?? 0) + offsetY) * scale

    console.log(`[PSD Import] Processing layer: "${layerName}"`, {
      hasChildren: !!(layer.children?.length),
      hasText: !!layer.text,
      hasCanvas: !!layer.canvas,
      hasImageData: !!(layer as any).imageData,
      hasVectorFill: !!(layer as any).vectorFill,
      hasVectorOrigination: !!(layer as any).vectorOrigination,
      opacity,
      bounds: { left: layer.left, top: layer.top, right: layer.right, bottom: layer.bottom },
    })

    try {
      // Group / folder layer
      if (layer.children && layer.children.length > 0) {
        await processLayers(layer.children, canvas, fabricModule, result, offsetX, offsetY, scale, psd)
        continue
      }

      // Text layer
      if (layer.text) {
        const textObj = createTextObject(layer, fabricModule, x, y, opacity, scale)
        if (textObj) {
          canvas.add(textObj)
          result.layerCount++
          console.log(`[PSD Import] Added text layer: "${layerName}"`)
          continue
        }
        // Text object creation failed, try falling through to raster
        console.log(`[PSD Import] Text creation returned null for "${layerName}", trying as raster`)
      }

      // Vector shape layer (rect, rounded rect, ellipse with solid fill)
      if ((layer as any).vectorFill || (layer as any).vectorOrigination) {
        const shapeObj = tryCreateShapeObject(layer, fabricModule, x, y, opacity, scale)
        if (shapeObj) {
          canvas.add(shapeObj)
          result.layerCount++
          console.log(`[PSD Import] Added shape layer: "${layerName}"`)
          continue
        }
        // Unsupported shape (gradient fill, pattern, complex path) — fall through to raster
        console.log(`[PSD Import] Shape not natively supported for "${layerName}", trying as raster`)
      }

      // Raster / image layer with canvas element
      if (layer.canvas) {
        const lw = layer.canvas.width
        const lh = layer.canvas.height
        if (lw > 0 && lh > 0) {
          await addCanvasAsImage(layer.canvas, canvas, fabricModule, x, y, layerName, opacity, scale)
          result.layerCount++
          console.log(`[PSD Import] Added raster layer: "${layerName}" (${lw}x${lh})`)
          continue
        }
        console.log(`[PSD Import] Layer "${layerName}" has canvas but zero dimensions (${lw}x${lh})`)
      }

      // Fallback: try to create canvas from imageData if available
      const imageData = (layer as any).imageData as ImageData | undefined
      if (imageData && imageData.width > 0 && imageData.height > 0) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = imageData.width
        tempCanvas.height = imageData.height
        const ctx = tempCanvas.getContext('2d')
        if (ctx) {
          ctx.putImageData(imageData, 0, 0)
          await addCanvasAsImage(tempCanvas, canvas, fabricModule, x, y, layerName, opacity, scale)
          result.layerCount++
          console.log(`[PSD Import] Added layer from imageData: "${layerName}" (${imageData.width}x${imageData.height})`)
          continue
        }
      }

      // Background layer fallback — In PSD files the locked "Background"
      // layer often stores its pixel data only in the composite image
      // section, not in the individual layer data section. ag-psd exposes
      // the composite via psd.canvas. When a layer has no renderable data
      // and looks like it could be the background, use the composite.
      if (psd?.canvas) {
        const isBottomLayer = layerIndex === 0
        const lw = (layer.right ?? 0) - (layer.left ?? 0)
        const lh = (layer.bottom ?? 0) - (layer.top ?? 0)
        const coversFullDoc =
          lw >= (psd.width ?? 0) * 0.9 && lh >= (psd.height ?? 0) * 0.9
        const nameHintsBg =
          !layer.name || /^background$/i.test(layer.name.trim())

        if (isBottomLayer || coversFullDoc || nameHintsBg) {
          console.log(
            `[PSD Import] Layer "${layerName}" has no pixel data — using composite as background fallback`
          )
          try {
            await addCanvasAsImage(
              psd.canvas,
              canvas,
              fabricModule,
              0,
              0,
              layerName || 'Background',
              opacity,
              scale
            )
            result.layerCount++
            console.log(
              `[PSD Import] Added background layer from composite: "${layerName}"`
            )
            continue
          } catch (bgErr) {
            console.warn(
              '[PSD Import] Composite background fallback failed:',
              bgErr
            )
          }
        }
      }

      // Layer type that we couldn't import (adjustment layer, shape layer, etc.)
      console.log(`[PSD Import] Skipped layer "${layerName}" — no renderable data`)
      result.errors.push(`Skipped layer "${layerName}" — no image or text data`)
    } catch (err) {
      const msg = `Failed to import layer "${layerName}": ${err instanceof Error ? err.message : String(err)}`
      console.error('[PSD Import]', msg)
      result.errors.push(msg)
    }
  }
}

/**
 * Create a Fabric Textbox from a PSD text layer.
 */
function createTextObject(
  layer: Layer,
  fabricModule: typeof import('fabric'),
  x: number,
  y: number,
  opacity: number,
  scale: number
): InstanceType<typeof fabricModule.Textbox> | null {
  if (!layer.text) return null

  const { text, style } = layer.text
  if (!text) return null

  const width = (layer.right ?? 0) - (layer.left ?? 0)

  // Extract style properties
  const fontSize = style?.fontSize ?? 24
  const fontFamily = style?.font?.name ?? 'Arial'
  const fontWeight = style?.fauxBold ? 'bold' : 'normal'
  const fontStyle = style?.fauxItalic ? 'italic' : 'normal'
  const underline = style?.underline ?? false

  // Apply scale to fontSize and width so text proportions match positions
  const scaledFontSize = fontSize * scale
  const scaledWidth = Math.max(width * scale, 50)

  // Convert fill color
  let fill = '#000000'
  if (style?.fillColor) {
    const c = style.fillColor as Record<string, number>
    if ('r' in c && 'g' in c && 'b' in c) {
      fill = rgbToHex(c.r, c.g, c.b)
    }
  }

  // Text alignment (justification lives on paragraphStyle)
  let textAlign: 'left' | 'center' | 'right' | 'justify' = 'left'
  const justification = layer.text?.paragraphStyle?.justification
  if (justification) {
    if (justification.includes('center')) textAlign = 'center'
    else if (justification.includes('right')) textAlign = 'right'
    else if (justification.includes('justify')) textAlign = 'justify'
  }

  const textbox = new fabricModule.Textbox(text, {
    left: x,
    top: y,
    width: scaledWidth,
    fontSize: scaledFontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    underline,
    fill,
    textAlign,
    opacity,
    originX: 'left',
    originY: 'top',
    selectable: true,
  })

  // Set custom name for layer panel
  ;(textbox as any).customName = layer.name || 'Text'
  ;(textbox as any).id = crypto.randomUUID()

  return textbox
}

/**
 * Try to create a native Fabric.js shape from a PSD vector/shape layer.
 * Supports rectangles (keyOriginType 1), rounded rectangles (2), and
 * ellipses (5) with solid colour fill. Returns null for unsupported
 * shapes (gradients, patterns, custom Bézier paths) so the caller can
 * fall back to raster import.
 */
function tryCreateShapeObject(
  layer: Layer,
  fabricModule: typeof import('fabric'),
  x: number,
  y: number,
  opacity: number,
  scale: number
): InstanceType<typeof fabricModule.Rect | typeof fabricModule.Ellipse> | null {
  // We need vectorOrigination for the parametric shape type / bounds
  const origination = (layer as any).vectorOrigination
  if (!origination?.keyDescriptorList?.length) return null

  const descriptor = origination.keyDescriptorList[0]
  const shapeType: number | undefined = descriptor?.keyOriginType
  if (shapeType === undefined) return null

  // ── Bounds ──
  // Prefer keyOriginShapeBoundingBox (precise shape dims), then layer bounds
  let shapeLeft: number
  let shapeTop: number
  let shapeWidth: number
  let shapeHeight: number

  const bbox = descriptor.keyOriginShapeBoundingBox
  if (bbox) {
    const bLeft = bbox.left?.value ?? layer.left ?? 0
    const bTop = bbox.top?.value ?? layer.top ?? 0
    const bRight = bbox.right?.value ?? layer.right ?? 0
    const bBottom = bbox.bottom?.value ?? layer.bottom ?? 0
    shapeLeft = bLeft * scale
    shapeTop = bTop * scale
    shapeWidth = (bRight - bLeft) * scale
    shapeHeight = (bBottom - bTop) * scale
  } else {
    shapeLeft = x   // already scaled by caller
    shapeTop = y    // already scaled by caller
    shapeWidth = ((layer.right ?? 0) - (layer.left ?? 0)) * scale
    shapeHeight = ((layer.bottom ?? 0) - (layer.top ?? 0)) * scale
  }

  if (shapeWidth <= 0 || shapeHeight <= 0) return null

  // ── Fill ──
  let fill = '#cccccc'
  const vectorFill = (layer as any).vectorFill
  if (vectorFill) {
    if (vectorFill.type === 'color' && vectorFill.color) {
      const c = vectorFill.color as Record<string, number>
      if ('r' in c && 'g' in c && 'b' in c) {
        fill = rgbToHex(c.r, c.g, c.b)
      }
    } else if (vectorFill.type === 'gradient' || vectorFill.type === 'pattern') {
      // Can't represent these natively — fall back to raster
      return null
    }
  }

  // ── Stroke ──
  let stroke: string | undefined
  let strokeWidth = 0
  const vStroke = (layer as any).vectorStroke
  if (vStroke?.strokeEnabled) {
    strokeWidth = (vStroke.lineWidth?.value ?? 0) * scale
    if (strokeWidth > 0 && vStroke.content?.type === 'color' && vStroke.content.color) {
      const sc = vStroke.content.color as Record<string, number>
      if ('r' in sc && 'g' in sc && 'b' in sc) {
        stroke = rgbToHex(sc.r, sc.g, sc.b)
      }
    }
  }

  const baseProps = {
    left: shapeLeft,
    top: shapeTop,
    opacity,
    originX: 'left' as const,
    originY: 'top' as const,
    selectable: true,
    fill,
    stroke: stroke ?? undefined,
    strokeWidth: stroke ? strokeWidth : 0,
  }

  let shapeObj: any = null

  switch (shapeType) {
    case 1: // Rectangle
      shapeObj = new fabricModule.Rect({
        ...baseProps,
        width: shapeWidth,
        height: shapeHeight,
      })
      break

    case 2: { // Rounded Rectangle
      let rx = 0
      const radii = descriptor.keyOriginRRectRadii
      if (radii) {
        const tr = radii.topRight?.value ?? 0
        const tl = radii.topLeft?.value ?? 0
        const bl = radii.bottomLeft?.value ?? 0
        const br = radii.bottomRight?.value ?? 0
        rx = ((tr + tl + bl + br) / 4) * scale
      }
      shapeObj = new fabricModule.Rect({
        ...baseProps,
        width: shapeWidth,
        height: shapeHeight,
        rx,
        ry: rx,
      })
      break
    }

    case 5: // Ellipse
      shapeObj = new fabricModule.Ellipse({
        ...baseProps,
        rx: shapeWidth / 2,
        ry: shapeHeight / 2,
      })
      break

    default:
      // Unsupported shape type (line, polygon, custom path, …)
      return null
  }

  if (shapeObj) {
    ;(shapeObj as any).customName = layer.name || 'Shape'
    ;(shapeObj as any).id = crypto.randomUUID()
  }

  return shapeObj
}

/**
 * Convert a PSD layer's canvas element to a Fabric Image and add to canvas.
 */
async function addCanvasAsImage(
  layerCanvas: HTMLCanvasElement,
  fabricCanvas: FabricCanvas,
  fabricModule: typeof import('fabric'),
  x: number,
  y: number,
  name: string,
  opacity = 1,
  scale = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dataUrl = layerCanvas.toDataURL('image/png')
    const imgEl = new Image()
    imgEl.crossOrigin = 'anonymous'
    imgEl.onload = () => {
      const fabricImg = new fabricModule.FabricImage(imgEl, {
        left: x,
        top: y,
        opacity,
        scaleX: scale,
        scaleY: scale,
        originX: 'left',
        originY: 'top',
        selectable: true,
      })
      ;(fabricImg as any).customName = name
      ;(fabricImg as any).id = crypto.randomUUID()
      fabricCanvas.add(fabricImg)
      resolve()
    }
    imgEl.onerror = (err) => reject(new Error(`Failed to load layer image: ${name}`))
    imgEl.src = dataUrl
  })
}

/**
 * Get PSD file info without importing to canvas (preview).
 */
export async function previewPsd(file: File): Promise<{
  width: number
  height: number
  layers: Array<{ name: string; type: 'text' | 'image' | 'group'; visible: boolean }>
}> {
  const { readPsd } = await import('ag-psd')
  const buffer = await file.arrayBuffer()
  const psd: Psd = readPsd(new Uint8Array(buffer) as any, {
    skipThumbnail: true,
    skipCompositeImageData: true,
    skipLayerImageData: true,
  })

  const layers: Array<{ name: string; type: 'text' | 'image' | 'group'; visible: boolean }> = []

  function collectLayers(Layers: Layer[]) {
    for (const layer of Layers) {
      if (layer.children && layer.children.length > 0) {
        layers.push({
          name: layer.name || 'Group',
          type: 'group',
          visible: !layer.hidden,
        })
        collectLayers(layer.children)
      } else if (layer.text) {
        layers.push({
          name: layer.name || 'Text',
          type: 'text',
          visible: !layer.hidden,
        })
      } else {
        layers.push({
          name: layer.name || 'Layer',
          type: 'image',
          visible: !layer.hidden,
        })
      }
    }
  }

  if (psd.children) collectLayers(psd.children)

  return { width: psd.width, height: psd.height, layers }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)))
    return clamped.toString(16).padStart(2, '0')
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
