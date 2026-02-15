'use client'

// ===========================================================================
// MobileToolbar — horizontal tool bar at the bottom of the canvas on mobile.
// Replaces the vertical LeftToolbar for touch-friendly interaction.
// ===========================================================================
import React from 'react'
import { useToolStore } from '@/stores/designer/toolStore'
import type { ToolId } from '@/stores/designer/toolStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
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
  LayoutTemplate,
  Image,
  Palette,
  Layers,
} from 'lucide-react'

const TOOLS: { id: ToolId; label: string; icon: React.ReactNode }[] = [
  { id: 'move',        label: 'Move',        icon: <MousePointer2 className="h-4 w-4" /> },
  { id: 'text',        label: 'Text',        icon: <Type className="h-4 w-4" /> },
  { id: 'rectangle',   label: 'Rect',        icon: <Square className="h-4 w-4" /> },
  { id: 'circle',      label: 'Circle',      icon: <Circle className="h-4 w-4" /> },
  { id: 'line',        label: 'Line',        icon: <Minus className="h-4 w-4" /> },
  { id: 'frame',       label: 'Frame',       icon: <Frame className="h-4 w-4" /> },
  { id: 'crop',        label: 'Crop',        icon: <Crop className="h-4 w-4" /> },
  { id: 'hand',        label: 'Pan',         icon: <Hand className="h-4 w-4" /> },
]

export default function MobileToolbar() {
  const { activeTool, setActiveTool } = useToolStore()
  const {
    mobileLeftDrawerOpen, setMobileLeftDrawerOpen,
    mobileRightDrawerOpen, setMobileRightDrawerOpen,
    leftRailTab, setLeftRailTab, setLeftPanelOpen,
  } = useUIStore()

  const openLeftPanel = (tab: 'templates' | 'images') => {
    setLeftRailTab(tab)
    setLeftPanelOpen(true)
    setMobileLeftDrawerOpen(true)
  }

  return (
    <div className="h-14 bg-[#18181b] border-t border-white/[0.06] flex items-center shrink-0 z-30 md:hidden">
      <ScrollArea className="w-full h-full">
        <div className="flex items-center gap-1 px-2 h-14 min-w-max">
          {/* Quick access: Templates & Images */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openLeftPanel('templates')}
            className="w-10 h-10 flex flex-col gap-0.5 text-zinc-500 shrink-0"
          >
            <LayoutTemplate className="h-4 w-4" />
            <span className="text-[8px] leading-none">Tmpl</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openLeftPanel('images')}
            className="w-10 h-10 flex flex-col gap-0.5 text-zinc-500 shrink-0"
          >
            <Image className="h-4 w-4" />
            <span className="text-[8px] leading-none">Images</span>
          </Button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/[0.08] mx-1 shrink-0" />

          {/* Drawing tools */}
          {TOOLS.map((t) => {
            const isActive = activeTool === t.id
            return (
              <Button
                key={t.id}
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setActiveTool(t.id)}
                className={`w-10 h-10 flex flex-col gap-0.5 shrink-0 ${isActive ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500'}`}
              >
                {t.icon}
                <span className="text-[8px] leading-none">{t.label}</span>
              </Button>
            )
          })}

          {/* Divider */}
          <div className="w-px h-6 bg-white/[0.08] mx-1 shrink-0" />

          {/* Layers/Properties toggle */}
          <Button
            variant={mobileRightDrawerOpen ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setMobileRightDrawerOpen(!mobileRightDrawerOpen)}
            className="w-10 h-10 flex flex-col gap-0.5 text-zinc-500 shrink-0"
          >
            <Layers className="h-4 w-4" />
            <span className="text-[8px] leading-none">Props</span>
          </Button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
