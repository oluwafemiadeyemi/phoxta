'use client'

// ===========================================================================
// LeftRail — icon tabs on the far left
// Uses: shadcn Tooltip, Button
// ===========================================================================
import React, { useState } from 'react'
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
import { useIsMobile } from './useIsMobile'
import MobilePopupPanel from './MobilePopupPanel'
import TemplatesPanel from './panels/TemplatesPanel'
import ImagesPanel from './panels/ImagesPanel'
import BrandKitPanel from './panels/BrandKitPanel'
import ProjectsPanel from './panels/ProjectsPanel'
import PsdImportPanel from './panels/PsdImportPanel'

const TABS: { id: LeftRailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate className="h-5 w-5" /> },
  { id: 'images', label: 'Images', icon: <Image className="h-5 w-5" /> },
  { id: 'brand', label: 'Brand', icon: <Palette className="h-5 w-5" /> },
  { id: 'projects', label: 'Projects', icon: <FolderOpen className="h-5 w-5" /> },
  { id: 'psd', label: 'PSD', icon: <FileImage className="h-5 w-5" /> },
]

function getMobilePanel(tab: LeftRailTab) {
  switch (tab) {
    case 'templates': return <TemplatesPanel />
    case 'images': return <ImagesPanel />
    case 'brand': return <BrandKitPanel />
    case 'projects': return <ProjectsPanel />
    case 'psd': return <PsdImportPanel />
    default: return null
  }
}

export default function LeftRail() {
  const { leftRailTab, setLeftRailTab, leftPanelOpen, setLeftPanelOpen, layerPanelOpen, setLayerPanelOpen } = useUIStore()
  const isMobile = useIsMobile()
  const [mobilePopupTab, setMobilePopupTab] = useState<LeftRailTab | null>(null)
  const [popupAnchorY, setPopupAnchorY] = useState<number>(0)

  const handleClick = (tab: LeftRailTab, e?: React.MouseEvent) => {
    if (isMobile) {
      // Position popup beside the clicked button
      if (e) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setPopupAnchorY(rect.top)
      }
      setMobilePopupTab(prev => (prev === tab ? null : tab))
      return
    }
    if (leftRailTab === tab && leftPanelOpen) {
      setLeftPanelOpen(false)
    } else {
      setLeftRailTab(tab)
      setLeftPanelOpen(true)
    }
  }

  const activeTab = TABS.find(t => t.id === mobilePopupTab)

  return (
    <>
    <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-1 shrink-0 z-20">
      {TABS.map((t) => {
        const isActive = leftRailTab === t.id && leftPanelOpen
        return (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="icon"
                onClick={(e) => handleClick(t.id, e)}
                className={`w-11 h-11 flex flex-col gap-0.5 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}
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
            className={`w-11 h-11 flex flex-col gap-0.5 mb-2 ${layerPanelOpen ? 'text-gray-900' : 'text-gray-500'}`}
          >
            <Layers className="h-5 w-5" />
            <span className="text-[9px] leading-none">Layers</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right"><p>Layers</p></TooltipContent>
      </Tooltip>
    </div>

    {/* Mobile bottom-sheet popup for left panel content */}
    {isMobile && (
      <MobilePopupPanel
        open={mobilePopupTab !== null}
        onClose={() => setMobilePopupTab(null)}
        title={activeTab?.label ?? ''}
        icon={activeTab ? React.cloneElement(activeTab.icon as React.ReactElement<{ className?: string }>, { className: 'h-4 w-4' }) : undefined}
        placement="beside-left"
        anchorY={popupAnchorY}
      >
        {mobilePopupTab && getMobilePanel(mobilePopupTab)}
      </MobilePopupPanel>
    )}
    </>
  )
}
