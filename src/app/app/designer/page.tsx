'use client'

// ===========================================================================
// Designer Dashboard — list projects, create new, import PSD, view trash
// Uses fetch to /api/designer/projects for consistent signed preview URLs
// ===========================================================================
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { DesignProject } from '@/types/designer'
import { CANVAS_PRESETS } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  Trash2,
  RotateCcw,
  X,
  Loader2,
  Paintbrush,
  FileImage,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { previewPsd } from '@/lib/designer/psdImporter'
import { storePendingPsd } from '@/lib/designer/psdTransfer'
import AiDesignHomeModal from '@/components/designer/modals/AiDesignHomeModal'

export default function DesignerDashboard() {
  const [showNew, setShowNew] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [showAiDesign, setShowAiDesign] = useState(false)

  // ── Active projects (fetched via API for fresh signed preview URLs) ──
  const [projects, setProjects] = useState<DesignProject[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/designer/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch { /* network error */ }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // ── Trashed projects ──
  const [trashed, setTrashed] = useState<DesignProject[]>([])
  const [trashLoading, setTrashLoading] = useState(false)

  const fetchTrash = useCallback(async () => {
    setTrashLoading(true)
    try {
      const res = await fetch('/api/designer/projects?status=trashed')
      if (res.ok) {
        const data = await res.json()
        setTrashed(data)
      }
    } catch { /* */ }
    finally { setTrashLoading(false) }
  }, [])

  // ── Project actions ──
  const [createError, setCreateError] = useState<string | null>(null)
  const [psdImporting, setPsdImporting] = useState(false)
  const psdFileRef = useRef<HTMLInputElement>(null)

  const handlePsdImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.psd')) {
      setCreateError('Please select a .psd file')
      return
    }

    setPsdImporting(true)
    setCreateError(null)

    try {
      const info = await previewPsd(file)
      const psdKey = crypto.randomUUID()
      await storePendingPsd(psdKey, file)

      const name = file.name.replace(/\.psd$/i, '')
      const res = await fetch('/api/designer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, width: info.width, height: info.height }),
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = `/app/designer/${data.id}?importPsd=${psdKey}`
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(err.error || `Failed to create project (${res.status})`)
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to import PSD')
    } finally {
      setPsdImporting(false)
      if (psdFileRef.current) psdFileRef.current.value = ''
    }
  }

  const createProject = async (name: string, width: number, height: number) => {
    setCreateError(null)
    try {
      const res = await fetch('/api/designer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, width, height }),
      })
      if (res.ok) {
        const data = await res.json()
        window.location.href = `/app/designer/${data.id}`
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(err.error || `Failed (${res.status})`)
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Network error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/designer/${id}`, { method: 'DELETE' })
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch { /* */ }
  }

  const restoreProject = async (id: string) => {
    try {
      await fetch(`/api/designer/${id}/restore`, { method: 'POST' })
      setTrashed((prev) => prev.filter((p) => p.id !== id))
      fetchProjects()
    } catch { /* */ }
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-white hover:bg-white/[0.06]" asChild>
              <Link href="/app">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold text-white">Designer</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
              onClick={() => { setShowTrash(true); fetchTrash() }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Trash
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              disabled={psdImporting}
              onClick={() => psdFileRef.current?.click()}
            >
              {psdImporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileImage className="mr-1.5 h-3.5 w-3.5" />
              )}
              {psdImporting ? 'Importing…' : 'Import PSD'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              onClick={() => setShowAiDesign(true)}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Design
            </Button>
            <Button size="sm" className="text-xs bg-white text-black hover:bg-zinc-200" onClick={() => setShowNew(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New design
            </Button>
          </div>
        </div>
      </div>

      {/* Projects grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <Paintbrush className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No designs yet</p>
            <p className="text-xs text-muted-foreground/70 mb-4">
              Create your first design or import a PSD to get started
            </p>
            <div className="flex items-center gap-2 justify-center">
              <Button size="sm" className="bg-white text-black hover:bg-zinc-200" onClick={() => setShowNew(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New design
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                onClick={() => psdFileRef.current?.click()}
              >
                <FileImage className="mr-1.5 h-3.5 w-3.5" /> Import PSD
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {projects.map((p: DesignProject) => (
              <div key={p.id} className="group relative">
                <Link href={`/app/designer/${p.id}`}>
                  <Card className="overflow-hidden hover:shadow-md transition bg-zinc-900/60 border-white/[0.06] hover:border-white/[0.12]">
                    <div className="aspect-[4/3] bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {p.preview_url ? (
                        <img
                          src={p.preview_url}
                          alt={p.name}
                          className="w-full h-full object-contain bg-white"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Paintbrush className="h-8 w-8 text-muted-foreground/20" />
                          <span className="text-[10px] text-muted-foreground/40">No preview</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="px-3 py-2">
                      <p className="text-xs font-medium text-zinc-300 truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {p.width}×{p.height} · {new Date(p.updated_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
                <Button
                  variant="outline"
                  size="icon-xs"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-zinc-800/90 border-white/[0.08] text-zinc-300 hidden group-hover:flex"
                  onClick={() => handleDelete(p.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New project dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto bg-zinc-900 border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-white">New design</DialogTitle>
            <DialogDescription className="text-zinc-500">Choose a preset or enter custom dimensions.</DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md px-3 py-2 mb-2">
              {createError}
            </div>
          )}

          {/* Custom size */}
          <div className="flex gap-2 mb-4">
            <Input id="new-name" type="text" placeholder="Design name" className="flex-1 text-xs h-9 bg-zinc-800 border-white/[0.08] text-white placeholder:text-zinc-500" />
            <Input id="new-w" type="number" placeholder="Width" defaultValue={1080} className="w-20 text-xs h-9 bg-zinc-800 border-white/[0.08] text-white" />
            <Input id="new-h" type="number" placeholder="Height" defaultValue={1080} className="w-20 text-xs h-9 bg-zinc-800 border-white/[0.08] text-white" />
            <Button size="sm" className="bg-white text-black hover:bg-zinc-200" onClick={() => {
              const name = (document.getElementById('new-name') as HTMLInputElement).value || 'Untitled design'
              const w = parseInt((document.getElementById('new-w') as HTMLInputElement).value) || 1080
              const h = parseInt((document.getElementById('new-h') as HTMLInputElement).value) || 1080
              createProject(name, w, h)
            }}>
              Create
            </Button>
          </div>

          {/* Presets by category */}
          {['Social Media', 'Print', 'Presentation', 'Web'].map(cat => {
            const presets = CANVAS_PRESETS.filter(p => p.category === cat)
            if (presets.length === 0) return null
            return (
              <div key={cat} className="mb-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
                <div className="grid grid-cols-3 gap-2">
                  {presets.map(preset => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      className="h-auto py-2.5 px-3 justify-start border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                      onClick={() => createProject(preset.label, preset.width, preset.height)}
                    >
                      <div className="text-left">
                        <p className="text-xs font-medium">{preset.icon} {preset.label}</p>
                        <p className="text-[10px] text-muted-foreground">{preset.width}×{preset.height}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )
          })}
        </DialogContent>
      </Dialog>

      {/* Trash dialog */}
      <Dialog open={showTrash} onOpenChange={setShowTrash}>
        <DialogContent className="sm:max-w-[440px] max-h-[60vh] overflow-y-auto bg-zinc-900 border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Trash2 className="h-4 w-4" /> Trash
            </DialogTitle>
          </DialogHeader>

          {trashLoading ? (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : trashed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Trash is empty</p>
          ) : (
            <div className="space-y-2">
              {trashed.map((p: DesignProject) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800">
                  <div>
                    <p className="text-xs font-medium text-zinc-300">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Deleted {new Date(p.deleted_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-400"
                    onClick={() => restoreProject(p.id)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]" onClick={() => setShowTrash(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PSD error toast (outside dialogs) */}
      {createError && !showNew && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md px-4 py-3 shadow-lg flex items-center gap-2 max-w-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{createError}</span>
          <Button variant="ghost" size="icon-xs" className="h-5 w-5 shrink-0" onClick={() => setCreateError(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* AI Design modal */}
      <AiDesignHomeModal open={showAiDesign} onOpenChange={setShowAiDesign} />

      {/* Hidden PSD file input */}
      <input
        ref={psdFileRef}
        type="file"
        accept=".psd"
        onChange={(e) => handlePsdImport(e.target.files)}
        className="hidden"
      />
    </div>
  )
}
