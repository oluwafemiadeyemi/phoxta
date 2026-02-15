'use client'

// ===========================================================================
// AdjustmentsPanel — Hue / Saturation / Lightness (+ Contrast) image adjustments
// Visible only when an Image object is selected on the canvas.
// Applies Fabric.js built-in filters in real-time via GPU-accelerated WebGL.
// ===========================================================================
import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react'

// ---- Filter config --------------------------------------------------------
interface FilterDef {
  key: string
  label: string
  /** Fabric filter class name inside `filters` namespace */
  filterType: string
  /** Property name on the filter instance */
  prop: string
  min: number
  max: number
  step: number
  defaultValue: number
  /** Display multiplier (e.g. show -180…180 while value is -1…1) */
  displayMul?: number
  displaySuffix?: string
}

const FILTER_DEFS: FilterDef[] = [
  {
    key: 'hue',
    label: 'Hue',
    filterType: 'HueRotation',
    prop: 'rotation',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
    displayMul: 180,
    displaySuffix: '°',
  },
  {
    key: 'saturation',
    label: 'Saturation',
    filterType: 'Saturation',
    prop: 'saturation',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
  },
  {
    key: 'brightness',
    label: 'Lightness',
    filterType: 'Brightness',
    prop: 'brightness',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
  },
  {
    key: 'contrast',
    label: 'Contrast',
    filterType: 'Contrast',
    prop: 'contrast',
    min: -1,
    max: 1,
    step: 0.01,
    defaultValue: 0,
  },
]

// Map filter type → index in the object.filters array.
// We own slots 0-3 for the four HSL+C filters.
const SLOT_MAP: Record<string, number> = {}
FILTER_DEFS.forEach((d, i) => { SLOT_MAP[d.filterType] = i })

type AdjValues = Record<string, number>

const DEFAULT_VALUES: AdjValues = Object.fromEntries(
  FILTER_DEFS.map(d => [d.key, d.defaultValue]),
)

export default function AdjustmentsPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const activeObjectIds = useDocumentStore(s => s.activeObjectIds)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)

  const [collapsed, setCollapsed] = useState(false)
  const [isImage, setIsImage] = useState(false)
  const [values, setValues] = useState<AdjValues>({ ...DEFAULT_VALUES })

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const applyRAFRef = useRef<number | null>(null)
  const filtersModuleRef = useRef<any>(null)

  // Lazily cache the fabric filters namespace
  const getFilters = useCallback(async () => {
    if (filtersModuleRef.current) return filtersModuleRef.current
    const fabric = await import('fabric')
    filtersModuleRef.current = fabric.filters
    return fabric.filters
  }, [])

  // ---- Read current filter values from the active image ----
  const refresh = useCallback(() => {
    if (!canvas) return
    const active = canvas.getActiveObject() as any
    if (!active || active.type !== 'image') {
      setIsImage(false)
      return
    }
    setIsImage(true)

    const vals = { ...DEFAULT_VALUES }
    const arr: any[] = active.filters ?? []
    for (const def of FILTER_DEFS) {
      const existing = arr.find((f: any) => f?.type === def.filterType)
      if (existing) {
        vals[def.key] = existing[def.prop] ?? def.defaultValue
      }
    }
    setValues(vals)
  }, [canvas])

  // Refresh when selection changes
  useEffect(() => { refresh() }, [activeObjectIds, refresh])

  useEffect(() => {
    if (!canvas) return
    const handler = () => refresh()
    canvas.on('object:modified', handler)
    return () => { canvas.off('object:modified', handler) }
  }, [canvas, refresh])

  // Don't render if no image is selected
  if (!isImage) return null

  const active = canvas?.getActiveObject() as any
  if (!active) return null

  // ---- Deferred undo (debounced 500ms for slider drag) ----
  const deferredUndo = (label: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      pushUndo(label)
      undoTimerRef.current = null
    }, 500)
  }

  // ---- Apply a single filter value ----
  const applyFilter = async (def: FilterDef, value: number) => {
    if (!active || !canvas) return

    const filterNs = await getFilters()
    if (!active.filters) active.filters = []

    // Find or create the filter at the correct slot
    let filter = active.filters.find((f: any) => f?.type === def.filterType)
    if (!filter) {
      const FilterClass = filterNs[def.filterType]
      if (!FilterClass) return
      filter = new FilterClass({ [def.prop]: value })
      active.filters.push(filter)
    } else {
      filter[def.prop] = value
    }

    // Remove neutral-state filters to keep the array clean
    if (filter.isNeutralState?.()) {
      active.filters = active.filters.filter((f: any) => f !== filter)
    }

    // Debounce applyFilters to 1 per frame
    if (applyRAFRef.current) cancelAnimationFrame(applyRAFRef.current)
    applyRAFRef.current = requestAnimationFrame(() => {
      active.applyFilters()
      canvas.requestRenderAll()
      applyRAFRef.current = null
    })
  }

  const handleSlider = (def: FilterDef, value: number) => {
    deferredUndo(`Adjust ${def.label}`)
    applyFilter(def, value)
    markDirty()
    startTransition(() => setValues(prev => ({ ...prev, [def.key]: value })))
  }

  const handleReset = () => {
    pushUndo('Reset adjustments')
    active.filters = (active.filters ?? []).filter(
      (f: any) => !FILTER_DEFS.some(d => f?.type === d.filterType),
    )
    active.applyFilters()
    canvas!.requestRenderAll()
    markDirty()
    setValues({ ...DEFAULT_VALUES })
  }

  const hasChanges = FILTER_DEFS.some(d => values[d.key] !== d.defaultValue)

  return (
    <div className="w-full md:w-56 bg-[#18181b] border-t border-white/[0.06] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="p-3 border-b border-white/[0.04] flex items-center justify-between w-full hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-200">Adjustments</h3>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {!collapsed && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {FILTER_DEFS.map(def => {
              const raw = values[def.key] ?? def.defaultValue
              const display = def.displayMul ? Math.round(raw * def.displayMul) : Math.round(raw * 100)
              const suffix = def.displaySuffix ?? ''

              return (
                <div key={def.key}>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] text-muted-foreground">{def.label}</Label>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                      {display > 0 ? `+${display}` : display}{suffix}
                    </span>
                  </div>
                  <Slider
                    value={[raw]}
                    onValueChange={([v]) => handleSlider(def, v)}
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    className="w-full"
                  />
                </div>
              )
            })}

            {/* Reset button */}
            {hasChanges && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Adjustments
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Reset all adjustments to defaults</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
