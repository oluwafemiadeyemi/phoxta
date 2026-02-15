'use client'

// ===========================================================================
// AiDesignModal — prompt-driven AI design generation
// Uses: shadcn Dialog, Button, Input, Select, Slider, Label
// ===========================================================================
import { useState } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { assemblePageOnCanvas } from '@/lib/designer/aiCanvasAssembler'
import type { AIDesignResponse } from '@/types/aiDesign'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Sparkles, Loader2, Wand2, AlertCircle } from 'lucide-react'

const FORMAT_OPTIONS = [
  { value: 'instagram-post', label: 'Instagram Post' },
  { value: 'instagram-carousel', label: 'Instagram Carousel' },
  { value: 'instagram-story', label: 'Instagram Story' },
  { value: 'facebook-post', label: 'Facebook Post' },
  { value: 'twitter-post', label: 'Twitter/X Post' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'poster', label: 'Poster' },
  { value: 'other', label: 'Other' },
]

type GenerationStep = 'idle' | 'planning' | 'images' | 'layout' | 'assembling' | 'done' | 'error'

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: '',
  planning: 'Planning content with AI…',
  images: 'Finding images…',
  layout: 'Building layouts…',
  assembling: 'Assembling on canvas…',
  done: 'Design generated!',
  error: 'Generation failed',
}

export default function AiDesignModal() {
  const { aiDesignModalOpen, setAiDesignModalOpen } = useUIStore()
  const { canvas, project, pushUndo, markDirty, refreshLayers } = useDocumentStore()

  const [prompt, setPrompt] = useState('')
  const [format, setFormat] = useState('instagram-post')
  const [pageCount, setPageCount] = useState(1)
  const [step, setStep] = useState<GenerationStep>('idle')
  const [error, setError] = useState('')

  const isCarousel = format.includes('carousel') || format === 'presentation'
  const dw = project?.width ?? 1080
  const dh = project?.height ?? 1080

  const handleGenerate = async () => {
    if (!prompt.trim() || !canvas) return

    setStep('planning')
    setError('')

    try {
      const res = await fetch('/api/designer/ai-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          format,
          pageCount: isCarousel ? pageCount : 1,
          designWidth: dw,
          designHeight: dh,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error (${res.status})`)
      }

      setStep('images') // Visual feedback — images were already fetched server-side

      const data = (await res.json()) as AIDesignResponse

      setStep('layout')
      await new Promise((r) => setTimeout(r, 300)) // Brief visual step

      setStep('assembling')

      // Assemble the first page on the current canvas
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

      // If there are additional pages, log them for now
      // (Multi-page assembly requires creating new pages via the pages API,
      //  which we can add as a follow-up feature)
      if (data.pageSpecs.length > 1) {
        console.info(
          `[AI Design] Generated ${data.pageSpecs.length} pages. ` +
          `First page assembled on canvas. Additional pages available for future multi-page support.`,
        )
      }

      setStep('done')

      // Auto-close after brief success state
      setTimeout(() => {
        setAiDesignModalOpen(false)
        setStep('idle')
      }, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setStep('error')
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setAiDesignModalOpen(false)
      if (step === 'done' || step === 'error') {
        setStep('idle')
        setError('')
      }
    }
  }

  const isGenerating = step !== 'idle' && step !== 'done' && step !== 'error'

  return (
    <Dialog open={aiDesignModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Design
          </DialogTitle>
          <DialogDescription>
            Describe your design and let AI create it for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="ai-prompt" className="text-xs font-medium">
              What do you want to design?
            </Label>
            <Textarea
              id="ai-prompt"
              placeholder="e.g. Instagram carousel about the benefits of vitamin C for skin health, use warm orange tones"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={isGenerating}
              className="text-sm resize-none"
            />
          </div>

          {/* Format */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Format</Label>
              <Select value={format} onValueChange={setFormat} disabled={isGenerating}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page count (only for carousels) */}
            {isCarousel && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Slides: {pageCount}
                </Label>
                <Slider
                  value={[pageCount]}
                  onValueChange={([v]) => setPageCount(v)}
                  min={2}
                  max={10}
                  step={1}
                  disabled={isGenerating}
                  className="mt-3"
                />
              </div>
            )}
          </div>

          {/* Progress indicator */}
          {isGenerating && (
            <div className="flex items-center gap-2 p-3 bg-violet-500/10 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span className="text-xs text-violet-300 font-medium">
                {STEP_LABELS[step]}
              </span>
            </div>
          )}

          {/* Success */}
          {step === 'done' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
              <Wand2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-green-300 font-medium">
                {STEP_LABELS[step]}
              </span>
            </div>
          )}

          {/* Error */}
          {step === 'error' && error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {/* Canvas size info */}
          <p className="text-[10px] text-muted-foreground">
            Canvas: {dw}×{dh}px • Images from Pexels • Content by AI
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={isGenerating}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="text-xs bg-violet-600 hover:bg-violet-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Generate Design
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
