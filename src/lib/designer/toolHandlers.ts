// ===========================================================================
// Designer – Tool handlers
//
// Each tool exposes:  activate(ctx)  → returns a cleanup function
// The cleanup removes all listeners / state that the tool added.
//
// All tool creation logic goes through Fabric mouse events so that
// boundary enforcement (object:added clamping) picks it up automatically.
// ===========================================================================

import type { Canvas as FabricCanvas, FabricObject } from 'fabric'
import type { ToolId } from '@/stores/designer/toolStore'
import { useToolStore, TOOL_CURSORS } from '@/stores/designer/toolStore'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { activateCropTool } from '@/lib/designer/cropTool'
import {
  ZOOM_MIN,
  ZOOM_MAX,
} from '@/lib/designer/canvasWorkspace'
import { v4 as uuid } from 'uuid'

// ---------------------------------------------------------------------------
// Context passed to every tool handler
// ---------------------------------------------------------------------------
export interface ToolContext {
  canvas: FabricCanvas
  /** Design-space width & height */
  dw: number
  dh: number
  /** The wrapper DOM element around the HTML canvas */
  wrapper: HTMLDivElement
  /** Async import of fabric */
  getFabric: () => Promise<typeof import('fabric')>
}

type Cleanup = () => void

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a scene-space point from a Fabric mouse event */
function scenePoint(canvas: FabricCanvas, opt: any): { x: number; y: number } {
  const ptr = canvas.getScenePoint(opt.e as MouseEvent)
  return { x: ptr.x, y: ptr.y }
}

/**
 * Auto-fit a Textbox's width to its text content (single-line fit).
 * Measures the natural text width and applies it so the box doesn't
 * wrap prematurely.  A small padding is added for the cursor.
 */
export function autoFitTextboxWidth(obj: FabricObject): void {
  const tb = obj as any
  if (tb.type !== 'textbox') return
  // measureLine returns {width, height} for the given line index
  let maxW = 0
  const lineCount: number = tb._textLines?.length ?? 1
  for (let i = 0; i < lineCount; i++) {
    const lw: number = tb.measureLine(i).width ?? 0
    if (lw > maxW) maxW = lw
  }
  // Add a small cursor-padding so the caret isn't clipped
  tb.set('width', Math.max(maxW + 4, 20))
  tb.setCoords()
}

// ---------------------------------------------------------------------------
// MOVE tool  — default selection / manipulation
// ---------------------------------------------------------------------------
function activateMoveTool(ctx: ToolContext): Cleanup {
  const { canvas, wrapper } = ctx
  canvas.selection = true
  canvas.defaultCursor = 'default'
  canvas.hoverCursor = 'move'
  wrapper.style.cursor = ''

  // Ctrl/Cmd drag → duplicate-on-move
  let cloneInProgress = false
  const onDown = async (opt: any) => {
    const e = opt.e as MouseEvent
    if (!(e.ctrlKey || e.metaKey)) return
    const active = canvas.getActiveObject()
    if (!active || cloneInProgress) return
    cloneInProgress = true
    try {
      useDocumentStore.getState().pushUndo('duplicate-drag')
      const cloned = await active.clone()
      cloned.set({
        left: active.left ?? 0,
        top: active.top ?? 0,
      })
      ;(cloned as any).id = uuid()
      canvas.add(cloned)
      // The original stays put; user drags the clone
      canvas.setActiveObject(cloned)
      useDocumentStore.getState().markDirty()
      useDocumentStore.getState().refreshLayers()
    } finally {
      cloneInProgress = false
    }
  }

  canvas.on('mouse:down', onDown)
  return () => {
    canvas.off('mouse:down', onDown)
  }
}

