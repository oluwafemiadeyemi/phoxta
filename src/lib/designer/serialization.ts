// ===========================================================================
// Designer – serialization helpers
// ===========================================================================

import type { Canvas as FabricCanvas } from 'fabric'

const EXTRA_PROPS = ['id', 'customName', 'selectable', 'visible', 'groupId', 'frameClipId', '_storagePath']

/** Serialize canvas to JSON with custom properties preserved */
export function serializeCanvas(canvas: FabricCanvas): Record<string, unknown> {
  return (canvas as any).toJSON(EXTRA_PROPS)
}

/** Serialize canvas to compact JSON string */
export function serializeCanvasString(canvas: FabricCanvas): string {
  return JSON.stringify(serializeCanvas(canvas))
}

/** Load JSON into canvas */
export async function deserializeCanvas(
  canvas: FabricCanvas,
  json: Record<string, unknown> | string
): Promise<void> {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  await canvas.loadFromJSON(data)
  canvas.renderAll()
}

/** Generate a thumbnail data URL from canvas */
export function generateThumbnail(
  canvas: FabricCanvas,
  maxDim: number = 400
): string {
  const scale = maxDim / Math.max(canvas.width ?? 1, canvas.height ?? 1)
  return canvas.toDataURL({
    format: 'png',
    multiplier: Math.min(scale, 1),
  })
}
