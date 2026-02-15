'use client'

// ===========================================================================
// RightPanel — unified right panel with Page + Item properties
// Page sections always visible; Item sections appear when an object is selected.
// All sections are collapsible.
// ===========================================================================
import { useState, useEffect, useCallback } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import type { PageBackground } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  BringToFront,
  SendToBack,
  Trash2,
  ChevronDown,
  Settings2,
} from 'lucide-react'
import { Section, NumInput, ColorInput } from './PropertyControls'

type NumField = 'left' | 'top' | 'width' | 'height' | 'angle' | 'opacity' | 'strokeWidth' | 'rx' | 'ry'
type StrField = 'fill' | 'stroke'

export default function RightPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const activeObjectIds = useDocumentStore(s => s.activeObjectIds)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)
  const refreshLayers = useDocumentStore(s => s.refreshLayers)
  const project = useDocumentStore(s => s.project)
  const pages = useDocumentStore(s => s.pages)
  const currentPageId = useDocumentStore(s => s.currentPageId)
  const updatePage = useDocumentStore(s => s.updatePage)
  const { rightPanelOpen } = useUIStore()

  const [props, setProps] = useState<Record<string, any>>({})
  const [collapsed, setCollapsed] = useState(false)

  // ---------- Item property refresh ----------
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

  // ---------- Page properties ----------
  const currentPage = pages.find(p => p.id === currentPageId)
  const pageW = currentPage?.width ?? project?.width ?? 1080
  const pageH = currentPage?.height ?? project?.height ?? 1080
  const bg = currentPage?.background ?? { type: 'color' as const, value: '#ffffff' }

  const handleBgChange = (color: string) => {
    if (!currentPageId) return
    const newBg: PageBackground = { type: 'color', value: color }
    updatePage(currentPageId, { background: newBg })
    markDirty()
    if (canvas) {
      ;(canvas as any).__artboardFill = color
      canvas.requestRenderAll()
    }
  }

  // ---------- Item helpers ----------
  const active = canvas?.getActiveObject()
  const hasSelection = active && activeObjectIds.length > 0

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
    <div className="w-full md:w-56 bg-[#18181b] border-t border-white/[0.06] flex flex-col overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="p-3 border-b border-white/[0.04] flex items-center justify-between w-full hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-200">Properties</h3>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {!collapsed && (
      <ScrollArea className="flex-1">
        {/* ===== PAGE PROPERTIES ===== */}
        <Section title="Canvas">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground w-5 shrink-0">W</Label>
              <span className="text-xs text-zinc-300">{pageW}px</span>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground w-5 shrink-0">H</Label>
              <span className="text-xs text-zinc-300">{pageH}px</span>
            </div>
          </div>
        </Section>

        <Separator />

        <Section title="Background">
          <ColorInput
            label="Color"
            value={bg.type === 'color' ? bg.value : '#ffffff'}
            onChange={handleBgChange}
          />
        </Section>

        <Separator />

        <Section title="Project" defaultOpen={false}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground w-12 shrink-0">Name</Label>
              <span className="text-xs text-zinc-300 truncate">{project?.name ?? 'Untitled'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] text-muted-foreground w-12 shrink-0">Pages</Label>
              <span className="text-xs text-zinc-300">{pages.length}</span>
            </div>
          </div>
        </Section>

        {/* ===== ITEM PROPERTIES (when selected) ===== */}
        {hasSelection && (
          <>
            <Separator className="my-1" />
            <div className="px-3 py-1.5">
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                Selected Item
              </span>
            </div>

            {/* Position & Size */}
            <Section title="Position & Size">
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
          </>
        )}
      </ScrollArea>
      )}
    </div>
  )
}
