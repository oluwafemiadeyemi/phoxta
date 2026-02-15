'use client'

// ===========================================================================
// RightInspector — contextual property editor for selected objects
// Only visible when an object/layer is selected on the canvas.
// ===========================================================================
import { useState, useEffect, useCallback } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
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
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Bold,
  Italic,
  Underline,
  BringToFront,
  SendToBack,
  Trash2,
} from 'lucide-react'
import { Section, NumInput, ColorInput } from './PropertyControls'

type NumField = 'left' | 'top' | 'width' | 'height' | 'angle' | 'opacity' | 'strokeWidth' | 'rx' | 'ry' | 'fontSize'
type StrField = 'fill' | 'stroke' | 'fontFamily' | 'fontWeight' | 'textAlign' | 'fontStyle' | 'underline'

export default function RightInspector() {
  const canvas = useDocumentStore(s => s.canvas)
  const activeObjectIds = useDocumentStore(s => s.activeObjectIds)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)
  const refreshLayers = useDocumentStore(s => s.refreshLayers)
  const { rightPanelOpen } = useUIStore()

  const [props, setProps] = useState<Record<string, any>>({})

  const refresh = useCallback(() => {
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active) { setProps({}); return }
    const bounds = active.getBoundingRect()
    setProps({
      left: Math.round(active.left ?? 0),
      top: Math.round(active.top ?? 0),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      angle: Math.round(active.angle ?? 0),
      opacity: Math.round((active.opacity ?? 1) * 100),
      fill: active.fill ?? '#000000',
      stroke: active.stroke ?? '',
      strokeWidth: active.strokeWidth ?? 0,
      rx: (active as any).rx ?? 0,
      ry: (active as any).ry ?? 0,
      isText: active.type === 'textbox' || active.type === 'i-text' || active.type === 'text',
      fontSize: (active as any).fontSize ?? 16,
      fontFamily: (active as any).fontFamily ?? 'Inter',
      fontWeight: (active as any).fontWeight ?? 'normal',
      textAlign: (active as any).textAlign ?? 'left',
      fontStyle: (active as any).fontStyle ?? 'normal',
      underline: (active as any).underline ?? false,
      lineHeight: (active as any).lineHeight ?? 1.16,
      charSpacing: (active as any).charSpacing ?? 0,
    })
  }, [canvas])

  useEffect(() => { refresh() }, [activeObjectIds, refresh])

  useEffect(() => {
    if (!canvas) return
    const handler = () => refresh()
    canvas.on('object:modified', handler)
    canvas.on('object:scaling', handler)
    canvas.on('object:moving', handler)
    canvas.on('object:rotating', handler)
    return () => {
      canvas.off('object:modified', handler)
      canvas.off('object:scaling', handler)
      canvas.off('object:moving', handler)
      canvas.off('object:rotating', handler)
    }
  }, [canvas, refresh])

  if (!rightPanelOpen) return null

  const active = canvas?.getActiveObject()
  if (!active || activeObjectIds.length === 0) return null

  const setNum = (key: NumField, value: number) => {
    if (!active || !canvas) return
    pushUndo(`Set ${key}`)
    if (key === 'opacity') {
      active.set('opacity', value / 100)
    } else if (key === 'width') {
      const scaleX = value / (active.width ?? 1)
      active.set('scaleX', scaleX)
    } else if (key === 'height') {
      const scaleY = value / (active.height ?? 1)
      active.set('scaleY', scaleY)
    } else {
      active.set(key as any, value)
    }
    canvas.requestRenderAll()
    markDirty()
    refresh()
  }

  const setStr = (key: StrField, value: any) => {
    if (!active || !canvas) return
    pushUndo(`Set ${key}`)
    active.set(key as any, value)
    canvas.requestRenderAll()
    markDirty()
    refresh()
  }

  const handleAlign = (align: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!active || !canvas) return
    pushUndo(`Align ${align}`)
    const cw = canvas.width ?? 800
    const ch = canvas.height ?? 600
    const bounds = active.getBoundingRect()
    switch (align) {
      case 'left': active.set('left', 0); break
      case 'center': active.set('left', (cw - bounds.width) / 2); break
      case 'right': active.set('left', cw - bounds.width); break
      case 'top': active.set('top', 0); break
      case 'middle': active.set('top', (ch - bounds.height) / 2); break
      case 'bottom': active.set('top', ch - bounds.height); break
    }
    canvas.requestRenderAll()
    markDirty()
    refresh()
  }

  const alignIcons = [
    { key: 'left' as const, icon: <AlignStartVertical className="h-3.5 w-3.5" />, tip: 'Align left' },
    { key: 'center' as const, icon: <AlignCenterVertical className="h-3.5 w-3.5" />, tip: 'Center horizontally' },
    { key: 'right' as const, icon: <AlignEndVertical className="h-3.5 w-3.5" />, tip: 'Align right' },
    { key: 'top' as const, icon: <AlignStartVertical className="h-3.5 w-3.5 rotate-90" />, tip: 'Align top' },
    { key: 'middle' as const, icon: <AlignCenterVertical className="h-3.5 w-3.5 rotate-90" />, tip: 'Center vertically' },
    { key: 'bottom' as const, icon: <AlignEndVertical className="h-3.5 w-3.5 rotate-90" />, tip: 'Align bottom' },
  ]

  return (
    <div className="w-full md:w-64 bg-[#18181b] border-l border-white/[0.06] flex flex-col overflow-hidden shrink-0">
      <div className="p-3 border-b border-white/[0.04]">
        <h3 className="text-xs font-semibold text-zinc-200">Item Properties</h3>
      </div>

      <ScrollArea className="flex-1">
        {/* Position & Size */}
        <Section title="Position">
          <div className="grid grid-cols-2 gap-1.5">
            <NumInput label="X" value={props.left} onChange={v => setNum('left', v)} />
            <NumInput label="Y" value={props.top} onChange={v => setNum('top', v)} />
            <NumInput label="W" value={props.width} onChange={v => setNum('width', v)} min={1} />
            <NumInput label="H" value={props.height} onChange={v => setNum('height', v)} min={1} />
            <NumInput label="R" value={props.angle} onChange={v => setNum('angle', v)} suffix="°" />
          </div>
          <div className="mt-2">
            <Label className="text-[10px] text-muted-foreground">Opacity</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[props.opacity ?? 100]}
                onValueChange={([v]) => setNum('opacity', v)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-8 text-right">{props.opacity}%</span>
            </div>
          </div>
        </Section>

        <Separator />

        {/* Alignment */}
        <Section title="Align">
          <div className="flex gap-0.5">
            {alignIcons.map(a => (
              <Tooltip key={a.key}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleAlign(a.key)}>
                    {a.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{a.tip}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
        </Section>

        <Separator />

        {/* Fill & Stroke */}
        <Section title="Fill & Stroke">
          <div className="space-y-2">
            <ColorInput label="Fill" value={typeof props.fill === 'string' ? props.fill : '#000000'}
              onChange={v => setStr('fill', v)} />
            <ColorInput label="Stroke" value={props.stroke || ''}
              onChange={v => setStr('stroke', v)} />
            <NumInput label="Stroke W" value={props.strokeWidth} onChange={v => setNum('strokeWidth', v)} min={0} />
            {(active as any).rx !== undefined && (
              <NumInput label="Radius" value={props.rx} onChange={v => { setNum('rx', v); setNum('ry', v) }} min={0} />
            )}
          </div>
        </Section>

        <Separator />

        {/* Typography (for text objects) */}
        {props.isText && (
          <>
            <Section title="Typography">
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Font</Label>
                  <Select
                    value={props.fontFamily}
                    onValueChange={v => setStr('fontFamily', v)}
                  >
                    <SelectTrigger size="sm" className="text-xs">
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
                </div>

                <NumInput label="Size" value={props.fontSize} onChange={v => {
                  active.set('fontSize' as any, v); canvas!.requestRenderAll(); markDirty(); refresh()
                }} min={6} max={500} />

                <div>
                  <Label className="text-[10px] text-muted-foreground">Weight</Label>
                  <Select
                    value={String(props.fontWeight)}
                    onValueChange={v => setStr('fontWeight', isNaN(Number(v)) ? v : Number(v))}
                  >
                    <SelectTrigger size="sm" className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                      <SelectItem value="bold" className="text-xs">Bold</SelectItem>
                      <SelectItem value="300" className="text-xs">Light (300)</SelectItem>
                      <SelectItem value="500" className="text-xs">Medium (500)</SelectItem>
                      <SelectItem value="600" className="text-xs">Semibold (600)</SelectItem>
                      <SelectItem value="700" className="text-xs">Bold (700)</SelectItem>
                      <SelectItem value="800" className="text-xs">Extra Bold (800)</SelectItem>
                      <SelectItem value="900" className="text-xs">Black (900)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Style toggles */}
                <div className="flex gap-0.5">
                  <Button
                    variant={props.fontStyle === 'italic' ? 'secondary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStr('fontStyle', props.fontStyle === 'italic' ? 'normal' : 'italic')}
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={props.underline ? 'secondary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStr('underline', !props.underline)}
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={(props.fontWeight === 'bold' || props.fontWeight >= 700) ? 'secondary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setStr('fontWeight', props.fontWeight === 'bold' || props.fontWeight >= 700 ? 'normal' : 'bold')}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Text alignment */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Text Align</Label>
                  <div className="flex gap-0.5">
                    {[
                      { v: 'left', icon: <AlignLeft className="h-3.5 w-3.5" /> },
                      { v: 'center', icon: <AlignCenter className="h-3.5 w-3.5" /> },
                      { v: 'right', icon: <AlignRight className="h-3.5 w-3.5" /> },
                    ].map(a => (
                      <Button
                        key={a.v}
                        variant={props.textAlign === a.v ? 'secondary' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setStr('textAlign', a.v)}
                      >
                        {a.icon}
                      </Button>
                    ))}
                  </div>
                </div>

                <ColorInput label="Color" value={typeof props.fill === 'string' ? props.fill : '#000000'}
                  onChange={v => setStr('fill', v)} />
              </div>
            </Section>
            <Separator />
          </>
        )}

        {/* Actions */}
        <Section title="Actions">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => {
              if (!canvas || !active) return
              pushUndo('Bring to front')
              canvas.bringObjectToFront(active)
              canvas.requestRenderAll()
              markDirty()
              refreshLayers()
            }}>
              <BringToFront className="mr-2 h-3.5 w-3.5" /> Bring to front
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => {
              if (!canvas || !active) return
              pushUndo('Send to back')
              canvas.sendObjectToBack(active)
              canvas.requestRenderAll()
              markDirty()
              refreshLayers()
            }}>
              <SendToBack className="mr-2 h-3.5 w-3.5" /> Send to back
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-destructive hover:text-destructive" onClick={() => {
              if (!canvas || !active) return
              pushUndo('Delete')
              canvas.remove(active)
              canvas.discardActiveObject()
              canvas.requestRenderAll()
              markDirty()
              refreshLayers()
            }}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </Section>
      </ScrollArea>
    </div>
  )
}
