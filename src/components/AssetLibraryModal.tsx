'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface PexelsPhoto {
  id: number
  width: number
  height: number
  photographer: string
  alt: string
  src: {
    original: string
    large: string
    medium: string
    small: string
    tiny: string
  }
}

interface MyImage {
  name: string
  url: string
  section: string
  source?: 'upload' | 'stock'
  createdAt: string
}

interface AssetLibraryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ideaId: string
  section: string
  onSelect: (url: string) => void
  currentImages?: Record<string, string>
  defaultQuery?: string
}

export default function AssetLibraryModal({
  open,
  onOpenChange,
  ideaId,
  section,
  onSelect,
  currentImages,
  defaultQuery,
}: AssetLibraryModalProps) {
  // Pexels search state
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [searched, setSearched] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Selected image highlight
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  // My Library state
  const [myImages, setMyImages] = useState<MyImage[]>([])
  const [loadingMyImages, setLoadingMyImages] = useState(false)
  const [myImagesLoaded, setMyImagesLoaded] = useState(false)

  // Fetch uploaded images when modal opens
  useEffect(() => {
    if (open && !myImagesLoaded) {
      setLoadingMyImages(true)
      fetch(`/api/idea/${ideaId}/my-images`)
        .then((res) => (res.ok ? res.json() : { images: [] }))
        .then((data) => {
          setMyImages(data.images || [])
          setMyImagesLoaded(true)
        })
        .catch(() => setMyImages([]))
        .finally(() => setLoadingMyImages(false))
    }
  }, [open, ideaId, myImagesLoaded])

  // Auto-populate search with AI-generated query and auto-search
  const prevDefaultQuery = useRef('')
  useEffect(() => {
    if (open && defaultQuery && defaultQuery !== prevDefaultQuery.current) {
      prevDefaultQuery.current = defaultQuery
      setQuery(defaultQuery)
      // Auto-trigger search after a tick to ensure state is set
      const timer = setTimeout(() => {
        searchPexelsRef.current?.(defaultQuery, 1)
      }, 100)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultQuery])

  // Build "in use" images from currentImages prop
  const inUseImages = Object.entries(currentImages || {}).map(([sec, url]) => ({
    section: sec,
    url,
  }))

  const searchPexels = useCallback(async (searchQuery: string, pageNum: number, append = false) => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({
        query: searchQuery.trim(),
        page: String(pageNum),
        per_page: '15',
      })
      const res = await fetch(`/api/idea/${ideaId}/pexels-search?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setPhotos((prev) => {
            const existingIds = new Set(prev.map((p: PexelsPhoto) => p.id))
            return [...prev, ...data.photos.filter((p: PexelsPhoto) => !existingIds.has(p.id))]
          })
        } else {
          setPhotos(data.photos)
        }
        setHasMore(data.hasMore)
        setTotalResults(data.totalResults)
        setPage(pageNum)
      }
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }, [ideaId])

  // Keep a ref to searchPexels for the auto-search effect
  const searchPexelsRef = useRef(searchPexels)
  useEffect(() => { searchPexelsRef.current = searchPexels }, [searchPexels])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchPexels(query, 1, false)
  }

  const handleLoadMore = () => {
    searchPexels(query, page + 1, true)
  }

  const handleSelectPhoto = (photo: PexelsPhoto) => {
    setSelectedUrl(photo.src.large)
  }

  const [savingImage, setSavingImage] = useState(false)

  const handleConfirmSelection = () => {
    if (!selectedUrl) return

    // Use the original URL directly
    onSelect(selectedUrl)

    // Save the image link to the library in the background (all sources)
    fetch(`/api/idea/${ideaId}/save-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: selectedUrl, section }),
    }).catch(() => {})

    onOpenChange(false)
    resetState()
  }

  const handleDeleteFromLibrary = async (url: string) => {
    setSavingImage(true)
    try {
      await fetch(`/api/idea/${ideaId}/save-image`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      setMyImages((prev) => prev.filter((img) => img.url !== url))
      if (selectedUrl === url) setSelectedUrl(null)
    } catch { /* ignore */ }
    finally { setSavingImage(false) }
  }

  // Upload handlers
  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, WebP, GIF, or SVG)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('section', section)
      const res = await fetch(`/api/idea/${ideaId}/upload-image`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedUrl(data.url)
        // Refresh my library to include the new upload
        setMyImagesLoaded(false)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Upload failed')
      }
    } catch {
      alert('Upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const resetState = () => {
    setQuery('')
    setPhotos([])
    setSearched(false)
    setPage(1)
    setHasMore(false)
    setTotalResults(0)
    setSelectedUrl(null)
    setUploadPreview(null)
    setDragOver(false)
    setMyImagesLoaded(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">🖼️</span>
            Choose Image — {section}
          </DialogTitle>
          <DialogDescription>
            Search stock photos, upload your own, or choose from your library.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">📁 My Library</TabsTrigger>
            <TabsTrigger value="search" className="flex-1">📷 Stock Photos</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">📤 Upload</TabsTrigger>
          </TabsList>

          {/* My Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-3">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {/* Currently In Use */}
              {inUseImages.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Currently In Use</p>
                  <div className="grid grid-cols-3 gap-2">
                    {inUseImages.map((img) => (
                      <button
                        key={`inuse-${img.section}`}
                        type="button"
                        onClick={() => setSelectedUrl(img.url)}
                        className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedUrl === img.url
                            ? 'border-primary ring-2 ring-primary/30'
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.section}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                        {selectedUrl === img.url && (
                          <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                          <p className="text-[10px] text-white truncate">{img.section}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Images */}
              {loadingMyImages ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="animate-spin h-6 w-6 text-muted-foreground mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">Loading your images...</p>
                </div>
              ) : myImages.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Saved Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {myImages.map((img) => (
                      <div key={img.url} className="relative group">
                        <button
                          type="button"
                          onClick={() => setSelectedUrl(img.url)}
                          className={`w-full relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            selectedUrl === img.url
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.section}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                          />
                          {selectedUrl === img.url && (
                            <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                            <p className="text-[10px] text-white truncate">{img.section}</p>
                          </div>
                        </button>
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFromLibrary(img.url) }}
                          className="absolute top-1.5 left-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove from library"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : inUseImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-3xl mb-2">📁</span>
                  <p className="text-sm">No images in your library yet.</p>
                  <p className="text-xs mt-1">Upload images or select stock photos to build your library.</p>
                </div>
              ) : null}
            </div>
          </TabsContent>

          {/* Stock Photos Tab */}
          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-3">
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <Input
                placeholder="Search photos (e.g. technology, office, nature)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={searching || !query.trim()}>
                {searching ? (
                  <><svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Searching</>
                ) : 'Search'}
              </Button>
            </form>

            {searched && totalResults > 0 && (
              <p className="text-xs text-muted-foreground mb-2">{totalResults.toLocaleString()} results found</p>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pr-2">
                  {photos.map((photo, idx) => (
                    <button
                      key={`${photo.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelectPhoto(photo)}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedUrl === photo.src.large
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src.medium}
                        alt={photo.alt || `Photo by ${photo.photographer}`}
                        className="w-full h-32 object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      {selectedUrl === photo.src.large && (
                        <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white truncate">{photo.photographer}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searched && !searching ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-3xl mb-2">🔍</span>
                  <p className="text-sm">No photos found. Try a different search term.</p>
                </div>
              ) : !searched ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-3xl mb-2">📷</span>
                  <p className="text-sm">Search for free stock photos to use on your landing page.</p>
                </div>
              ) : null}

              {hasMore && !searching && (
                <div className="flex justify-center mt-3 mb-1">
                  <Button variant="outline" size="sm" onClick={handleLoadMore}>
                    Load More Photos
                  </Button>
                </div>
              )}

              {searching && photos.length > 0 && (
                <div className="flex justify-center py-4">
                  <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-3">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm font-medium">Uploading...</p>
                </div>
              ) : uploadPreview ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadPreview} alt="Upload preview" className="max-h-48 rounded-lg object-contain" />
                  <p className="text-xs text-muted-foreground">Click or drop another file to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">📁</span>
                  <p className="text-sm font-medium">Drop an image here or click to browse</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, SVG — Max 10MB</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirm button */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetState() }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSelection} disabled={!selectedUrl}>
            {selectedUrl ? 'Use This Image' : 'Select an Image'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