// ---------------------------------------------------------------------------
// TEXT tool
// ---------------------------------------------------------------------------
function activateTextTool(ctx: ToolContext): Cleanup {
  const { canvas, wrapper, dw, dh, getFabric } = ctx
  canvas.selection = false
  canvas.defaultCursor = 'text'
  canvas.hoverCursor = 'text'
  wrapper.style.cursor = 'text'

  const onDown = async (opt: any) => {
    const target = canvas.findTarget(opt.e as MouseEvent) as unknown as FabricObject | undefined
    if (target && (target.type === 'textbox' || target.type === 'i-text' || target.type === 'text')) {
      // Enter edit mode on existing text
      canvas.setActiveObject(target)
      ;(target as any).enterEditing?.()
      return
    }

    const fabric = await getFabric()
    const pt = scenePoint(canvas, opt)
    const tb = new fabric.Textbox('Type here', {
      left: Math.max(0, Math.min(pt.x, dw - 100)),
      top: Math.max(0, Math.min(pt.y, dh - 40)),
      width: 1, // temporary — auto-fit below
      fontSize: 24,
      fontFamily: 'Inter',
      fill: '#000000',
      editable: true,
      splitByGrapheme: false,
    })
    // Auto-fit width to the initial text content
    autoFitTextboxWidth(tb)
    ;(tb as any).id = uuid()
    ;(tb as any).customName = 'Text'
    useDocumentStore.getState().pushUndo('add-text')
    canvas.add(tb)
    canvas.setActiveObject(tb)
    ;(tb as any).enterEditing?.()
    tb.selectAll()

    useDocumentStore.getState().markDirty()
    useDocumentStore.getState().refreshLayers()

    // Switch back to move after placing
    useToolStore.getState().setActiveTool('move')
  }

  canvas.on('mouse:down', onDown)
  return () => {
    canvas.off('mouse:down', onDown)
    canvas.selection = true
    wrapper.style.cursor = ''
  }
}

// ---------------------------------------------------------------------------
// SHAPE tools (rectangle, circle, line)
// ---------------------------------------------------------------------------
function activateShapeTool(
  ctx: ToolContext,
  shape: 'rectangle' | 'circle' | 'line',
): Cleanup {
  const { canvas, wrapper, getFabric } = ctx
  canvas.selection = false
  canvas.defaultCursor = 'crosshair'
  canvas.hoverCursor = 'crosshair'
  wrapper.style.cursor = 'crosshair'

  let isDrawing = false
  let startX = 0
  let startY = 0
  let currentObj: FabricObject | null = null
  let shiftHeld = false
  let altHeld = false
  let preShapeSnapshot: string | null = null

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') shiftHeld = true
    if (e.key === 'Alt') altHeld = true
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') shiftHeld = false
    if (e.key === 'Alt') altHeld = false
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  const onDown = async (opt: any) => {
    if (isDrawing) return
    isDrawing = true
    preShapeSnapshot = JSON.stringify((canvas as any).toJSON(['id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath']))
    const fabric = await getFabric()
    const pt = scenePoint(canvas, opt)
    startX = pt.x
    startY = pt.y

    if (shape === 'rectangle') {
      currentObj = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: '#4f46e5',
        strokeWidth: 0,
        originX: 'left',
        originY: 'top',
      })
    } else if (shape === 'circle') {
      currentObj = new fabric.Ellipse({
        left: startX,
        top: startY,
        rx: 0,
        ry: 0,
        fill: '#4f46e5',
        strokeWidth: 0,
        originX: 'left',
        originY: 'top',
      })
    } else {
      currentObj = new fabric.Line([startX, startY, startX, startY], {
        stroke: '#4f46e5',
        strokeWidth: 2,
        selectable: true,
      })
    }
    ;(currentObj as any).id = uuid()
    ;(currentObj as any).customName =
      shape === 'rectangle' ? 'Rectangle' : shape === 'circle' ? 'Ellipse' : 'Line'
    ;(currentObj as any).evented = false
    canvas.add(currentObj)
  }

  const onMove = (opt: any) => {
    if (!isDrawing || !currentObj) return
    const pt = scenePoint(canvas, opt)
    let w = pt.x - startX
    let h = pt.y - startY

    if (shape === 'line') {
      if (shiftHeld) {
        // Constrain to 45° increments
        const dx = pt.x - startX
        const dy = pt.y - startY
        const angle = Math.atan2(dy, dx)
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
        const dist = Math.sqrt(dx * dx + dy * dy)
        ;(currentObj as any).set({
          x2: startX + Math.cos(snapAngle) * dist,
          y2: startY + Math.sin(snapAngle) * dist,
        })
      } else {
        ;(currentObj as any).set({ x2: pt.x, y2: pt.y })
      }
      currentObj.setCoords()
      canvas.renderAll()
      return
    }

    if (shiftHeld) {
      const side = Math.max(Math.abs(w), Math.abs(h))
      w = side * Math.sign(w || 1)
      h = side * Math.sign(h || 1)
    }

    let left = startX
    let top = startY

    if (altHeld) {
      left = startX - Math.abs(w)
      top = startY - Math.abs(h)
      w = Math.abs(w) * 2
      h = Math.abs(h) * 2
    } else {
      if (w < 0) { left = startX + w; w = -w }
      if (h < 0) { top = startY + h; h = -h }
    }

    if (shape === 'circle') {
      ;(currentObj as any).set({ left, top, rx: w / 2, ry: h / 2 })
    } else {
      currentObj.set({ left, top, width: w, height: h })
    }
    currentObj.setCoords()
    canvas.renderAll()
  }

  const onUp = () => {
    if (!isDrawing || !currentObj) return
    isDrawing = false
    ;(currentObj as any).evented = true
    currentObj.setCoords()

    // Remove if too small (accidental click)
    const bb = currentObj.getBoundingRect()
    if (bb.width < 3 && bb.height < 3) {
      canvas.remove(currentObj)
    } else {
      canvas.setActiveObject(currentObj)
      if (preShapeSnapshot) {
        useDocumentStore.getState().pushUndoSnapshot('add-shape', preShapeSnapshot)
      } else {
        useDocumentStore.getState().pushUndo('add-shape')
      }
      useDocumentStore.getState().markDirty()
      useDocumentStore.getState().refreshLayers()
    }
    currentObj = null
    preShapeSnapshot = null

    // Return to move tool after shape creation
    useToolStore.getState().setActiveTool('move')
  }

  canvas.on('mouse:down', onDown)
  canvas.on('mouse:move', onMove)
  canvas.on('mouse:up', onUp)

  return () => {
    canvas.off('mouse:down', onDown)
    canvas.off('mouse:move', onMove)
    canvas.off('mouse:up', onUp)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvas.selection = true
    wrapper.style.cursor = ''
    // If we were mid-draw, clean up
    if (currentObj) {
      canvas.remove(currentObj)
      currentObj = null
    }
  }
}

