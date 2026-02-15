'use client'

// ===========================================================================
// ElementsPanel — shapes, lines, frames
// Uses: shadcn Button, Tooltip, ScrollArea
// ===========================================================================
import React from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import type { ShapeType } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Square,
  Circle,
  Triangle,
  Minus,
  Pentagon,
  Star,
  Frame,
} from 'lucide-react'

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  { type: 'rect', label: 'Rectangle', icon: <Square className="h-6 w-6" /> },
  { type: 'circle', label: 'Circle', icon: <Circle className="h-6 w-6" /> },
  { type: 'triangle', label: 'Triangle', icon: <Triangle className="h-6 w-6" /> },
  { type: 'line', label: 'Line', icon: <Minus className="h-6 w-6" /> },
  { type: 'polygon', label: 'Pentagon', icon: <Pentagon className="h-6 w-6" /> },
  { type: 'star', label: 'Star', icon: <Star className="h-6 w-6" /> },
]

export default function ElementsPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)

  const addShape = async (type: ShapeType) => {
    if (!canvas) return
    const fabricModule = await import('fabric')
    pushUndo(`Add ${type}`)

    let obj: import('fabric').FabricObject
    const common = { left: 150, top: 150, fill: '#4F46E5', stroke: '#3730A3', strokeWidth: 0 }

    switch (type) {
      case 'rect':
        obj = new fabricModule.Rect({ ...common, width: 200, height: 150, rx: 4, ry: 4 })
        break
      case 'circle':
        obj = new fabricModule.Circle({ ...common, radius: 80 })
        break
      case 'triangle':
        obj = new fabricModule.Triangle({ ...common, width: 180, height: 160 })
        break
      case 'line':
        obj = new fabricModule.Line([100, 200, 350, 100], { stroke: '#4F46E5', strokeWidth: 3, fill: '' })
        break
      case 'polygon': {
        const sides = 5, r = 80, cx = 200, cy = 200
        const pts = Array.from({ length: sides }, (_, i) => {
          const angle = (2 * Math.PI * i) / sides - Math.PI / 2
          return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
        })
        obj = new fabricModule.Polygon(pts, { ...common })
        break
      }
      case 'star': {
        const points = 5, outerR = 80, innerR = 35
        const cx = 200, cy = 200
        const pts: { x: number; y: number }[] = []
        for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR
          const angle = (Math.PI * i) / points - Math.PI / 2
          pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
        }
        obj = new fabricModule.Polygon(pts, { ...common })
        break
      }
      default:
        return
    }

    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.requestRenderAll()
    markDirty()
  }

  const addFrame = async () => {
    if (!canvas) return
    const fabricModule = await import('fabric')
    pushUndo('Add frame')
    const frame = new fabricModule.Rect({
      left: 120, top: 120, width: 250, height: 250,
      fill: '#F3F4F6', stroke: '#D1D5DB', strokeWidth: 1, rx: 8, ry: 8,
    })
    ;(frame as any).customName = 'Frame'
    ;(frame as any).isFrame = true
    canvas.add(frame)
    canvas.setActiveObject(frame)
    canvas.requestRenderAll()
    markDirty()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/[0.04]">
        <h3 className="text-xs font-semibold text-zinc-200">Elements</h3>
      </div>

      <ScrollArea className="flex-1 p-3">
        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide">Shapes</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {SHAPES.map(s => (
            <Tooltip key={s.type}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="aspect-square h-auto flex flex-col gap-1 p-2"
                  onClick={() => addShape(s.type)}
                >
                  {s.icon}
                  <span className="text-[9px]">{s.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Add {s.label}</p></TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator className="my-3" />

        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide">Containers</p>
        <Button variant="outline" className="w-full justify-start text-xs" onClick={addFrame}>
          <Frame className="mr-2 h-4 w-4" />
          Frame
        </Button>
      </ScrollArea>
    </div>
  )
}
