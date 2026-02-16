'use client'

// ===========================================================================
// PhotosPanel — placeholder for stock photo integration
// Uses: shadcn Input, ScrollArea
// ===========================================================================
import { useState } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, ImageIcon } from 'lucide-react'

export default function PhotosPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)
  const [search, setSearch] = useState('')

  const addImageUrl = async (url: string) => {
    if (!canvas) return
    const fabricModule = await import('fabric')
    pushUndo('Add photo')
    const img = await fabricModule.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
    const maxDim = 400
    if (img.width! > maxDim || img.height! > maxDim) {
      const scale = maxDim / Math.max(img.width!, img.height!)
      img.scale(scale)
    }
    img.set({ left: 100, top: 100 })
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.requestRenderAll()
    markDirty()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">Photos</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search photos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="text-center mt-8">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Stock photos coming soon</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">Connect Unsplash or Pexels API for free stock photos</p>
        </div>
      </ScrollArea>
    </div>
  )
}
