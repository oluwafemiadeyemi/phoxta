// ===========================================================================
// Designer – Crop tool
//
// Non-destructive image crop using Fabric.js Image's built-in crop
// properties: cropX, cropY, width, height.  These are natively serialised
// by toJSON / loadFromJSON, so persistence is automatic.
//
// Architecture:
//   1. When crop mode activates on an Image, we snapshot its current
//      crop state and render an interactive crop-frame overlay.
//   2. The user can drag the 8 edge/corner handles to resize the crop
//      frame, or drag inside the frame to reposition the image under it.
//   3. Enter / Apply → commit.  Esc / Cancel → revert to snapshot.
//   4. The overlay objects are `excludeFromExport: true` and cleaned up
//      on every exit.
//
// All coordinates are in the image's LOCAL (un-scaled, un-rotated) space.
// The overlay group is placed on the canvas at the image's scene
// position/scale/rotation so it tracks perfectly.
// ===========================================================================

import type { Canvas as FabricCanvas, FabricObject } from 'fabric'
import type { ToolContext } from './toolHandlers'
import { useToolStore } from '@/stores/designer/toolStore'
import { useDocumentStore } from '@/stores/designer/documentStore'

type Cleanup = () => void

// ---------------------------------------------------------------------------
// Crop-state snapshot (for cancel / revert)
// ---------------------------------------------------------------------------
interface CropSnapshot {
  cropX: number
  cropY: number
  width: number
  height: number
}

function snapshotImage(img: any): CropSnapshot {
  return {
    cropX: img.cropX ?? 0,
    cropY: img.cropY ?? 0,
    width: img.width ?? img.getOriginalSize?.().width ?? 0,
    height: img.height ?? img.getOriginalSize?.().height ?? 0,
  }
}

function restoreImage(img: any, snap: CropSnapshot): void {
  img.set({
    cropX: snap.cropX,
    cropY: snap.cropY,
    width: snap.width,
    height: snap.height,
  })
  img.setCoords()
}

// ---------------------------------------------------------------------------
// Minimum crop dimensions (in image-local px, before scaling)
// ---------------------------------------------------------------------------
const MIN_CROP = 20

// ---------------------------------------------------------------------------
// Handle identifiers
// ---------------------------------------------------------------------------
type HandleId =
  | 'tl' | 'tr' | 'bl' | 'br'  // corners
  | 'tm' | 'bm' | 'ml' | 'mr'  // edges