// ---------------------------------------------------------------------------
// FRAME tool (image mask container)
// ---------------------------------------------------------------------------
function activateFrameTool(ctx: ToolContext): Cleanup {
  const { canvas, wrapper, getFabric } = ctx
  canvas.selection = false
  canvas.defaultCursor = 'crosshair'
  canvas.hoverCursor = 'crosshair'
  wrapper.style.cursor = 'crosshair'

  let isDrawing = false
  let startX = 0
  let startY = 0
  let frameRect: FabricObject | null = null
  let preFrameSnapshot: string | null = null

  const onDown = async (opt: any) => {
    if (isDrawing) return
    isDrawing = true
    preFrameSnapshot = JSON.stringify((canvas as any).toJSON(['id', 'customName', 'selectable', 'visible', 'groupId', '_storagePath']))
    const fabric = await getFabric()
    const pt = scenePoint(canvas, opt)
    startX = pt.x
    startY = pt.y
    frameRect = new fabric.Rect({
      left: startX,
      top: startY,
      width: 0,
      height: 0,
      fill: 'rgba(200,200,200,0.3)',
      stroke: '#666666',
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      rx: 0,
      ry: 0,
    })
    ;(frameRect as any).id = uuid()
    ;(frameRect as any).customName = 'Frame'
    ;(frameRect as any).isFrame = true
    ;(frameRect as any).evented = false
    canvas.add(frameRect)
  }

  const onMove = (opt: any) => {
    if (!isDrawing || !frameRect) return
    const pt = scenePoint(canvas, opt)
    let w = pt.x - startX
    let h = pt.y - startY
    let left = startX
    let top = startY
    if (w < 0) { left = startX + w; w = -w }
    if (h < 0) { top = startY + h; h = -h }
    frameRect.set({ left, top, width: w, height: h })
    frameRect.setCoords()
    canvas.renderAll()
  }

  const onUp = () => {
    if (!isDrawing || !frameRect) return
    isDrawing = false
    ;(frameRect as any).evented = true
    frameRect.setCoords()
    const bb = frameRect.getBoundingRect()
    if (bb.width < 5 && bb.height < 5) {
      canvas.remove(frameRect)
    } else {
      canvas.setActiveObject(frameRect)
      if (preFrameSnapshot) {
        useDocumentStore.getState().pushUndoSnapshot('add-frame', preFrameSnapshot)
      } else {
        useDocumentStore.getState().pushUndo('add-frame')
      }
      useDocumentStore.getState().markDirty()
      useDocumentStore.getState().refreshLayers()
    }
    frameRect = null
    preFrameSnapshot = null
    useToolStore.getState().setActiveTool('move')
  }

  canvas.on('mouse:down', onDown)
  canvas.on('mouse:move', onMove)
  canvas.on('mouse:up', onUp)

  return () => {
    canvas.off('mouse:down', onDown)
    canvas.off('mouse:move', onMove)
    canvas.off('mouse:up', onUp)
    canvas.selection = true
    wrapper.style.cursor = ''
    if (frameRect) { canvas.remove(frameRect); frameRect = null }
  }
}

