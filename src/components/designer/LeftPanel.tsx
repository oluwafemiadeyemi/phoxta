'use client'

// ===========================================================================
// LeftPanel — switches content based on active leftRailTab
// Uses: shadcn ScrollArea (via panel children)
// ===========================================================================
import { useUIStore } from '@/stores/designer/uiStore'
import TemplatesPanel from './panels/TemplatesPanel'
import ImagesPanel from './panels/ImagesPanel'
import BrandKitPanel from './panels/BrandKitPanel'
import ProjectsPanel from './panels/ProjectsPanel'
import PsdImportPanel from './panels/PsdImportPanel'

export default function LeftPanel() {
  const { leftRailTab, leftPanelOpen } = useUIStore()

  if (!leftPanelOpen) return null

  const panel = (() => {
    switch (leftRailTab) {
      case 'templates': return <TemplatesPanel />
      case 'images': return <ImagesPanel />
      case 'brand': return <BrandKitPanel />
      case 'projects': return <ProjectsPanel />
      case 'psd': return <PsdImportPanel />
      default: return null
    }
  })()

  // Hidden on mobile — mobile uses the popup from LeftRail instead
  return (
    <div className="hidden md:flex w-72 bg-[#18181b] border-r border-white/[0.06] flex-col overflow-hidden shrink-0 z-10">
      {panel}
    </div>
  )
}
