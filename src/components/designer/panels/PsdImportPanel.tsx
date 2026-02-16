'use client'

// ===========================================================================
// PsdImportPanel — import .psd files, preview layers, add to canvas
// Uses: shadcn Button, ScrollArea, Progress, Badge
// ===========================================================================
import { useState, useRef, useCallback } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { importPsdToCanvas, previewPsd } from '@/lib/designer/psdImporter'
import type { PsdImportResult } from '@/lib/designer/psdImporter'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  FileImage,
  Upload,
  Layers,
  Type,
  Image as ImageIcon,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

type ImportStep = 'idle' | 'previewing' | 'preview' | 'importing' | 'done' | 'error'

interface PsdPreview {
  width: number
  height: number
  layers: Array<{ name: string; type: 'text' | 'image' | 'group'; visible: boolean }>
}

export default function PsdImportPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)
  const refreshLayers = useDocumentStore(s => s.refreshLayers)

  const [step, setStep] = useState<ImportStep>('idle')
  const [preview, setPreview] = useState<PsdPreview | null>(null)
  const [result, setResult] = useState<PsdImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedFileRef = useRef<File | null>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.psd')) {
      setError('Please select a .psd file')
      setStep('error')
      return
    }

    setFileName(file.name)
    selectedFileRef.current = file
    setStep('previewing')
    setError(null)
    setResult(null)

    try {
      const prev = await previewPsd(file)
      setPreview(prev)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read PSD file')
      setStep('error')
    }
  }, [])

  const handleImport = useCallback(async () => {
    const file = selectedFileRef.current
    if (!file || !canvas) return

    setStep('importing')
    setError(null)

    try {
      const state = useDocumentStore.getState()
      const p = state.project
      const importResult = await importPsdToCanvas(file, canvas, {
        pushUndo,
        markDirty,
        refreshLayers,
        designWidth: p?.width,
        designHeight: p?.height,
        onResize: async (w, h) => {
          // 1. Resize artboard on the canvas instance
          const resize = (canvas as any).__resizeArtboard
          if (typeof resize === 'function') resize(w, h)

          // 2. Update project dimensions in DB
          if (p?.id) {
            try {
              await fetch(`/api/designer/${p.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ width: w, height: h }),
              })
            } catch (e) {
              console.warn('[PSD Import] Failed to update project dimensions', e)
            }
          }

          // 3. Update store
          if (p) {
            useDocumentStore.getState().setProject({ ...p, width: w, height: h })
          }
          const pgId = state.currentPageId
          if (pgId) {
            useDocumentStore.getState().updatePage(pgId, { width: w, height: h })
          }
        },
      })
      setResult(importResult)
      setStep('done')

      // Trigger an immediate save so the import persists
      setTimeout(() => {
        const saveFn = (window as any).__designerSave
        if (typeof saveFn === 'function') saveFn()
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import PSD')
      setStep('error')
    }
  }, [canvas, pushUndo, markDirty, refreshLayers])

  const handleReset = useCallback(() => {
    setStep('idle')
    setPreview(null)
    setResult(null)
    setError(null)
    setFileName('')
    selectedFileRef.current = null
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const layerIcon = (type: 'text' | 'image' | 'group') => {
    switch (type) {
      case 'text': return <Type className="h-3.5 w-3.5 text-blue-500" />
      case 'group': return <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
      default: return <ImageIcon className="h-3.5 w-3.5 text-green-500" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800 mb-1">Import PSD</h3>
        <p className="text-[11px] text-muted-foreground">
          Import Adobe Photoshop files with layers preserved
        </p>
      </div>

      <ScrollArea className="flex-1 p-3">
        {/* Idle — File picker / drop zone */}
        {step === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <FileImage className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">Drop a .psd file here</p>
            <p className="text-[11px] text-muted-foreground mb-3">or click to browse</p>
            <Button size="sm" variant="outline" className="text-xs">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Select PSD file
            </Button>
          </div>
        )}

        {/* Previewing — Loading state */}
        {step === 'previewing' && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">Reading PSD file...</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">{fileName}</p>
          </div>
        )}

        {/* Preview — Show layers and import button */}
        {step === 'preview' && preview && (
          <div className="space-y-3">
            {/* File info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileImage className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-gray-800 truncate flex-1">{fileName}</span>
              </div>
              <div className="flex gap-3 text-[11px] text-muted-foreground">
                <span>{preview.width} × {preview.height}px</span>
                <span>{preview.layers.length} layers</span>
              </div>
            </div>

            {/* Layer list */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-700">Layers</span>
              </div>
              <div className="space-y-0.5 max-h-[300px] overflow-auto">
                {preview.layers.map((layer, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                      layer.visible ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {layerIcon(layer.type)}
                    <span className="truncate flex-1">{layer.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0"
                    >
                      {layer.type}
                    </Badge>
                    {!layer.visible && (
                      <span className="text-[9px] text-muted-foreground">(hidden)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Import actions */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 text-xs" onClick={handleImport}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Import to Canvas
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Importing — Progress */}
        {step === 'importing' && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-700 font-medium">Importing layers...</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Converting PSD layers to canvas objects
            </p>
            <Progress value={50} className="mt-4 h-1.5" />
          </div>
        )}

        {/* Done — Success */}
        {step === 'done' && result && (
          <div className="space-y-3">
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-400">Import Complete</p>
              <p className="text-[11px] text-green-400/70 mt-1">
                {result.layerCount} layer{result.layerCount !== 1 ? 's' : ''} imported
              </p>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-amber-500/10 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">
                    {result.errors.length} warning{result.errors.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-amber-400/80">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" className="w-full text-xs" onClick={handleReset}>
              Import Another PSD
            </Button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-500/10 rounded-lg p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-400">Import Failed</p>
              <p className="text-[11px] text-red-400/70 mt-1">{error}</p>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".psd"
        onChange={e => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  )
}
