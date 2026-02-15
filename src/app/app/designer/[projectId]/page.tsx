'use client'

// ===========================================================================
// Designer Editor — assembles all components into the full editor view
// Uses: shadcn + Lucide icons for loading/error states
// ===========================================================================
import { useEffect, useState, use, useRef } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import TopBar from '@/components/designer/TopBar'
import LeftRail from '@/components/designer/LeftRail'
import LeftPanel from '@/components/designer/LeftPanel'
import RightPanel from '@/components/designer/RightPanel'
import CharacterPanel from '@/components/designer/CharacterPanel'
import AdjustmentsPanel from '@/components/designer/AdjustmentsPanel'
import LayersTree from '@/components/designer/LayersTree'
import PagesStrip from '@/components/designer/PagesStrip'
import CanvasStage from '@/components/designer/CanvasStage'
import LeftToolbar from '@/components/designer/LeftToolbar'
import ExportModal from '@/components/designer/modals/ExportModal'
import ShareModal from '@/components/designer/modals/ShareModal'
import CsvBulkModal from '@/components/designer/modals/CsvBulkModal'
import AiDesignModal from '@/components/designer/modals/AiDesignModal'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { DesignProject, DesignPage } from '@/types/designer'
import { retrievePendingPsd } from '@/lib/designer/psdTransfer'
import { importPsdToCanvas } from '@/lib/designer/psdImporter'
import { assemblePageOnCanvas } from '@/lib/designer/aiCanvasAssembler'
import type { AIDesignResponse } from '@/types/aiDesign'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default function DesignerEditorPage({ params }: PageProps) {
  const { projectId } = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const psdImportedRef = useRef(false)
  const aiDesignTriggeredRef = useRef(false)
  const [aiProgress, setAiProgress] = useState('')

  const {
    setProject, setPages, setCurrentPageId,
    pages, currentPageId, project,
    canvas, pushUndo, markDirty, refreshLayers,
  } = useDocumentStore()

  // Load project
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/designer/${projectId}`)
        if (!res.ok) {
          setError('Project not found')
          return
        }
        const data = await res.json()
        const proj = data.project ?? data // support both wrapped and flat shapes

        const project: DesignProject = {
          id: proj.id,
          user_id: proj.user_id,
          name: proj.name,
          width: proj.width,
          height: proj.height,
          preview_url: proj.preview_url,
          is_template: proj.is_template,
          template_source_id: proj.template_source_id,
          folder_id: proj.folder_id,
          deleted_at: proj.deleted_at,
          created_at: proj.created_at,
          updated_at: proj.updated_at,
        }

        setProject(project)

        const loadedPages: DesignPage[] = (data.pages || []).map((p: any) => ({
          id: p.id,
          project_id: p.project_id,
          page_index: p.page_index,
          width: p.width,
          height: p.height,
          background: p.background,
          fabric_json_path: p.fabric_json_path,
          preview_path: p.preview_path,
          created_at: p.created_at,
          fabricUrl: p.fabricUrl,
          previewUrl: p.previewUrl,
        }))

        setPages(loadedPages)
        if (loadedPages.length > 0) {
          setCurrentPageId(loadedPages[0].id)
        }
      } catch {
        setError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [projectId, setProject, setPages, setCurrentPageId])

  // Auto-import PSD when arriving from dashboard with ?importPsd= param
  useEffect(() => {
    if (!canvas || psdImportedRef.current) return

    const params = new URLSearchParams(window.location.search)
    const psdKey = params.get('importPsd')
    if (!psdKey) return

    psdImportedRef.current = true

    // Clean URL without reloading
    const cleanUrl = window.location.pathname
    window.history.replaceState({}, '', cleanUrl)

    // Retrieve PSD from IndexedDB and import
    retrievePendingPsd(psdKey).then(async (file) => {
      if (!file) {
        console.warn('PSD file not found in transfer store')
        return
      }
      try {
        const state = useDocumentStore.getState()
        const p = state.project
        const result = await importPsdToCanvas(file, canvas, {
          pushUndo,
          markDirty,
          refreshLayers,
          designWidth: p?.width,
          designHeight: p?.height,
          onResize: async (w, h) => {
            // Resize artboard on the canvas instance
            const resize = (canvas as any).__resizeArtboard
            if (typeof resize === 'function') resize(w, h)

            // Update project dimensions in DB
            try {
              await fetch(`/api/designer/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ width: w, height: h }),
              })
            } catch (e) {
              console.warn('[PSD Import] Failed to update project dimensions', e)
            }

            // Update store
            if (p) {
              useDocumentStore.getState().setProject({ ...p, width: w, height: h })
            }
            const pgId = state.currentPageId
            if (pgId) {
              useDocumentStore.getState().updatePage(pgId, { width: w, height: h })
            }
          },
        })
        console.log(`PSD imported: ${result.layerCount} layers`, result.errors)

        // Trigger an immediate save so the import persists
        setTimeout(() => {
          const saveFn = (window as any).__designerSave
          if (typeof saveFn === 'function') saveFn()
        }, 500)
      } catch (err) {
        console.error('PSD auto-import failed:', err)
      }
    })
  }, [canvas, pushUndo, markDirty, refreshLayers])

  // Auto-run AI design when arriving from home page with ?aiDesign= param
  useEffect(() => {
    if (!canvas || aiDesignTriggeredRef.current) return

    const params = new URLSearchParams(window.location.search)
    const aiParam = params.get('aiDesign')
    if (!aiParam) return

    aiDesignTriggeredRef.current = true

    // Clean URL without reloading
    window.history.replaceState({}, '', window.location.pathname)

    let request: { prompt: string; format: string; pageCount: number }
    try {
      request = JSON.parse(atob(aiParam))
    } catch {
      console.error('Invalid aiDesign query param')
      return
    }

    const state = useDocumentStore.getState()
    const p = state.project
    const dw = p?.width ?? 1080
    const dh = p?.height ?? 1080

    ;(async () => {
      try {
        setAiProgress('Planning content with AI…')

        const res = await fetch('/api/designer/ai-design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: request.prompt,
            format: request.format,
            pageCount: request.pageCount,
            designWidth: dw,
            designHeight: dh,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Server error (${res.status})`)
        }

        setAiProgress('Assembling design…')
        const data = (await res.json()) as AIDesignResponse

        if (data.pageSpecs.length > 0) {
          await assemblePageOnCanvas(canvas, data.pageSpecs[0], {
            clearFirst: true,
            designWidth: dw,
            designHeight: dh,
            pushUndo: () => pushUndo('AI Design'),
            markDirty,
            refreshLayers,
          })
        }

        setAiProgress('')

        // Trigger an immediate save
        setTimeout(() => {
          const saveFn = (window as any).__designerSave
          if (typeof saveFn === 'function') saveFn()
        }, 500)
      } catch (err) {
        console.error('AI design auto-generation failed:', err)
        setAiProgress('')
      }
    })()
  }, [canvas, pushUndo, markDirty, refreshLayers])

  if (!projectId || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Loading editor…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <Button variant="link" size="sm" asChild>
            <Link href="/app/designer">Back to projects</Link>
          </Button>
        </div>
      </div>
    )
  }

  const currentPage = pages.find(p => p.id === currentPageId)
  const initialFabricUrl = (currentPage as any)?.fabricUrl ?? undefined

  return (
    <div className="h-screen flex flex-col bg-[#111113] overflow-hidden">
      <TopBar projectId={projectId} />

      <div className="flex-1 flex overflow-hidden">
        <LeftRail />
        <LeftPanel />
        <LeftToolbar />

        {/* Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            {aiProgress && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-full shadow-lg">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span className="text-xs font-medium">{aiProgress}</span>
              </div>
            )}
            <CanvasStage
              key={currentPageId ?? 'default'}
              pageId={currentPageId ?? ''}
              projectId={projectId}
              initialFabricUrl={initialFabricUrl}
              width={currentPage?.width ?? project?.width ?? 1080}
              height={currentPage?.height ?? project?.height ?? 1080}
            />
          </div>
          <PagesStrip projectId={projectId} />
        </div>

        {/* Layers + Character + Properties stacked */}
        <div className="flex flex-col border-l border-white/[0.06] shrink-0 overflow-auto">
          <LayersTree />
          <CharacterPanel />
          <AdjustmentsPanel />
          <RightPanel />
        </div>
      </div>

      {/* Modals */}
      <ExportModal />
      <ShareModal projectId={projectId} />
      <CsvBulkModal />
      <AiDesignModal />
    </div>
  )
}
