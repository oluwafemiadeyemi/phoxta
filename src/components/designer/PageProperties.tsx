'use client'

// ===========================================================================
// PageProperties — always-visible panel showing canvas / page settings
// ===========================================================================
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Section, ColorInput, NumInput } from './PropertyControls'
import type { PageBackground } from '@/types/designer'

export default function PageProperties() {
  const canvas = useDocumentStore(s => s.canvas)
  const project = useDocumentStore(s => s.project)
  const pages = useDocumentStore(s => s.pages)
  const currentPageId = useDocumentStore(s => s.currentPageId)
  const updatePage = useDocumentStore(s => s.updatePage)
  const markDirty = useDocumentStore(s => s.markDirty)
  const { rightPanelOpen } = useUIStore()

  if (!rightPanelOpen) return null

  const currentPage = pages.find(p => p.id === currentPageId)
  const pageW = currentPage?.width ?? project?.width ?? 1080
  const pageH = currentPage?.height ?? project?.height ?? 1080
  const bg = currentPage?.background ?? { type: 'color' as const, value: '#ffffff' }

  const handleBgChange = (color: string) => {
    if (!currentPageId) return
    const newBg: PageBackground = { type: 'color', value: color }
    updatePage(currentPageId, { background: newBg })
    markDirty()
    if (canvas) {
      ;(canvas as any).__artboardFill = color
      canvas.requestRenderAll()
    }
  }

  return (
    <div className="w-64 bg-[#18181b] border-l border-white/[0.06] flex flex-col overflow-hidden shrink-0">
      <div className="p-3 border-b border-white/[0.04]">
        <h3 className="text-xs font-semibold text-zinc-200">Page</h3>
      </div>
      <ScrollArea className="flex-1">
        <Section title="Canvas">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1">
                <Label className="text-[10px] text-muted-foreground w-5 shrink-0">W</Label>
                <span className="text-xs text-zinc-300">{pageW}px</span>
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-[10px] text-muted-foreground w-5 shrink-0">H</Label>
                <span className="text-xs text-zinc-300">{pageH}px</span>
              </div>
            </div>
          </div>
        </Section>
        <Separator />
        <Section title="Background">
          <ColorInput
            label="Color"
            value={bg.type === 'color' ? bg.value : '#ffffff'}
            onChange={handleBgChange}
          />
        </Section>
        <Separator />
        <Section title="Project">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground w-12 shrink-0">Name</Label>
              <span className="text-xs text-zinc-300 truncate">{project?.name ?? 'Untitled'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground w-12 shrink-0">Pages</Label>
              <span className="text-xs text-zinc-300">{pages.length}</span>
            </div>
          </div>
        </Section>
      </ScrollArea>
    </div>
  )
}
