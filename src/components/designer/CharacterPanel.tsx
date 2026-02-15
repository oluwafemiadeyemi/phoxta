'use client'

// ===========================================================================
// CharacterPanel — standalone collapsible panel for text Character + Paragraph
// Appears between LayersTree and RightPanel when a text object is selected.
// Supports per-character styling when text is selected inside a textbox.
// ===========================================================================
import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { FONT_OPTIONS } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Baseline,
  ChevronDown,
  Type,
} from 'lucide-react'
import { Section, NumInput, ColorInput } from './PropertyControls'

type StrField = 'fill' | 'stroke' | 'fontFamily' | 'fontWeight' | 'textAlign' | 'fontStyle' | 'underline' | 'overline' | 'linethrough'

// Character-level properties that can be applied per selection
const CHAR_LEVEL_PROPS = new Set([
  'fill', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
  'underline', 'overline', 'linethrough', 'charSpacing',
])

/** Check whether the text object has an active text range selection */
function hasTextSelection(obj: any): boolean {
  return obj?.isEditing && obj.selectionStart !== obj.selectionEnd
}

export default function CharacterPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const activeObjectIds = useDocumentStore(s => s.activeObjectIds)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)

  const [collapsed, setCollapsed] = useState(false)
  const [props, setProps] = useState<Record<string, any>>({})
  const trackedObjRef = useRef<any>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Properties that affect text dimensions and need initDimensions
  const DIMENSION_PROPS = new Set(['fontSize', 'fontFamily', 'fontWeight', 'charSpacing'])

  // ---------- refresh text properties ----------
  const refresh = useCallback(() => {
    if (!canvas) return
    const active = canvas.getActiveObject() as any
    if (!active) { setProps({}); return }
    const isText = active.type === 'textbox' || active.type === 'i-text' || active.type === 'text'
    if (!isText) { setProps({}); return }

    // If textbox is in editing mode with a text range selected,
    // read the styles from the first character in the selection.
    if (hasTextSelection(active)) {
      const start = Math.min(active.selectionStart, active.selectionEnd)
      const style = active.getStyleAtPosition(start, true) ?? {}
      setProps({
        isText: true,
        fill: style.fill ?? active.fill ?? '#000000',
        stroke: active.stroke ?? '',
        fontSize: style.fontSize ?? active.fontSize ?? 16,
        fontFamily: style.fontFamily ?? active.fontFamily ?? 'Inter',
        fontWeight: style.fontWeight ?? active.fontWeight ?? 'normal',
        textAlign: active.textAlign ?? 'left',
        fontStyle: style.fontStyle ?? active.fontStyle ?? 'normal',
        underline: style.underline ?? active.underline ?? false,
        overline: style.overline ?? active.overline ?? false,
        linethrough: style.linethrough ?? active.linethrough ?? false,
        lineHeight: active.lineHeight ?? 1.16,
        charSpacing: style.charSpacing ?? active.charSpacing ?? 0,
      })
    } else {
      setProps({
        isText: true,
        fill: active.fill ?? '#000000',
        stroke: active.stroke ?? '',
        fontSize: active.fontSize ?? 16,
        fontFamily: active.fontFamily ?? 'Inter',
        fontWeight: active.fontWeight ?? 'normal',
        textAlign: active.textAlign ?? 'left',
        fontStyle: active.fontStyle ?? 'normal',
        underline: active.underline ?? false,
        overline: active.overline ?? false,
        linethrough: active.linethrough ?? false,
        lineHeight: active.lineHeight ?? 1.16,
        charSpacing: active.charSpacing ?? 0,
      })
    }
  }, [canvas])

  useEffect(() => { refresh() }, [activeObjectIds, refresh])

  // Listen for object:modified AND textbox selection/editing events
  useEffect(() => {
    if (!canvas) return
    const handler = () => refresh()
    canvas.on('object:modified', handler)
    return () => { canvas.off('object:modified', handler) }
  }, [canvas, refresh])

  // Track editing & selection events on the active textbox
  useEffect(() => {
    if (!canvas) return
    const active = canvas.getActiveObject() as any
    const isText = active && (active.type === 'textbox' || active.type === 'i-text' || active.type === 'text')
    if (!isText) { trackedObjRef.current = null; return }

    // Avoid double-binding if same object
    if (trackedObjRef.current === active) return
    trackedObjRef.current = active

    const onSelChange = () => refresh()
    active.on('selection:changed', onSelChange)
    active.on('editing:entered', onSelChange)
    active.on('editing:exited', onSelChange)
    active.on('changed', onSelChange)

    return () => {
      active.off('selection:changed', onSelChange)
      active.off('editing:entered', onSelChange)
      active.off('editing:exited', onSelChange)
      active.off('changed', onSelChange)
      trackedObjRef.current = null
    }
  }, [canvas, activeObjectIds, refresh])

  // Don't render if no text object is selected
  if (!props.isText) return null

  const active = canvas?.getActiveObject() as any
  if (!active) return null

  /**
   * Deferred undo snapshot — captures state BEFORE the mutation,
   * but defers the expensive toJSON() so the UI updates instantly.
   */
  const deferredUndo = (label: string) => {
    // Debounce rapid changes (e.g. slider drag) into a single undo entry
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      pushUndo(label)
      undoTimerRef.current = null
    }, 300)
  }

  /** Apply property to Fabric object + re-render canvas instantly */
  const applyProp = (key: string, value: any) => {
    if (!active || !canvas) return

    if (CHAR_LEVEL_PROPS.has(key) && hasTextSelection(active)) {
      const start = Math.min(active.selectionStart, active.selectionEnd)
      const end = Math.max(active.selectionStart, active.selectionEnd)
      active.setSelectionStyles({ [key]: value }, start, end)
    } else {
      active.set(key as any, value)
    }

    // Only recalc dimensions for properties that change text layout
    if (DIMENSION_PROPS.has(key) && typeof active.initDimensions === 'function') {
      active.initDimensions()
      active.setCoords()
    }
    canvas.requestRenderAll()
  }

  /**
   * Set a text property. Updates UI optimistically for instant feedback.
   */
  const setStr = (key: StrField, value: any) => {
    if (!active || !canvas) return
    deferredUndo(`Set ${key}`)
    applyProp(key, value)
    markDirty()
    // Optimistic state update — skip the full refresh() read-back
    startTransition(() => setProps(prev => ({ ...prev, [key]: value })))
  }

  /**
   * Set a character-level numeric property (fontSize, charSpacing).
   */
  const setCharNum = (key: string, value: number) => {
    if (!active || !canvas) return
    deferredUndo(`Set ${key}`)
    applyProp(key, value)
    markDirty()
    startTransition(() => setProps(prev => ({ ...prev, [key]: value })))
  }

  return (
    <div className="w-full md:w-56 bg-[#18181b] border-t border-white/[0.06] flex flex-col overflow-hidden shrink-0">
      {/* Header (collapsible) */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="p-3 border-b border-white/[0.04] flex items-center justify-between w-full hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-200">Character</h3>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {!collapsed && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {/* ===== CHARACTER ===== */}
            <Section title="Font & Style" defaultOpen>
              <div className="space-y-2">
                {/* Font family & Weight row */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Font</Label>
                  <div className="flex gap-1">
                    <Select
                      value={props.fontFamily}
                      onValueChange={v => setStr('fontFamily', v)}
                    >
                      <SelectTrigger size="sm" className="text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(f => (
                          <SelectItem key={f.family} value={f.family} className="text-xs">
                            {f.family}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(props.fontWeight)}
                      onValueChange={v => setStr('fontWeight', isNaN(Number(v)) ? v : Number(v))}
                    >
                      <SelectTrigger size="sm" className="text-xs w-[72px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                        <SelectItem value="300" className="text-xs">Light</SelectItem>
                        <SelectItem value="500" className="text-xs">Medium</SelectItem>
                        <SelectItem value="600" className="text-xs">Semi</SelectItem>
                        <SelectItem value="bold" className="text-xs">Bold</SelectItem>
                        <SelectItem value="800" className="text-xs">Extra</SelectItem>
                        <SelectItem value="900" className="text-xs">Black</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Size + Style toggles row */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Size</Label>
                  <div className="flex items-center gap-1">
                    <div className="w-14 shrink-0">
                      <NumInput label="" value={props.fontSize} onChange={v => {
                        setCharNum('fontSize', v)
                      }} min={6} max={500} />
                    </div>
                    <div className="flex gap-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={(props.fontWeight === 'bold' || props.fontWeight >= 700) ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setStr('fontWeight', props.fontWeight === 'bold' || props.fontWeight >= 700 ? 'normal' : 'bold')}
                          >
                            <Bold className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Bold</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={props.fontStyle === 'italic' ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setStr('fontStyle', props.fontStyle === 'italic' ? 'normal' : 'italic')}
                          >
                            <Italic className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Italic</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={props.underline ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setStr('underline', !props.underline)}
                          >
                            <Underline className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Underline</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={props.linethrough ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setStr('linethrough', !props.linethrough)}
                          >
                            <Strikethrough className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Strikethrough</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={props.overline ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setStr('overline', !props.overline)}
                          >
                            <Baseline className="h-3 w-3 rotate-180" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>Overline</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Text color */}
                <ColorInput label="Color" value={typeof props.fill === 'string' ? props.fill : '#000000'}
                  onChange={v => setStr('fill', v)} />

                {/* Letter Spacing */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Letter Spacing</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[props.charSpacing ?? 0]}
                      onValueChange={([v]) => {
                        setCharNum('charSpacing', v)
                      }}
                      min={-200}
                      max={800}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{props.charSpacing ?? 0}</span>
                  </div>
                </div>
              </div>
            </Section>

            <Separator />

            {/* ===== PARAGRAPH ===== */}
            <Section title="Paragraph" defaultOpen>
              <div className="space-y-2">
                {/* Text alignment */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Alignment</Label>
                  <div className="flex gap-0.5">
                    {[
                      { v: 'left', icon: <AlignLeft className="h-3.5 w-3.5" />, tip: 'Left' },
                      { v: 'center', icon: <AlignCenter className="h-3.5 w-3.5" />, tip: 'Center' },
                      { v: 'right', icon: <AlignRight className="h-3.5 w-3.5" />, tip: 'Right' },
                      { v: 'justify', icon: <AlignJustify className="h-3.5 w-3.5" />, tip: 'Justify' },
                    ].map(a => (
                      <Tooltip key={a.v}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={props.textAlign === a.v ? 'secondary' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => setStr('textAlign', a.v)}
                          >
                            {a.icon}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>{a.tip}</p></TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {/* Line height */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Line Height</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[Math.round((props.lineHeight ?? 1.16) * 100)]}
                      onValueChange={([v]) => {
                        const lh = v / 100
                        deferredUndo('Line height')
                        active.set('lineHeight' as any, lh)
                        if (typeof active.initDimensions === 'function') active.initDimensions()
                        active.setCoords()
                        canvas!.requestRenderAll(); markDirty()
                        startTransition(() => setProps(prev => ({ ...prev, lineHeight: lh })))
                      }}
                      min={50}
                      max={300}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{(props.lineHeight ?? 1.16).toFixed(2)}</span>
                  </div>
                </div>

                {/* Text transform */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Transform</Label>
                  <div className="flex gap-0.5">
                    {[
                      { v: 'none', label: 'Aa', tip: 'None' },
                      { v: 'uppercase', label: 'AA', tip: 'Uppercase' },
                      { v: 'lowercase', label: 'aa', tip: 'Lowercase' },
                      { v: 'capitalize', label: 'Ab', tip: 'Capitalize' },
                    ].map(t => (
                      <Tooltip key={t.v}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={((active as any).textTransform ?? 'none') === t.v ? 'secondary' : 'outline'}
                            size="sm"
                            className="flex-1 text-[10px] font-semibold"
                            onClick={() => {
                              deferredUndo('Text transform')
                              ;(active as any).textTransform = t.v
                              canvas!.requestRenderAll()
                              markDirty()
                              startTransition(() => setProps(prev => ({ ...prev })))
                            }}
                          >
                            {t.label}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom"><p>{t.tip}</p></TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