// ---------------------------------------------------------------------------
// CROP tool — see cropTool.ts
// ---------------------------------------------------------------------------
// Imported from '@/lib/designer/cropTool'

// ---------------------------------------------------------------------------
// EYEDROPPER tool
// ---------------------------------------------------------------------------
function activateEyedropperTool(ctx: ToolContext): Cleanup {
  const { canvas, wrapper } = ctx
  canvas.selection = false
  canvas.defaultCursor = 'crosshair'
  wrapper.style.cursor = 'crosshair'

  const onClick = (opt: any) => {
    const e = opt.e as MouseEvent
    // Read pixel from the underlying HTML canvas
    const htmlCanvas = canvas.getElement() as HTMLCanvasElement
    const rect = htmlCanvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pixel = htmlCanvas.getContext('2d')?.getImageData(
      Math.round(x * (htmlCanvas.width / rect.width)),
      Math.round(y * (htmlCanvas.height / rect.height)),
      1, 1,
    )?.data
    if (!pixel) return

    const hex = `#${[pixel[0], pixel[1], pixel[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`

    // Apply to selected object
    const active = canvas.getActiveObject()
    if (active) {
      useDocumentStore.getState().pushUndo('eyedropper')
      const prop = active.type === 'textbox' || active.type === 'i-text' || active.type === 'text'
        ? 'fill'
        : 'fill'
      active.set(prop, hex)
      canvas.renderAll()
      useDocumentStore.getState().markDirty()
    }

    // Return to previous tool
    useToolStore.getState().restorePreviousTool()
  }

  canvas.on('mouse:down', onClick)
  return () => {
    canvas.off('mouse:down', onClick)
    canvas.selection = true
    wrapper.style.cursor = ''
  }
}

// ---------------------------------------------------------------------------
// HAND (pan) tool
// ---------------------------------------------------------------------------
function activateHandTool(ctx: ToolContext): Cleanup {
  const { canvas, wrapper } = ctx
  canvas.selection = false
  canvas.defaultCursor = 'grab'
  canvas.hoverCursor = 'grab'
  wrapper.style.cursor = 'grab'

  let isPanning = false
  let lastX = 0
  let lastY = 0

  const onDown = (opt: any) => {
    isPanning = true
    const e = opt.e as MouseEvent
    lastX = e.clientX
    lastY = e.clientY
    wrapper.style.cursor = 'grabbing'
    canvas.defaultCursor = 'grabbing'
  }

  const onMove = (opt: any) => {
    if (!isPanning) return
    const e = opt.e as MouseEvent
    const vpt = canvas.viewportTransform!.slice() as number[]
    vpt[4] += e.clientX - lastX
    vpt[5] += e.clientY - lastY
    canvas.setViewportTransform(vpt as any)
    lastX = e.clientX
    lastY = e.clientY
  }

  const onUp = () => {
    isPanning = false
    wrapper.style.cursor = 'grab'
    canvas.defaultCursor = 'grab'
  }

  canvas.on('mouse:down', onDown)
  canvas.on('mouse:move', onMove)
  canvas.on('mouse:up', onUp)

  return () => {
    canvas.off('mouse:down', onDown)
    canvas.off('mouse:move', onMove)
    canvas.off('mouse:up', onUp)
    canvas.selection = true
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    wrapper.style.cursor = ''
  }
}

