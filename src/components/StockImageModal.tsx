'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PexelsPhoto {
  id: number
  width: number
  height: number
  photographer: string
  alt: string
  src: { original: string; large: string; medium: string; small: string; tiny: string }
}

interface LibraryImage {
  url: string
  section: string
  source: 'upload' | 'stock' | 'url' | 'video'
  name?: string
  createdAt?: string
}

interface StockImageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  section: string
  onSelect: (url: string) => void
}

// ---------------------------------------------------------------------------
// Video URL helpers
// ---------------------------------------------------------------------------
function parseVideoUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct' | null; embedUrl: string; thumbnailUrl: string } {
  // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`,
    }
  }
  // Vimeo: vimeo.com/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      thumbnailUrl: '',
    }
  }
  // Direct video file
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return { type: 'direct', embedUrl: url, thumbnailUrl: '' }
  }
  return { type: null, embedUrl: '', thumbnailUrl: '' }
}

// ---------------------------------------------------------------------------
// localStorage helpers for stock/URL image history
// ---------------------------------------------------------------------------
const LIBRARY_KEY = 'phoxta-image-library'

function getLocalLibrary(): LibraryImage[] {
  try {
    return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveToLocalLibrary(img: LibraryImage) {
  const lib = getLocalLibrary()
  if (lib.some((i) => i.url === img.url)) return
  lib.unshift(img)
  if (lib.length > 200) lib.length = 200
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib))
}