// ---------------------------------------------------------------------------
// activateCropTool
// ---------------------------------------------------------------------------
export function activateCropTool(ctx: ToolContext): Cleanup {
  const { canvas, wrapper, getFabric } = ctx

  // ── Guard: must have a selected Image ──
  const active = canvas.getActiveObject()
  if (!active || (active as any).type !== 'image') {
    // Not an image – flash back to move
    setTimeout(() => useToolStore.getState().setActiveTool('move'), 0)
    return () => { wrapper.style.cursor = '' }
  }

  const img = active as any // fabric.Image
  const snap = snapshotImage(img)

  // Original image pixel dimensions (the source bitmap, never changes)
  const origEl = img.getElement?.() as HTMLImageElement | undefined
  const naturalW = origEl?.naturalWidth ?? img._originalElement?.naturalWidth ?? img.width
  const naturalH = origEl?.naturalHeight ?? img._originalElement?.naturalHeight ?? img.height

  // Current crop state in image-pixel space
  let cropX = img.cropX ?? 0
  let cropY = img.cropY ?? 0
  let cropW = img.width ?? naturalW
  let cropH = img.height ?? naturalH

  // ── Overlay objects (cleaned up on exit) ──
  const overlayObjects: FabricObject[] = []
  let frameRect: FabricObject | null = null
  let dimRects: FabricObject[] = []
  let handleRects: FabricObject[] = []
  let ready = false

  // Disable normal selection while cropping
  canvas.selection = false
  canvas.discardActiveObject()
  canvas.renderAll()

  // Make every other object non-interactive
  const otherObjects = canvas.getObjects().filter((o) => o !== img)
  const savedEventedState = new Map<FabricObject, boolean>()
  otherObjects.forEach((o) => {
    savedEventedState.set(o, (o as any).evented !== false)
    ;(o as any).evented = false
    ;(o as any).selectable = false
  })
  // Make the image itself non-selectable (we manage it manually)
  img.selectable = false
  img.evented = false

  // ── Async setup: create overlay objects ──
  let disposed = false

  const setup = async () => {
    const fabric = await getFabric()
    if (disposed) return

    const HANDLE_SIZE = 10
    const HALF = HANDLE_SIZE / 2

    // Utility: create the 4 dim rectangles that cover the non-cropped area
    // surrounding the crop frame.  All coords in scene space.
    const buildDimRects = () => {
      // Image scene transform
      const imgLeft = img.left ?? 0
      const imgTop = img.top ?? 0
      const sx = img.scaleX ?? 1
      const sy = img.scaleY ?? 1

      // Crop frame in scene coordinates
      const fLeft = imgLeft + cropX * sx
      const fTop = imgTop + cropY * sy
      const fW = cropW * sx
      const fH = cropH * sy

      // Image total bounds in scene
      const iW = naturalW * sx
      const iH = naturalH * sy

      // 4 dim rects: top, bottom, left, right
      const rects = [
        // Top strip
        { left: imgLeft, top: imgTop, width: iW, height: fTop - imgTop },
        // Bottom strip
        { left: imgLeft, top: fTop + fH, width: iW, height: (imgTop + iH) - (fTop + fH) },
        // Left strip
        { left: imgLeft, top: fTop, width: fLeft - imgLeft, height: fH },
        // Right strip
        { left: fLeft + fW, top: fTop, width: (imgLeft + iW) - (fLeft + fW), height: fH },
      ]

      return rects.map((r) =>
        new fabric.Rect({
          left: r.left,
          top: r.top,
          width: Math.max(0, r.width),
          height: Math.max(0, r.height),
          fill: 'rgba(0,0,0,0.45)',
          selectable: false,
          evented: false,
          excludeFromExport: true,
          hoverCursor: 'default',
        }) as unknown as FabricObject,
      )
    }

    // Utility: build the crop frame (dashed border)
    const buildFrame = () => {
      const imgLeft = img.left ?? 0
      const imgTop = img.top ?? 0
      const sx = img.scaleX ?? 1
      const sy = img.scaleY ?? 1

      return new fabric.Rect({
        left: imgLeft + cropX * sx,
        top: imgTop + cropY * sy,
        width: cropW * sx,
        height: cropH * sy,
        fill: 'transparent',
        stroke: '#ffffff',
        strokeWidth: 1.5,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
        excludeFromExport: true,
      }) as unknown as FabricObject
    }

    // Utility: build 8 resize handles
    const buildHandles = (): FabricObject[] => {
      const imgLeft = img.left ?? 0
      const imgTop = img.top ?? 0
      const sx = img.scaleX ?? 1
      const sy = img.scaleY ?? 1

      const fLeft = imgLeft + cropX * sx
      const fTop = imgTop + cropY * sy
      const fW = cropW * sx
      const fH = cropH * sy

      // Handle positions: { id, x, y, cursor }
      const positions: { id: HandleId; x: number; y: number; cursor: string }[] = [
        { id: 'tl', x: fLeft, y: fTop, cursor: 'nwse-resize' },
        { id: 'tr', x: fLeft + fW, y: fTop, cursor: 'nesw-resize' },
        { id: 'bl', x: fLeft, y: fTop + fH, cursor: 'nesw-resize' },
        { id: 'br', x: fLeft + fW, y: fTop + fH, cursor: 'nwse-resize' },
        { id: 'tm', x: fLeft + fW / 2, y: fTop, cursor: 'ns-resize' },
        { id: 'bm', x: fLeft + fW / 2, y: fTop + fH, cursor: 'ns-resize' },
        { id: 'ml', x: fLeft, y: fTop + fH / 2, cursor: 'ew-resize' },
        { id: 'mr', x: fLeft + fW, y: fTop + fH / 2, cursor: 'ew-resize' },
      ]

      return positions.map((p) => {
        const h = new fabric.Rect({
          left: p.x - HALF,
          top: p.y - HALF,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          fill: '#ffffff',
          stroke: '#1e88e5',
          strokeWidth: 1.5,
          selectable: false,
          evented: false,
          excludeFromExport: true,
          hoverCursor: p.cursor,
        }) as unknown as FabricObject
        ;(h as any)._cropHandleId = p.id
        ;(h as any)._cropCursor = p.cursor
        return h
      })
    }

    // ── Add overlays ──
    const addOverlays = () => {
      dimRects = buildDimRects()
      frameRect = buildFrame()
      handleRects = buildHandles()
      const all = [...dimRects, frameRect!, ...handleRects]
      all.forEach((o) => {
        ;(o as any)._isCropOverlay = true
        canvas.add(o)
        overlayObjects.push(o)
      })
      canvas.renderAll()
    }

    const removeOverlays = () => {
      overlayObjects.forEach((o) => canvas.remove(o))
      overlayObjects.length = 0
      dimRects = []
      frameRect = null
      handleRects = []
    }

    const refreshOverlays = () => {
      removeOverlays()
      addOverlays()
    }

    addOverlays()
    ready = true

    // ── Mouse interaction state ──
    let dragging: 'handle' | 'pan' | null = null
    let dragHandleId: HandleId | null = null
    let dragStartX = 0
    let dragStartY = 0
    let dragStartCropX = 0
    let dragStartCropY = 0
    let dragStartCropW = 0
    let dragStartCropH = 0
    let shiftHeld = false

    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeld = true
    }
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeld = false
    }
    window.addEventListener('keydown', keyDownHandler)
    window.addEventListener('keyup', keyUpHandler)

    // ── Apply current crop values to the image ──
    const applyCropToImage = () => {
      img.set({
        cropX: Math.round(cropX),
        cropY: Math.round(cropY),
        width: Math.round(cropW),
        height: Math.round(cropH),
      })
      img.setCoords()
    }

    // ── Hit-test: is the mouse over a handle or inside the frame? ──
    const hitTest = (
      sceneX: number,
      sceneY: number,
    ): { type: 'handle'; id: HandleId } | { type: 'frame' } | null => {
      const sx = img.scaleX ?? 1
      const sy = img.scaleY ?? 1
      const imgLeft = img.left ?? 0
      const imgTop = img.top ?? 0
      const fLeft = imgLeft + cropX * sx
      const fTop = imgTop + cropY * sy
      const fW = cropW * sx
      const fH = cropH * sy

      // Check handles first (bigger hit region for usability)
      const HIT = 8
      const positions: { id: HandleId; x: number; y: number }[] = [
        { id: 'tl', x: fLeft, y: fTop },
        { id: 'tr', x: fLeft + fW, y: fTop },
        { id: 'bl', x: fLeft, y: fTop + fH },
        { id: 'br', x: fLeft + fW, y: fTop + fH },
        { id: 'tm', x: fLeft + fW / 2, y: fTop },
        { id: 'bm', x: fLeft + fW / 2, y: fTop + fH },
        { id: 'ml', x: fLeft, y: fTop + fH / 2 },
        { id: 'mr', x: fLeft + fW, y: fTop + fH / 2 },
      ]
      for (const p of positions) {
        if (Math.abs(sceneX - p.x) <= HIT && Math.abs(sceneY - p.y) <= HIT) {
          return { type: 'handle', id: p.id }
        }
      }

      // Check inside frame → pan image
      if (
        sceneX >= fLeft && sceneX <= fLeft + fW &&
        sceneY >= fTop && sceneY <= fTop + fH
      ) {
        return { type: 'frame' }
      }

      return null
    }

    // ── Mouse handlers ──
    const onMouseDown = (opt: any) => {
      const e = opt.e as MouseEvent
      // Middle-click is reserved for panning — pass through
      if (e.button === 1) return

      const ptr = canvas.getScenePoint(e)
      const hit = hitTest(ptr.x, ptr.y)
      if (!hit) {
        // Click outside crop frame → commit
        commitCrop()
        return
      }

      dragStartX = ptr.x
      dragStartY = ptr.y
      dragStartCropX = cropX
      dragStartCropY = cropY
      dragStartCropW = cropW
      dragStartCropH = cropH

      if (hit.type === 'handle') {
        dragging = 'handle'
        dragHandleId = hit.id
      } else {
        dragging = 'pan'
        wrapper.style.cursor = 'move'
      }
    }

    const onMouseMove = (opt: any) => {
      if (!dragging) {
        // Update cursor based on hover
        const e = opt.e as MouseEvent
        const ptr = canvas.getScenePoint(e)
        const hit = hitTest(ptr.x, ptr.y)
        if (hit?.type === 'handle') {
          const handle = handleRects.find((h) => (h as any)._cropHandleId === hit.id)
          wrapper.style.cursor = (handle as any)?._cropCursor ?? 'crosshair'
        } else if (hit?.type === 'frame') {
          wrapper.style.cursor = 'move'
        } else {
          wrapper.style.cursor = 'crosshair'
        }
        return
      }

      const e = opt.e as MouseEvent
      const ptr = canvas.getScenePoint(e)
      const sx = img.scaleX ?? 1
      const sy = img.scaleY ?? 1

      // Delta in image-local pixels
      const dx = (ptr.x - dragStartX) / sx
      const dy = (ptr.y - dragStartY) / sy

      if (dragging === 'pan') {
        // Move the image under the crop frame: move cropX/cropY opposite
        let newCropX = dragStartCropX - dx
        let newCropY = dragStartCropY - dy
        // Clamp so crop frame stays within image bounds
        newCropX = Math.max(0, Math.min(newCropX, naturalW - cropW))
        newCropY = Math.max(0, Math.min(newCropY, naturalH - cropH))
        cropX = newCropX
        cropY = newCropY
      } else if (dragging === 'handle') {
        // Resize the crop frame
        let newX = dragStartCropX
        let newY = dragStartCropY
        let newW = dragStartCropW
        let newH = dragStartCropH

        switch (dragHandleId) {
          case 'br':
            newW = dragStartCropW + dx
            newH = dragStartCropH + dy
            break
          case 'bl':
            newX = dragStartCropX + dx
            newW = dragStartCropW - dx
            newH = dragStartCropH + dy
            break
          case 'tr':
            newY = dragStartCropY + dy
            newW = dragStartCropW + dx
            newH = dragStartCropH - dy
            break
          case 'tl':
            newX = dragStartCropX + dx
            newY = dragStartCropY + dy
            newW = dragStartCropW - dx
            newH = dragStartCropH - dy
            break
          case 'mr':
            newW = dragStartCropW + dx
            break
          case 'ml':
            newX = dragStartCropX + dx
            newW = dragStartCropW - dx
            break
          case 'bm':
            newH = dragStartCropH + dy
            break
          case 'tm':
            newY = dragStartCropY + dy
            newH = dragStartCropH - dy
            break
        }

        // Shift → maintain aspect ratio
        if (shiftHeld) {
          const origAspect = dragStartCropW / dragStartCropH
          // For corner handles, constrain to aspect
          if (['tl', 'tr', 'bl', 'br'].includes(dragHandleId!)) {
            const candidateH = newW / origAspect
            if (candidateH <= naturalH) {
              newH = candidateH
            } else {
              newH = naturalH
              newW = newH * origAspect
            }
          }
        }

        // Enforce min size
        if (newW < MIN_CROP) {
          if (newX !== dragStartCropX) newX = dragStartCropX + dragStartCropW - MIN_CROP
          newW = MIN_CROP
        }
        if (newH < MIN_CROP) {
          if (newY !== dragStartCropY) newY = dragStartCropY + dragStartCropH - MIN_CROP
          newH = MIN_CROP
        }

        // Clamp to image bounds
        if (newX < 0) { newW += newX; newX = 0 }
        if (newY < 0) { newH += newY; newY = 0 }
        if (newX + newW > naturalW) newW = naturalW - newX
        if (newY + newH > naturalH) newH = naturalH - newY

        // Final min-size guard
        if (newW < MIN_CROP) newW = MIN_CROP
        if (newH < MIN_CROP) newH = MIN_CROP

        cropX = newX
        cropY = newY
        cropW = newW
        cropH = newH
      }

      applyCropToImage()
      refreshOverlays()
    }

    const onMouseUp = () => {
      if (dragging) {
        dragging = null
        dragHandleId = null
      }
    }

    // ── Commit / Cancel ──
    const commitCrop = () => {
      applyCropToImage()
      useDocumentStore.getState().pushUndo('crop')
      useDocumentStore.getState().markDirty()
      useDocumentStore.getState().refreshLayers()
      exitCropMode()
    }

    const cancelCrop = () => {
      restoreImage(img, snap)
      canvas.renderAll()
      exitCropMode()
    }

    const exitCropMode = () => {
      useToolStore.getState().setActiveTool('move')
    }

    // ── Keyboard: Enter = commit, Escape = cancel ──
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        commitCrop()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancelCrop()
      }
    }
    window.addEventListener('keydown', onKey, true) // capture phase

    // ── Hook up canvas events ──
    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)

    // ── Cleanup function (stored for the outer cleanup) ──
    cleanupFn = () => {
      disposed = true
      removeOverlays()

      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:move', onMouseMove)
      canvas.off('mouse:up', onMouseUp)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keydown', keyDownHandler)
      window.removeEventListener('keyup', keyUpHandler)

      // Restore interactivity on other objects
      otherObjects.forEach((o) => {
        const was = savedEventedState.get(o) ?? true
        ;(o as any).evented = was
        ;(o as any).selectable = was
      })
      img.selectable = true
      img.evented = true

      canvas.selection = true
      canvas.setActiveObject(img)
      canvas.renderAll()
      wrapper.style.cursor = ''
      canvas.defaultCursor = 'default'
    }
  }

  // Variable that the async setup populates with the real cleanup
  let cleanupFn: Cleanup | null = null

  setup()

  // The outer cleanup is called when the tool switches away
  return () => {
    disposed = true
    if (cleanupFn) {
      cleanupFn()
    } else {
      // setup() hasn't finished yet — restore basic state
      otherObjects.forEach((o) => {
        const was = savedEventedState.get(o) ?? true
        ;(o as any).evented = was
        ;(o as any).selectable = was
      })
      img.selectable = true
      img.evented = true
      canvas.selection = true
      wrapper.style.cursor = ''
    }
  }
}
