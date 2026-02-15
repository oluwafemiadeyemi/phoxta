'use client'

// ===========================================================================
// TopBar — file menu, undo/redo, project name, save status, export, share
// Uses: shadcn Button, Input, DropdownMenu, Tooltip, Badge
// ===========================================================================
import { useState } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import type { ExportFormat } from '@/types/designer'
import {
  exportPageToDataURL,
  exportPageToSVG,
  downloadDataUrl as downloadDataUrlUtil,
  downloadBlob as downloadBlobUtil,
} from '@/lib/designer/exportPage'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Download,
  Share2,
  FileText,
  FileImage,
  Copy,
  Table,
  History,
  ChevronDown,
  PanelRight,
  Sparkles,
  Menu,
} from 'lucide-react'
import { useIsMobile } from './useIsMobile'

interface TopBarProps {
  projectId: string
}

export default function TopBar({ projectId }: TopBarProps) {
  const {
    project, setProject, undoStack, redoStack, undo, redo,
    isDirty, isSaving, lastSavedAt, canvas, pages, currentPageId,
  } = useDocumentStore()
  const { setExportModalOpen, setShareModalOpen, setCsvModalOpen, setAiDesignModalOpen, setLeftRailTab, rightPanelOpen, setRightPanelOpen } = useUIStore()
  const isMobile = useIsMobile()

  const handleNameBlur = async (newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || !project || trimmed === project.name) return
    setProject({ ...project, name: trimmed })
    await fetch(`/api/designer/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
  }

  const handleSave = async () => {
    const save = (window as any).__designerSave
    if (typeof save === 'function') await save()
  }

  const handleDuplicate = async () => {
    if (!project) return
    try {
      const res = await fetch('/api/designer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${project.name} (Copy)`,
          width: project.width,
          height: project.height,
          template_source_id: project.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        window.open(`/app/designer/${data.id}`, '_blank')
      }
    } catch { /* silent */ }
  }

  const handleExport = async (format: ExportFormat) => {
    if (!canvas) return

    const dw = project?.width ?? 1080
    const dh = project?.height ?? 1080
    const name = project?.name || 'design'

    if (format === 'pdf') {
      const { default: jsPDF } = await import('jspdf')
      const pngData = exportPageToDataURL(canvas, {
        designWidth: dw, designHeight: dh, format: 'png', multiplier: 2,
      })
      const orientation = dw > dh ? 'landscape' : 'portrait'
      const pdf = new jsPDF({ orientation, unit: 'px', format: [dw, dh] })
      pdf.addImage(pngData, 'PNG', 0, 0, dw, dh)
      const dataUrl = pdf.output('datauristring')
      downloadDataUrlUtil(dataUrl, `${name}.pdf`)
      return
    }

    if (format === 'svg') {
      const svgStr = exportPageToSVG(canvas, dw, dh)
      const blob = new Blob([svgStr], { type: 'image/svg+xml' })
      downloadBlobUtil(blob, `${name}.svg`)
      return
    }

    const imgFormat = format === 'jpg' ? 'jpeg' : 'png'
    const dataUrl = exportPageToDataURL(canvas, {
      designWidth: dw,
      designHeight: dh,
      format: imgFormat as 'png' | 'jpeg',
      quality: format === 'jpg' ? 0.92 : undefined,
      multiplier: 2,
    })

    try {
      await fetch(`/api/designer/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, format, fileName: name }),
      })
    } catch { /* silent */ }

    downloadDataUrlUtil(dataUrl, `${name}.${format === 'jpg' ? 'jpeg' : format}`)
  }

  const savedLabel = isSaving
    ? 'Saving…'
    : isDirty
      ? 'Unsaved'
      : lastSavedAt
        ? `Saved ${formatTime(new Date(lastSavedAt))}`
        : '—'

  return (
    <div className="h-12 bg-[#18181b] border-b border-white/[0.06] flex items-center px-2 md:px-3 gap-1 md:gap-2 shrink-0 z-30">
      {/* Back */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-xs" asChild>
            <Link href="/app/designer">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Back to projects</p></TooltipContent>
      </Tooltip>

      {/* File menu — hidden on mobile, merged into overflow */}
      {!isMobile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs font-medium text-zinc-400 hover:text-zinc-200">
              File
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={handleSave} className="text-xs">
              <Save className="mr-2 h-3.5 w-3.5" /> Save
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate} className="text-xs">
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLeftRailTab('psd')} className="text-xs">
              <FileImage className="mr-2 h-3.5 w-3.5" /> Import PSD
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCsvModalOpen(true)} className="text-xs">
              <Table className="mr-2 h-3.5 w-3.5" /> Bulk Create (CSV)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-xs">
              <Link href={`/app/designer/${projectId}/versions`}>
                <History className="mr-2 h-3.5 w-3.5" /> Version history
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Project name */}
      <Input
        type="text"
        defaultValue={project?.name ?? 'Untitled'}
        key={project?.id}
        onBlur={(e) => handleNameBlur(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className={`text-sm font-medium text-zinc-200 bg-transparent border-transparent hover:border-white/[0.08] focus:border-white/[0.15] h-8 ${isMobile ? 'max-w-[100px]' : 'max-w-[200px]'}`}
      />

      {/* Save status */}
      <Badge variant={isDirty ? 'secondary' : 'outline'} className={`text-[10px] font-normal shrink-0 ${isDirty ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500'}`}>
        {isMobile ? (isDirty ? '●' : '✓') : savedLabel}
      </Badge>

      <div className="flex-1" />

      {/* Undo / Redo — always visible */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={undo} disabled={undoStack.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Undo</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={redo} disabled={redoStack.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>Redo</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Desktop: full toolbar */}
      {!isMobile && (
        <>
          {/* AI Design */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setAiDesignModalOpen(true)} className="text-xs">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI Design
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Generate a design with AI</p></TooltipContent>
          </Tooltip>

          {/* Save */}
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!isDirty || isSaving} className="text-xs">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleExport('png')} className="text-xs">PNG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('jpg')} className="text-xs">JPG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('svg')} className="text-xs">SVG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="text-xs">PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setExportModalOpen(true)} className="text-xs">
                Advanced export…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share */}
          <Button variant="outline" size="sm" onClick={() => setShareModalOpen(true)} className="text-xs">
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>

          {/* Properties toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={rightPanelOpen ? 'secondary' : 'ghost'}
                size="icon-xs"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>{rightPanelOpen ? 'Hide' : 'Show'} properties</p></TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Mobile: overflow menu with all secondary actions */}
      {isMobile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={handleSave} disabled={!isDirty || isSaving} className="text-xs">
              <Save className="mr-2 h-3.5 w-3.5" /> {isSaving ? 'Saving…' : 'Save'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAiDesignModalOpen(true)} className="text-xs">
              <Sparkles className="mr-2 h-3.5 w-3.5" /> AI Design
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport('png')} className="text-xs">
              <Download className="mr-2 h-3.5 w-3.5" /> Export PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('jpg')} className="text-xs">
              <Download className="mr-2 h-3.5 w-3.5" /> Export JPG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportModalOpen(true)} className="text-xs">
              <Download className="mr-2 h-3.5 w-3.5" /> Advanced Export…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShareModalOpen(true)} className="text-xs">
              <Share2 className="mr-2 h-3.5 w-3.5" /> Share
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate} className="text-xs">
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(d: Date) {
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