function removeFromLocalLibrary(url: string) {
  const lib = getLocalLibrary().filter((i) => i.url !== url)
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StockImageModal({
  open,
  onOpenChange,
  section,
  onSelect,
}: StockImageModalProps) {
  // Library state
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

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

  // URL input state
  const [urlInput, setUrlInput] = useState('')

  // Video input state
  const [videoInput, setVideoInput] = useState('')
  const [videoParsed, setVideoParsed] = useState<{ type: string; embedUrl: string; thumbnailUrl: string } | null>(null)

  // Selected image highlight
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  // ---- Library: fetch uploaded images + merge with local stock/URL history ----
  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true)
    try {
      const localImages = getLocalLibrary()

      const res = await fetch('/api/sites/my-images')
      let uploadedImages: LibraryImage[] = []
      if (res.ok) {
        const data = await res.json()
        uploadedImages = (data.images || []).map((img: LibraryImage) => ({
          ...img,
          source: 'upload' as const,
        }))
      }

      // Merge: uploads first, then local stock/URL history, deduplicate
      const seen = new Set<string>()
      const merged = [...uploadedImages, ...localImages].filter((img) => {
        if (seen.has(img.url)) return false
        seen.add(img.url)
        return true
      })
      setLibraryImages(merged)
    } catch {
      setLibraryImages(getLocalLibrary())
    } finally {
      setLibraryLoading(false)
    }
  }, [])

  // Load library when modal opens
  useEffect(() => {
    if (open) loadLibrary()
  }, [open, loadLibrary])

  // ---- Pexels search ----
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
      const res = await fetch(`/api/sites/pexels-search?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setPhotos(prev => {
            const existingIds = new Set(prev.map(p => p.id))
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
  }, [])

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

  const handleConfirmSelection = () => {
    if (!selectedUrl) return
    onSelect(selectedUrl)

    // Auto-save to library history
    const isUpload = libraryImages.some((i) => i.url === selectedUrl && i.source === 'upload')
    if (!isUpload) {
      const isVideo = selectedUrl.startsWith('video:')
      const matchedPhoto = photos.find((p) => p.src.large === selectedUrl)
      saveToLocalLibrary({
        url: selectedUrl,
        section: matchedPhoto?.alt || section || (isVideo ? 'video' : 'stock'),
        source: isVideo ? 'video' : (matchedPhoto ? 'stock' : 'url'),
        name: isVideo ? 'Video' : (matchedPhoto?.photographer || 'Image'),
        createdAt: new Date().toISOString(),
      })
    }

    onOpenChange(false)
    resetState()
  }

  // ---- Video URL ----
  const handleUseVideo = () => {
    const trimmed = videoInput.trim()
    if (!trimmed) return
    const parsed = parseVideoUrl(trimmed)
    if (!parsed.type) {
      alert('Unsupported video URL. Supported: YouTube, Vimeo, or direct video file (.mp4, .webm, .ogg)')
      return
    }
    setVideoParsed({ type: parsed.type!, embedUrl: parsed.embedUrl, thumbnailUrl: parsed.thumbnailUrl })
    // Prefix with video: so the iframe handler knows to embed it
    setSelectedUrl('video:' + parsed.embedUrl)
  }

  // ---- File upload ----
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
      const res = await fetch('/api/sites/upload-image', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedUrl(data.url)
        // Refresh library to show the new upload
        loadLibrary()
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

  const handleUseUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
      setSelectedUrl(trimmed)
    } catch {
      alert('Please enter a valid URL')
    }
  }

  // ---- Remove from library ----
  const handleRemoveFromLibrary = (img: LibraryImage) => {
    if (img.source !== 'upload') {
      removeFromLocalLibrary(img.url)
    }
    setLibraryImages(prev => prev.filter((i) => i.url !== img.url))
    if (selectedUrl === img.url) setSelectedUrl(null)
  }

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
    setUrlInput('')
    setVideoInput('')
    setVideoParsed(null)
  }

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'upload': return 'Uploaded'
      case 'stock': return 'Pexels'
      case 'url': return 'URL'
      case 'video': return 'Video'
      default: return source
    }
  }

  const sourceColor = (source: string) => {
    switch (source) {
      case 'upload': return 'bg-emerald-500/80'
      case 'stock': return 'bg-blue-500/80'
      case 'url': return 'bg-purple-500/80'
      case 'video': return 'bg-red-500/80'
      default: return 'bg-gray-500/80'
    }
  }

  const isVideoLibItem = (img: LibraryImage) => img.source === 'video' || img.url.startsWith('video:')

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState() }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">🖼️</span>
            Choose Image{section ? ` — ${section}` : ''}
          </DialogTitle>
          <DialogDescription>
            Browse your library, search stock photos, upload your own, paste an image URL, or embed a video.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="library" className="flex-1">📚 Library</TabsTrigger>
            <TabsTrigger value="search" className="flex-1">📷 Stock</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">📤 Upload</TabsTrigger>
            <TabsTrigger value="url" className="flex-1">🔗 URL</TabsTrigger>
            <TabsTrigger value="video" className="flex-1">🎬 Video</TabsTrigger>
          </TabsList>

          {/* ═══════════ My Library Tab ═══════════ */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-3">
            {libraryLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <svg className="animate-spin h-6 w-6 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm">Loading your images...</p>
              </div>
            ) : libraryImages.length > 0 ? (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground mb-2">
                  {libraryImages.length} image{libraryImages.length !== 1 ? 's' : ''} in your library
                </p>
                <div className="grid grid-cols-3 gap-2 pr-2">
                  {libraryImages.map((img, idx) => (
                    <div
                      key={`${img.url}-${idx}`}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        selectedUrl === img.url
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedUrl(img.url)}
                        className="w-full cursor-pointer"
                      >
                        {isVideoLibItem(img) ? (
                          <div className="w-full h-32 bg-gray-900 flex flex-col items-center justify-center gap-1">
                            <span className="text-3xl">🎬</span>
                            <span className="text-[10px] text-gray-300 truncate max-w-[90%]">
                              {img.url.includes('youtube') ? 'YouTube' : img.url.includes('vimeo') ? 'Vimeo' : 'Video'}
                            </span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={img.url}
                            alt={img.section || 'Library image'}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                          />
                        )}
                      </button>
                      {/* Source badge */}
                      <div className={`absolute top-1.5 left-1.5 ${sourceColor(img.source)} text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full`}>
                        {sourceLabel(img.source)}
                      </div>
                      {/* Selected checkmark */}
                      {selectedUrl === img.url && (
                        <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                      {/* Remove button (visible on hover) */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromLibrary(img) }}
                        className="absolute bottom-1.5 right-1.5 bg-red-500/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
                        title="Remove from library"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {/* Section label */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white truncate">{isVideoLibItem(img) ? '🎬 ' : ''}{img.section || img.name || 'Image'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <span className="text-4xl mb-3">📚</span>
                <p className="text-sm font-medium">Your library is empty</p>
                <p className="text-xs mt-1 opacity-60 max-w-xs text-center">
                  Upload images or search stock photos — they&apos;ll appear here for easy reuse across your sites.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ═══════════ Stock Photos Tab ═══════════ */}
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
                  <>
                    <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching
                  </>
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
                  <p className="text-sm">Search for free stock photos from Pexels.</p>
                  <p className="text-xs mt-1 opacity-60">Try: landscape, business, food, technology, fashion...</p>
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

          {/* ═══════════ Upload Tab ═══════════ */}
          <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-3">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
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

          {/* ═══════════ URL Tab ═══════════ */}
          <TabsContent value="url" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste an image URL (https://...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUseUrl() } }}
                />
                <Button type="button" onClick={handleUseUrl} disabled={!urlInput.trim()}>
                  Preview
                </Button>
              </div>
              {selectedUrl && urlInput.trim() && (
                <div className="flex flex-col items-center gap-3 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedUrl}
                    alt="Preview"
                    className="max-h-64 rounded-lg object-contain border border-muted"
                    onError={() => alert('Could not load image from that URL')}
                  />
                  <p className="text-xs text-muted-foreground">Image preview from URL</p>
                </div>
              )}
              {!urlInput.trim() && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-3xl mb-2">🔗</span>
                  <p className="text-sm">Paste any image URL to use it in your template.</p>
                  <p className="text-xs mt-1 opacity-60">Works with any publicly accessible image link.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════ Video Tab ═══════════ */}
          <TabsContent value="video" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste a YouTube, Vimeo, or direct video URL..."
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUseVideo() } }}
                />
                <Button type="button" onClick={handleUseVideo} disabled={!videoInput.trim()}>
                  Embed
                </Button>
              </div>

              {videoParsed ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-full max-w-md aspect-video rounded-lg overflow-hidden border border-muted bg-black">
                    {videoParsed.type === 'direct' ? (
                      <video src={videoParsed.embedUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <iframe
                        src={videoParsed.embedUrl}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Video preview"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${
                      videoParsed.type === 'youtube' ? 'bg-red-500' : videoParsed.type === 'vimeo' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      {videoParsed.type === 'youtube' ? 'YouTube' : videoParsed.type === 'vimeo' ? 'Vimeo' : 'Video File'}
                    </span>
                    <p className="text-xs text-muted-foreground">This video will replace the image in your template.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-3xl mb-2">🎬</span>
                  <p className="text-sm">Replace any image with a video embed.</p>
                  <p className="text-xs mt-2 opacity-60 max-w-xs text-center">Supported: YouTube, Vimeo, or direct video files (.mp4, .webm, .ogg)</p>
                  <div className="mt-4 text-[11px] opacity-40 space-y-1 text-center">
                    <p>youtube.com/watch?v=...</p>
                    <p>youtu.be/...</p>
                    <p>vimeo.com/...</p>
                    <p>https://example.com/video.mp4</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>

        {/* Confirm button */}
        <div className="flex items-center justify-between pt-3 border-t">
          <p className="text-[10px] text-muted-foreground">
            <span className="opacity-60">Powered by</span>{' '}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Pexels</a>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { onOpenChange(false); resetState() }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSelection} disabled={!selectedUrl}>
              {selectedUrl
                ? (selectedUrl.startsWith('video:') ? 'Embed Video' : 'Use This Image')
                : 'Select an Image'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
