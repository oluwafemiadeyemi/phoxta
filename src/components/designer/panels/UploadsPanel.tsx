'use client'

// ===========================================================================
// UploadsPanel — user uploaded assets, drag-to-canvas
// Uses: shadcn Button, ScrollArea
// ===========================================================================
import { useState, useEffect, useRef } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import type { DesignAsset } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, Paperclip } from 'lucide-react'

export default function UploadsPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)
  const [assets, setAssets] = useState<DesignAsset[]>([])
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/designer/assets')
      if (res.ok) setAssets(await res.json())
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { loadAssets() }, [])

  const handleUpload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/designer/assets', { method: 'POST', body: fd })
        if (res.ok) await loadAssets()
      } catch { /* silent */ }
    }
  }

  const addToCanvas = async (asset: DesignAsset) => {
    if (!canvas || !asset.url) return
    const fabricModule = await import('fabric')
    pushUndo('Add image')
    const img = await fabricModule.FabricImage.fromURL(asset.url, { crossOrigin: 'anonymous' })
    const maxDim = 400
    if (img.width! > maxDim || img.height! > maxDim) {
      const scale = maxDim / Math.max(img.width!, img.height!)
      img.scale(scale)
    }
    img.set({ left: 100, top: 100 })
    // Store the storage path so signed URLs can be refreshed on reload
    ;(img as any)._storagePath = asset.path
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.requestRenderAll()
    markDirty()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">Uploads</h3>
        <Button className="w-full text-xs" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload files
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleUpload(e.target.files)}
          className="hidden"
        />
      </div>

      <ScrollArea className="flex-1 p-3">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center mt-8">Loading...</p>
        ) : assets.length === 0 ? (
          <div className="text-center mt-8">
            <Paperclip className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No uploads yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Upload images to use in your designs</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map(a => (
              <button
                key={a.id}
                onClick={() => addToCanvas(a)}
                className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition group"
              >
                <div className="aspect-square bg-muted">
                  {a.url ? (
                    <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Paperclip className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate px-1.5 py-1">{a.name}</p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
