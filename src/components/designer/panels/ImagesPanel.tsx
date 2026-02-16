'use client'

// ===========================================================================
// ImagesPanel — user uploads + Pexels stock photo search
// Merges the former UploadsPanel and PhotosPanel into a single tab.
// Uses: shadcn Button, Input, ScrollArea, Tabs
// ===========================================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import type { DesignAsset } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Upload, Paperclip, Search, ImageIcon, Loader2, X, Plus, Trash2, Bookmark } from 'lucide-react'

/* ── Pexels photo shape ──────────────────────────────────── */
interface PexelsPhoto {
  id: number
  width: number
  height: number
  photographer: string
  photographerUrl: string
  alt: string
  src: {
    original: string
    large: string
    medium: string
    small: string
    tiny: string
  }
}

/* ── Component ───────────────────────────────────────────── */
export default function ImagesPanel() {
  const canvas = useDocumentStore((s) => s.canvas)
  const pushUndo = useDocumentStore((s) => s.pushUndo)
  const markDirty = useDocumentStore((s) => s.markDirty)
  const pages = useDocumentStore((s) => s.pages)
  const currentPageId = useDocumentStore((s) => s.currentPageId)

  /* Current page dimensions for centering */
  const currentPage = pages.find((p) => p.id === currentPageId)
  const designW = currentPage?.width ?? 800
  const designH = currentPage?.height ?? 600

  /* uploads state */
  const [assets, setAssets] = useState<DesignAsset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  /* pexels state */
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [pexelsLoading, setPexelsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalResults, setTotalResults] = useState(0)

  /* preview state */
  const [previewPhoto, setPreviewPhoto] = useState<PexelsPhoto | null>(null)
  const [previewAsset, setPreviewAsset] = useState<DesignAsset | null>(null)

  /* ── Uploads ──────────────────────────────────────────── */
  const loadAssets = async () => {
    try {
      const res = await fetch('/api/designer/assets')
      if (res.ok) setAssets(await res.json())
    } catch {
      /* silent */
    } finally {
      setLoadingAssets(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [])

  const handleUpload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/designer/assets', { method: 'POST', body: fd })
        if (res.ok) await loadAssets()
      } catch {
        /* silent */
      }
    }
  }

  const addAssetToCanvas = async (asset: DesignAsset) => {
    if (!canvas || !asset.url) return
    const fabricModule = await import('fabric')
    pushUndo('Add image')
    const img = await fabricModule.FabricImage.fromURL(asset.url, { crossOrigin: 'anonymous' })
    const maxDim = 400
    if (img.width! > maxDim || img.height! > maxDim) {
      const scale = maxDim / Math.max(img.width!, img.height!)
      img.scale(scale)
    }
    const scaledW = img.getScaledWidth()
    const scaledH = img.getScaledHeight()
    img.set({ left: (designW - scaledW) / 2, top: (designH - scaledH) / 2 })
    // Store the storage path so signed URLs can be refreshed on reload
    ;(img as any)._storagePath = asset.path
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.requestRenderAll()
    markDirty()
  }

  const deleteAsset = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation()
    try {
      const res = await fetch('/api/designer/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId }),
      })
      if (res.ok) setAssets((prev) => prev.filter((a) => a.id !== assetId))
    } catch { /* silent */ }
  }

  /* ── Pexels search ───────────────────────────────────── */
  const searchPexels = useCallback(
    async (q: string, p: number, append = false) => {
      if (!q.trim()) return
      setPexelsLoading(true)
      try {
        const params = new URLSearchParams({ query: q, page: String(p), per_page: '30' })
        const res = await fetch(`/api/designer/pexels-search?${params}`)
        if (res.ok) {
          const data = await res.json()
          if (append) {
            setPhotos((prev) => {
              const ids = new Set(prev.map((x) => x.id))
              return [...prev, ...data.photos.filter((x: PexelsPhoto) => !ids.has(x.id))]
            })
          } else {
            setPhotos(data.photos)
          }
          setPage(data.page)
          setHasMore(data.hasMore)
          setTotalResults(data.totalResults)
        }
      } catch {
        /* silent */
      } finally {
        setPexelsLoading(false)
      }
    },
    [],
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) searchPexels(query, 1)
  }

  const loadMorePhotos = () => {
    searchPexels(query, page + 1, true)
  }

  const addPhotoToCanvas = async (photo: PexelsPhoto) => {
    if (!canvas) return
    const fabricModule = await import('fabric')
    pushUndo('Add photo')
    const img = await fabricModule.FabricImage.fromURL(photo.src.large, { crossOrigin: 'anonymous' })
    const maxDim = 400
    if (img.width! > maxDim || img.height! > maxDim) {
      const scale = maxDim / Math.max(img.width!, img.height!)
      img.scale(scale)
    }
    const scaledW = img.getScaledWidth()
    const scaledH = img.getScaledHeight()
    img.set({ left: (designW - scaledW) / 2, top: (designH - scaledH) / 2 })
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.requestRenderAll()
    markDirty()
  }

  const savePhotoToLibrary = async (photo: PexelsPhoto) => {
    try {
      const res = await fetch('/api/designer/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalUrl: photo.src.large,
          name: photo.alt || `pexels-${photo.id}`,
          photographer: photo.photographer,
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        setAssets((prev) => [saved, ...prev])
      }
    } catch { /* silent */ }
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full relative">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">Images</h3>
      </div>

      <Tabs defaultValue="uploads" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabsList className="mx-3 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="uploads" className="text-xs">Uploads</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs">Stock Photos</TabsTrigger>
        </TabsList>

        {/* ── Uploads tab ──────────────────────────────── */}
        <TabsContent value="uploads" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
          <div className="p-3 pb-1 shrink-0">
            <Button className="w-full text-xs" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload files
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />
          </div>

          <ScrollArea className="flex-1 min-h-0 p-3 pt-1">
            {loadingAssets ? (
              <p className="text-xs text-muted-foreground text-center mt-8">Loading...</p>
            ) : assets.length === 0 ? (
              <div className="text-center mt-8">
                <Paperclip className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No uploads yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Upload images to use in your designs
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="relative rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition group cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-designer-image', JSON.stringify({
                        type: 'asset',
                        url: a.url,
                        path: a.path,
                        name: a.name,
                      }))
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <button
                      onClick={() => setPreviewAsset(a)}
                      className="w-full text-left"
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
                      <p className="text-[10px] text-muted-foreground truncate px-1.5 py-1">
                        {a.name}
                      </p>
                    </button>
                    <button
                      onClick={(e) => deleteAsset(e, a.id)}
                      className="absolute top-1 right-1 rounded-full bg-black/50 hover:bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* ── Stock Photos tab ─────────────────────────── */}
        <TabsContent value="stock" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
          <form onSubmit={handleSearch} className="p-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search Pexels photos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </form>

          <ScrollArea className="flex-1 min-h-0 p-3 pt-1">
            {photos.length === 0 && !pexelsLoading ? (
              <div className="text-center mt-8">
                <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Search for stock photos</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Powered by Pexels — free to use
                </p>
              </div>
            ) : (
              <>
                {totalResults > 0 && (
                  <p className="text-[10px] text-muted-foreground mb-2">
                    {totalResults.toLocaleString()} results
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setPreviewPhoto(photo)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-designer-image', JSON.stringify({
                          type: 'stock',
                          url: photo.src.large,
                          thumbUrl: photo.src.small,
                          alt: photo.alt,
                          photographer: photo.photographer,
                        }))
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition group text-left cursor-grab active:cursor-grabbing"
                    >
                      <div className="aspect-[4/3] bg-muted relative">
                        <img
                          src={photo.src.small}
                          alt={photo.alt}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate px-1.5 py-1">
                        {photo.photographer}
                      </p>
                    </button>
                  ))}
                </div>

                {pexelsLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {hasMore && !pexelsLoading && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-xs"
                    onClick={loadMorePhotos}
                  >
                    Load more
                  </Button>
                )}
              </>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* ── Upload preview overlay ──────────────────── */}
      {previewAsset && (
        <div
          className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute -top-2 -right-2 z-10 rounded-full bg-black/60 hover:bg-black/80 text-white p-1 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {previewAsset.url ? (
              <img
                src={previewAsset.url}
                alt={previewAsset.name}
                className="max-w-full max-h-[60%] rounded-lg object-contain shadow-lg"
              />
            ) : (
              <div className="w-40 h-40 bg-muted rounded-lg flex items-center justify-center">
                <Paperclip className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}

            <div className="mt-3 text-center">
              <p className="text-xs text-white/90 mb-3">{previewAsset.name}</p>
              <Button
                size="sm"
                className="text-xs"
                onClick={() => {
                  addAssetToCanvas(previewAsset)
                  setPreviewAsset(null)
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add to canvas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo preview overlay ────────────────────── */}
      {previewPhoto && (
        <div
          className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          {/* Card — stop clicks inside from closing */}
          <div
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-2 -right-2 z-10 rounded-full bg-black/60 hover:bg-black/80 text-white p-1 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Preview image */}
            <img
              src={previewPhoto.src.medium}
              alt={previewPhoto.alt}
              className="max-w-full max-h-[60%] rounded-lg object-contain shadow-lg"
            />

            {/* Info + actions */}
            <div className="mt-3 text-center">
              <p className="text-xs text-white/90 mb-1">{previewPhoto.alt || 'Untitled'}</p>
              <p className="text-[10px] text-white/60 mb-3">by {previewPhoto.photographer}</p>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => {
                    savePhotoToLibrary(previewPhoto)
                    setPreviewPhoto(null)
                  }}
                >
                  <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    addPhotoToCanvas(previewPhoto)
                    setPreviewPhoto(null)
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add to canvas
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
