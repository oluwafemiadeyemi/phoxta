'use client'

// ===========================================================================
// ExportModal — advanced export with format, DPI, bleed, crop marks
// Uses: shadcn Dialog, Button, Select, Slider, Label, Input
// ===========================================================================
import { useState } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import type { ExportFormat, ExportOptions } from '@/types/designer'
import {
  exportPageToDataURL,
  exportPageToSVG,
  downloadDataUrl,
  downloadBlob,
} from '@/lib/designer/exportPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Download } from 'lucide-react'

export default function ExportModal() {
  const { exportModalOpen, setExportModalOpen } = useUIStore()
  const { canvas, project } = useDocumentStore()

  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 92,
    dpi: 300,
    transparent: false,
    pages: 'current',
    bleed: 0,
    cropMarks: false,
  })
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!canvas || !project) return
    setExporting(true)

    try {
      const multiplier = options.dpi / 72
      const format = options.format
      const dw = project.width
      const dh = project.height

      if (format === 'svg') {
        const svgStr = exportPageToSVG(canvas, dw, dh)
        downloadBlob(new Blob([svgStr], { type: 'image/svg+xml' }), `${project.name}.svg`)
      } else if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf')
        const w = dw + options.bleed * 2
        const h = dh + options.bleed * 2
        const orientation = w > h ? 'landscape' : 'portrait'
        const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] })

        const pngData = exportPageToDataURL(canvas, {
          designWidth: dw,
          designHeight: dh,
          format: 'png',
          multiplier,
        })
        pdf.addImage(pngData, 'PNG', options.bleed, options.bleed, dw, dh)

        if (options.cropMarks) {
          const markLen = 20
          pdf.setDrawColor(0)
          pdf.setLineWidth(0.5)
          pdf.line(0, options.bleed, markLen, options.bleed)
          pdf.line(options.bleed, 0, options.bleed, markLen)
          pdf.line(w - markLen, options.bleed, w, options.bleed)
          pdf.line(w - options.bleed, 0, w - options.bleed, markLen)
          pdf.line(0, h - options.bleed, markLen, h - options.bleed)
          pdf.line(options.bleed, h - markLen, options.bleed, h)
          pdf.line(w - markLen, h - options.bleed, w, h - options.bleed)
          pdf.line(w - options.bleed, h - markLen, w - options.bleed, h)
        }
        pdf.save(`${project.name}.pdf`)
      } else {
        const imgFormat = format === 'jpg' ? 'jpeg' : 'png'
        const dataUrl = exportPageToDataURL(canvas, {
          designWidth: dw,
          designHeight: dh,
          format: imgFormat as 'png' | 'jpeg',
          quality: options.quality / 100,
          multiplier,
          transparent: options.transparent,
        })

        try {
          await fetch(`/api/designer/${project.id}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, format, fileName: project.name }),
          })
        } catch { /* silent */ }

        downloadDataUrl(dataUrl, `${project.name}.${format === 'jpg' ? 'jpeg' : 'png'}`)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
      setExportModalOpen(false)
    }
  }

  return (
    <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Advanced Export
          </DialogTitle>
          <DialogDescription>Configure export settings for your design.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format */}
          <div>
            <Label className="text-xs">Format</Label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {(['png', 'jpg', 'svg', 'pdf'] as ExportFormat[]).map(f => (
                <Button key={f} variant={options.format === f ? 'default' : 'outline'} size="sm"
                  onClick={() => setOptions({ ...options, format: f })} className="text-xs">
                  {f.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {(options.format === 'png' || options.format === 'jpg') && (
            <div>
              <Label className="text-xs">Quality: {options.quality}%</Label>
              <Slider
                value={[options.quality]}
                onValueChange={([v]) => setOptions({ ...options, quality: v })}
                min={10} max={100} step={1}
                className="mt-1"
              />
            </div>
          )}

          {/* DPI */}
          <div>
            <Label className="text-xs">DPI</Label>
            <div className="flex gap-1 mt-1">
              {[72, 150, 300].map(d => (
                <Button key={d} variant={options.dpi === d ? 'default' : 'outline'} size="sm" className="flex-1 text-xs"
                  onClick={() => setOptions({ ...options, dpi: d })}>
                  {d}
                </Button>
              ))}
            </div>
          </div>

          {/* Transparent bg (PNG only) */}
          {options.format === 'png' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={options.transparent}
                onChange={e => setOptions({ ...options, transparent: e.target.checked })}
                className="accent-gray-500 rounded" />
              <span className="text-xs text-gray-500">Transparent background</span>
            </label>
          )}

          {/* Bleed (PDF) */}
          {options.format === 'pdf' && (
            <>
              <div>
                <Label className="text-xs">Bleed (px)</Label>
                <Input type="number" value={options.bleed} min={0} max={100}
                  onChange={e => setOptions({ ...options, bleed: Number(e.target.value) })}
                  className="mt-1 text-xs h-8" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={options.cropMarks}
                  onChange={e => setOptions({ ...options, cropMarks: e.target.checked })}
                  className="accent-gray-500 rounded" />
                <span className="text-xs text-gray-500">Include crop marks</span>
              </label>
            </>
          )}

          {/* Pages */}
          <div>
            <Label className="text-xs">Pages</Label>
            <div className="flex gap-1 mt-1">
              <Button variant={options.pages === 'current' ? 'default' : 'outline'} size="sm" className="flex-1 text-xs"
                onClick={() => setOptions({ ...options, pages: 'current' })}>
                Current
              </Button>
              <Button variant={options.pages === 'all' ? 'default' : 'outline'} size="sm" className="flex-1 text-xs"
                onClick={() => setOptions({ ...options, pages: 'all' })}>
                All pages
              </Button>
            </div>
          </div>

          <Separator />

          {/* Size info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">
              Output: {project ? Math.round(project.width * (options.dpi / 72)) : '–'} × {project ? Math.round(project.height * (options.dpi / 72)) : '–'} px
              &nbsp;&bull;&nbsp;{options.dpi} DPI
              {options.bleed > 0 && ` • +${options.bleed}px bleed`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
