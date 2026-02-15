'use client'

// ===========================================================================
// LeftRail — icon tabs on the far left
// Uses: shadcn Tooltip, Button
// ===========================================================================
import React from 'react'
import { useUIStore } from '@/stores/designer/uiStore'
import type { LeftRailTab } from '@/stores/designer/uiStore'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutTemplate,
  Image,
  Palette,
  FolderOpen,
  FileImage,
  Layers,
} from 'lucide-react'

const TABS: { id: LeftRailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate className="h-5 w-5" /> },
  { id: 'images', label: 'Images', icon: <Image className="h-5 w-5" /> },
  { id: 'brand', label: 'Brand', icon: <Palette className="h-5 w-5" /> },
  { id: 'projects', label: 'Projects', icon: <FolderOpen className="h-5 w-5" /> },
  { id: 'psd', label: 'PSD', icon: <FileImage className="h-5 w-5" /> },
]

export default function LeftRail() {
  const { leftRailTab, setLeftRailTab, leftPanelOpen, setLeftPanelOpen, layerPanelOpen, setLayerPanelOpen } = useUIStore()

  const handleClick = (tab: LeftRailTab) => {
    if (leftRailTab === tab && leftPanelOpen) {
      setLeftPanelOpen(false)
    } else {
      setLeftRailTab(tab)
      setLeftPanelOpen(true)
    }
  }

  return (
    <div className="w-14 bg-[#18181b] border-r border-white/[0.06] flex flex-col items-center py-2 gap-1 shrink-0 z-20">
      {TABS.map((t) => {
        const isActive = leftRailTab === t.id && leftPanelOpen
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => handleClick(t.id)}
                className={`w-11 h-11 flex flex-col gap-0.5 ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`}
              >
                {t.icon}
                <span className="text-[9px] leading-none">{t.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right"><p>{t.label}</p></TooltipContent>
          </Tooltip>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Layers toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={layerPanelOpen ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setLayerPanelOpen(!layerPanelOpen)}
            className={`w-11 h-11 flex flex-col gap-0.5 mb-2 ${layerPanelOpen ? 'text-zinc-100' : 'text-zinc-500'}`}
          >
            <Layers className="h-5 w-5" />
            <span className="text-[9px] leading-none">Layers</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right"><p>Layers</p></TooltipContent>
      </Tooltip>
    </div>
  )
}
