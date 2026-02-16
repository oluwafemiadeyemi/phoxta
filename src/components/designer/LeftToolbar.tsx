'use client'

// ===========================================================================
// LeftToolbar — vertical tool icons on the far-left edge of the canvas area.
// One tool is active at a time; clicking switches the active tool.
// Keyboard shortcuts: V T R O L F C I H Z
// ===========================================================================

import React from 'react'
import { useToolStore, TOOL_SHORTCUTS } from '@/stores/designer/toolStore'
import type { ToolId } from '@/stores/designer/toolStore'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MousePointer2,
  Type,
  Square,
  Circle,
  Minus,
  Frame,
  Crop,
  Pipette,
  Hand,
  Search,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------
const TOOLS: { id: ToolId; label: string; shortcut: string; icon: React.ReactNode }[] = [
  { id: 'move',        label: 'Move',        shortcut: 'V', icon: <MousePointer2 className="h-4 w-4" /> },
  { id: 'text',        label: 'Text',        shortcut: 'T', icon: <Type className="h-4 w-4" /> },
  { id: 'rectangle',   label: 'Rectangle',   shortcut: 'R', icon: <Square className="h-4 w-4" /> },
  { id: 'circle',      label: 'Circle',      shortcut: 'O', icon: <Circle className="h-4 w-4" /> },
  { id: 'line',        label: 'Line',        shortcut: 'L', icon: <Minus className="h-4 w-4" /> },
  { id: 'frame',       label: 'Frame',       shortcut: 'F', icon: <Frame className="h-4 w-4" /> },
  { id: 'crop',        label: 'Crop',        shortcut: 'C', icon: <Crop className="h-4 w-4" /> },
  { id: 'eyedropper',  label: 'Eyedropper',  shortcut: 'I', icon: <Pipette className="h-4 w-4" /> },
  { id: 'hand',        label: 'Hand',        shortcut: 'H', icon: <Hand className="h-4 w-4" /> },
  { id: 'zoom',        label: 'Zoom',        shortcut: 'Z', icon: <Search className="h-4 w-4" /> },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LeftToolbar() {
  const { activeTool, setActiveTool } = useToolStore()

  // Keyboard shortcuts are handled in CanvasStage (global keydown)
  // so this component only renders the toolbar UI.

  return (
    <div className="w-10 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-0.5 shrink-0 z-20 shadow-lg md:shadow-none rounded-r-lg md:rounded-none h-full">
      {TOOLS.map((t) => {
        const isActive = activeTool === t.id
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setActiveTool(t.id)}
                className={`w-8 h-8 ${isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t.label} <span className="ml-1 text-muted-foreground text-[10px]">{t.shortcut}</span></p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
