'use client'

// ===========================================================================
// PagesStrip — multi-page thumbnail strip at the bottom
// Uses: shadcn Button, Tooltip, ScrollArea
// ===========================================================================
import { useState } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import type { DesignPage } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Copy, X } from 'lucide-react'

interface PagesStripProps {
  projectId: string
}

export default function PagesStrip({ projectId }: PagesStripProps) {
  const { pages, currentPageId, setCurrentPageId, setPages } = useDocumentStore()
  const [loading, setLoading] = useState(false)

  const addPage = async (duplicateFromPageId?: string) => {
    setLoading(true)
    try {
      const body: Record<string, any> = {}
      if (duplicateFromPageId) body.duplicateFromPageId = duplicateFromPageId
      const res = await fetch(`/api/designer/${projectId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const newPage: DesignPage = await res.json()
        setPages([...pages, newPage])
        setCurrentPageId(newPage.id)
      }
    } catch { /* */ } finally { setLoading(false) }
  }

  const deletePage = async (pageId: string) => {
    if (pages.length <= 1) return
    try {
      await fetch(`/api/designer/${projectId}/pages?pageId=${pageId}`, { method: 'DELETE' })
      const remaining = pages.filter(p => p.id !== pageId)
      setPages(remaining)
      if (currentPageId === pageId) {
        setCurrentPageId(remaining[0]?.id ?? '')
      }
    } catch { /* */ }
  }

  return (
    <div className="h-24 bg-[#18181b] border-t border-white/[0.06] shrink-0">
      <ScrollArea className="h-full">
        <div className="flex items-center px-4 gap-3 h-full min-h-[96px]">
          {pages.map((page, idx) => {
            const isActive = page.id === currentPageId
            return (
              <div key={page.id} className="relative group shrink-0">
                <button
                  onClick={() => setCurrentPageId(page.id)}
                  className={`w-28 h-16 rounded-lg border-2 transition-all overflow-hidden flex items-center justify-center
                    ${isActive ? 'border-blue-500 shadow-sm' : 'border-zinc-700 hover:border-zinc-600'}`}
                >
                  {page.previewUrl ? (
                    <img src={page.previewUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Page {idx + 1}</span>
                  )}
                </button>

                <p className="text-[10px] text-muted-foreground text-center mt-0.5">{idx + 1}</p>

                {/* Actions */}
                <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon-xs"
                        className="h-5 w-5 rounded-full bg-zinc-800 shadow-sm border-white/[0.06]"
                        onClick={() => addPage(page.id)}>
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Duplicate page</p></TooltipContent>
                  </Tooltip>
                  {pages.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon-xs"
                          className="h-5 w-5 rounded-full bg-zinc-800 shadow-sm border-white/[0.06] text-destructive hover:text-destructive"
                          onClick={() => deletePage(page.id)}>
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete page</p></TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add page */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => addPage()}
                disabled={loading}
                className="w-28 h-16 rounded-lg border-2 border-dashed shrink-0"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Add page</p></TooltipContent>
          </Tooltip>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
