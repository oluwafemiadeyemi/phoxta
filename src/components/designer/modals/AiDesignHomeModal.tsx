'use client'

// ===========================================================================
// AiDesignHomeModal — AI design creation from the Designer home page
// Creates a new project with the right dimensions, then redirects to the
// editor with ?aiDesign= query param to auto-trigger generation.
// ===========================================================================
import { useState } from 'react'
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
import { Sparkles, Loader2 } from 'lucide-react'

const FORMAT_OPTIONS = [
  { value: 'instagram-post',      label: 'Instagram Post',      width: 1080, height: 1080 },
  { value: 'instagram-carousel',  label: 'Instagram Carousel',  width: 1080, height: 1080 },
  { value: 'instagram-story',     label: 'Instagram Story',     width: 1080, height: 1920 },
  { value: 'facebook-post',       label: 'Facebook Post',       width: 1200, height: 630  },
  { value: 'twitter-post',        label: 'Twitter/X Post',      width: 1600, height: 900  },
  { value: 'presentation',        label: 'Presentation',        width: 1920, height: 1080 },
  { value: 'poster',              label: 'Poster',              width: 2480, height: 3508 },
  { value: 'other',               label: 'Other (1080×1080)',   width: 1080, height: 1080 },
]

interface AiDesignHomeModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function AiDesignHomeModal({ open, onOpenChange }: AiDesignHomeModalProps) {
  const [prompt, setPrompt] = useState('')
  const [format, setFormat] = useState('instagram-post')
  const [pageCount, setPageCount] = useState(5)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const isCarousel = format.includes('carousel') || format === 'presentation'
  const selected = FORMAT_OPTIONS.find((f) => f.value === format) ?? FORMAT_OPTIONS[0]

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setCreating(true)
    setError('')

    try {
      // 1. Create a new project with the correct dimensions
      const projectName = prompt.trim().slice(0, 60) || 'AI Design'
      const res = await fetch('/api/designer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          width: selected.width,
          height: selected.height,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to create project (${res.status})`)
      }

      const project = await res.json()

      // 2. Encode AI design request and redirect to editor
      const aiRequest = {
        prompt: prompt.trim(),
        format,
        pageCount: isCarousel ? pageCount : 1,
      }
      const encoded = btoa(JSON.stringify(aiRequest))

      window.location.href = `/app/designer/${project.id}?aiDesign=${encoded}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!creating) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Design
          </DialogTitle>
          <DialogDescription>
            Describe your design and AI will create a new project for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="ai-home-prompt" className="text-xs font-medium">
              What do you want to design?
            </Label>
            <Textarea
              id="ai-home-prompt"
              placeholder="e.g. Instagram carousel about the benefits of vitamin C for skin health, use warm orange tones"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={creating}
              className="text-sm resize-none"
            />
          </div>

          {/* Format */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Format</Label>
              <Select value={format} onValueChange={setFormat} disabled={creating}>
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

            {/* Page count (only for carousels / presentations) */}
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
                  disabled={creating}
                  className="mt-3"
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Dimension hint */}
          <p className="text-[10px] text-muted-foreground">
            Canvas: {selected.width}×{selected.height}px • A new project will be created
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={creating || !prompt.trim()}
            className="text-xs bg-violet-600 hover:bg-violet-700"
          >
            {creating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Creating…
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
