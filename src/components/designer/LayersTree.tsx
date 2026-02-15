'use client'

// ===========================================================================
// LayersTree — drag-and-drop layer list with visibility, lock, reorder
// Uses: native HTML5 drag-and-drop, shadcn Button, Tooltip, ScrollArea
// ===========================================================================
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Type,
  Image,
  Box,
  Diamond,
  Layers,
  ChevronDown,
} from 'lucide-react'

export default function LayersTree() {
  const canvas = useDocumentStore(s => s.canvas)
  const layers = useDocumentStore(s => s.layers)
  const refreshLayers = useDocumentStore(s => s.refreshLayers)
  const activeObjectIds = useDocumentStore(s => s.activeObjectIds)
  const setActiveObjectIds = useDocumentStore(s => s.setActiveObjectIds)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)
  const { layerPanelOpen } = useUIStore()

  // Collapsible state (body expanded by default)
  const [collapsed, setCollapsed] = useState(false)

  // Drag-and-drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)

  useEffect(() => {
    if (canvas) refreshLayers()
  }, [canvas, refreshLayers])

  // --- Actions ---
  const selectObject = useCallback((id: string) => {
    if (!canvas) return
    const obj = canvas.getObjects().find((o: any) => o.id === id)
    if (obj) {
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
      // Ensure store updates even if Fabric doesn't fire selection event
      setActiveObjectIds([id])
    }
  }, [canvas, setActiveObjectIds])

  const toggleVisibility = useCallback((id: string) => {
    if (!canvas) return
    const obj = canvas.getObjects().find((o: any) => o.id === id)
    if (!obj) return
    pushUndo('Toggle visibility')
    obj.set('visible', !obj.visible)
    canvas.requestRenderAll()
    markDirty()
    refreshLayers()
  }, [canvas, pushUndo, markDirty, refreshLayers])

  const toggleLock = useCallback((id: string) => {
    if (!canvas) return
    const obj = canvas.getObjects().find((o: any) => o.id === id)
    if (!obj) return
    pushUndo('Toggle lock')
    const locked = !obj.selectable
    obj.set({ selectable: !locked, evented: !locked })
    canvas.requestRenderAll()
    markDirty()
    refreshLayers()
  }, [canvas, pushUndo, markDirty, refreshLayers])

  // --- Drag handlers ---
  // `layers` is stored top-first (index 0 = highest z-index on canvas).
  // Canvas `_objects` is bottom-first (index 0 = lowest z-index).
  // Conversion: canvasIdx = totalObjects - 1 - displayIdx

  const handleDragStart = useCallback((displayIdx: number, e: React.DragEvent) => {
    setDragIdx(displayIdx)
    e.dataTransfer.effectAllowed = 'move'
    // Use a minimal ghost so the native drag preview doesn't obscure the list
    const ghost = document.createElement('div')
    ghost.style.position = 'absolute'
    ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }, [])

  const handleDragOver = useCallback((displayIdx: number, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIdx !== null && displayIdx !== dragIdx) {
      setDropIdx(displayIdx)
    }
  }, [dragIdx])

  const handleDragEnd = useCallback(() => {
    setDragIdx(null)
    setDropIdx(null)
  }, [])

  const handleDrop = useCallback((toDisplayIdx: number, e: React.DragEvent) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === toDisplayIdx || !canvas) {
      setDragIdx(null)
      setDropIdx(null)
      return
    }

    const total = canvas.getObjects().length
    // Convert display indices to canvas z-order indices
    const fromCanvasIdx = total - 1 - dragIdx
    const toCanvasIdx = total - 1 - toDisplayIdx

    const objects = canvas.getObjects()
    const obj = objects[fromCanvasIdx]
    if (!obj) {
      setDragIdx(null)
      setDropIdx(null)
      return
    }

    pushUndo('Reorder layers')

    // Splice the object from current position to new position in the
    // internal _objects array (standard Fabric.js z-order approach)
    const arr = (canvas as any)._objects as any[]
    arr.splice(fromCanvasIdx, 1)
    arr.splice(toCanvasIdx, 0, obj)

    canvas.requestRenderAll()
    markDirty()
    refreshLayers()

    setDragIdx(null)
    setDropIdx(null)
  }, [canvas, dragIdx, pushUndo, markDirty, refreshLayers])

  // --- Helpers ---
  const getLayerIcon = (type: string) => {
    if (type === 'textbox' || type === 'i-text' || type === 'text') return <Type className="h-3.5 w-3.5" />
    if (type === 'image') return <Image className="h-3.5 w-3.5" />
    if (type === 'group') return <Box className="h-3.5 w-3.5" />
    return <Diamond className="h-3.5 w-3.5" />
  }

  if (!layerPanelOpen) return null

  return (
    <div className="w-full md:w-56 bg-[#18181b] flex flex-col overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="p-3 border-b border-white/[0.04] flex items-center justify-between w-full hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-200">Layers</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{layers.length}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </div>
      </button>

      {!collapsed && (
        <ScrollArea className="flex-1">
        {layers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center mt-8">No objects on canvas</p>
        ) : (
          <div className="py-1">
            {layers.map((layer, displayIdx) => {
              const isActive = activeObjectIds.includes(layer.id)
              const isDragging = dragIdx === displayIdx
              const isDropTarget = dropIdx === displayIdx

              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(displayIdx, e)}
                  onDragOver={(e) => handleDragOver(displayIdx, e)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(displayIdx, e)}
                  onClick={() => selectObject(layer.id)}
                  className={`
                    flex items-center gap-1 px-1.5 py-1.5 cursor-pointer transition-all text-xs select-none
                    ${isActive ? 'bg-blue-500/15 text-blue-400' : 'text-zinc-400 hover:bg-white/[0.04]'}
                    ${isDragging ? 'opacity-40' : ''}
                    ${isDropTarget && dragIdx !== null
                      ? (displayIdx < dragIdx
                        ? 'border-t-2 border-t-blue-400'
                        : 'border-b-2 border-b-blue-400')
                      : 'border-t-2 border-t-transparent border-b-2 border-b-transparent'}
                  `}
                >
                  {/* Drag handle */}
                  <span className="shrink-0 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>

                  {/* Icon */}
                  <span className="shrink-0 text-muted-foreground">{getLayerIcon(layer.type)}</span>

                  {/* Name */}
                  <span className="flex-1 truncate text-[11px]">{layer.name || layer.type}</span>

                  {/* Visibility & lock controls */}
                  <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-xs" className="h-5 w-5"
                          onClick={e => { e.stopPropagation(); toggleVisibility(layer.id) }}>
                          {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-destructive" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p>{layer.visible ? 'Hide' : 'Show'}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-xs" className="h-5 w-5"
                          onClick={e => { e.stopPropagation(); toggleLock(layer.id) }}>
                          {layer.locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p>{layer.locked ? 'Unlock' : 'Lock'}</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
      )}
    </div>
  )
}