// ---------------------------------------------------------------------------
// ZOOM tool
// ---------------------------------------------------------------------------
function activateZoomTool(ctx: ToolContext): Cleanup {
  const { canvas, wrapper, getFabric } = ctx
  canvas.selection = false
  wrapper.style.cursor = 'zoom-in'
  canvas.defaultCursor = 'zoom-in'

  let boxStart: { x: number; y: number } | null = null
  let boxRect: FabricObject | null = null
  let altHeld = false

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      altHeld = true
      wrapper.style.cursor = 'zoom-out'
      canvas.defaultCursor = 'zoom-out'
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      altHeld = false
      wrapper.style.cursor = 'zoom-in'
      canvas.defaultCursor = 'zoom-in'
    }
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  const onDown = async (opt: any) => {
    const e = opt.e as MouseEvent
    // Simple click → zoom in/out
    // Also start a drag-box
    boxStart = { x: e.offsetX, y: e.offsetY }

    const fabric = await getFabric()
    // Create selection-style rectangle
    boxRect = new fabric.Rect({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      fill: 'rgba(59,130,246,0.1)',
      stroke: 'rgba(59,130,246,0.5)',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })
    ;(boxRect as any)._isZoomBox = true
    canvas.add(boxRect)
  }

  const onMove = (opt: any) => {
    if (!boxStart || !boxRect) return
    const e = opt.e as MouseEvent
    const vpt = canvas.viewportTransform!
    const x1 = (boxStart.x - vpt[4]) / vpt[0]
    const y1 = (boxStart.y - vpt[5]) / vpt[3]
    const x2 = (e.offsetX - vpt[4]) / vpt[0]
    const y2 = (e.offsetY - vpt[5]) / vpt[3]
    const left = Math.min(x1, x2)
    const top = Math.min(y1, y2)
    const w = Math.abs(x2 - x1)
    const h = Math.abs(y2 - y1)
    boxRect.set({ left, top, width: w, height: h })
    boxRect.setCoords()
    canvas.renderAll()
  }

  const onUp = (opt: any) => {
    if (!boxStart) return
    const e = opt.e as MouseEvent
    const dx = Math.abs(e.offsetX - boxStart.x)
    const dy = Math.abs(e.offsetY - boxStart.y)

    // Remove the zoom box
    if (boxRect) {
      canvas.remove(boxRect)
      boxRect = null
    }

    if (dx < 5 && dy < 5) {
      // Simple click → step zoom
      const factor = altHeld ? 0.7 : 1.4
      let newZoom = canvas.getZoom() * factor
      newZoom = Math.min(Math.max(newZoom, ZOOM_MIN), ZOOM_MAX)
      const point = (fabricModule as any)
        ? new (fabricModule as any).Point(e.offsetX, e.offsetY)
        : { x: e.offsetX, y: e.offsetY }
      canvas.zoomToPoint(point, newZoom)
      useDocumentStore.getState().setZoom(newZoom)
    } else {
      // Drag-box zoom: compute the box in screen coords and zoom to fit it
      const vpt = canvas.viewportTransform!
      const sceneX1 = (boxStart.x - vpt[4]) / vpt[0]
      const sceneY1 = (boxStart.y - vpt[5]) / vpt[3]
      const sceneX2 = (e.offsetX - vpt[4]) / vpt[0]
      const sceneY2 = (e.offsetY - vpt[5]) / vpt[3]
      const boxSceneW = Math.abs(sceneX2 - sceneX1)
      const boxSceneH = Math.abs(sceneY2 - sceneY1)
      const boxCX = (sceneX1 + sceneX2) / 2
      const boxCY = (sceneY1 + sceneY2) / 2

      const cw = canvas.width ?? 800
      const ch = canvas.height ?? 600
      let newZoom = Math.min(cw / boxSceneW, ch / boxSceneH) * 0.9
      newZoom = Math.min(Math.max(newZoom, ZOOM_MIN), ZOOM_MAX)

      const panX = cw / 2 - boxCX * newZoom
      const panY = ch / 2 - boxCY * newZoom
      canvas.setViewportTransform([newZoom, 0, 0, newZoom, panX, panY])
      useDocumentStore.getState().setZoom(newZoom)
    }

    boxStart = null
  }

  canvas.on('mouse:down', onDown)
  canvas.on('mouse:move', onMove)
  canvas.on('mouse:up', onUp)

  // Keep a ref to fabricModule for Point usage
  let fabricModule: typeof import('fabric') | null = null
  getFabric().then((m) => { fabricModule = m })

  return () => {
    canvas.off('mouse:down', onDown)
    canvas.off('mouse:move', onMove)
    canvas.off('mouse:up', onUp)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvas.selection = true
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    wrapper.style.cursor = ''
    if (boxRect) { canvas.remove(boxRect); boxRect = null }
  }
}

// ---------------------------------------------------------------------------
// Dispatcher — called by CanvasStage when activeTool changes
// ---------------------------------------------------------------------------
const TOOL_ACTIVATORS: Record<ToolId, (ctx: ToolContext) => Cleanup> = {
  move: activateMoveTool,
  text: activateTextTool,
  rectangle: (ctx) => activateShapeTool(ctx, 'rectangle'),
  circle: (ctx) => activateShapeTool(ctx, 'circle'),
  line: (ctx) => activateShapeTool(ctx, 'line'),
  frame: activateFrameTool,
  crop: activateCropTool,
  eyedropper: activateEyedropperTool,
  hand: activateHandTool,
  zoom: activateZoomTool,
}

export function activateTool(tool: ToolId, ctx: ToolContext): Cleanup {
  const activator = TOOL_ACTIVATORS[tool]
  if (!activator) return () => {}
  return activator(ctx)
}
