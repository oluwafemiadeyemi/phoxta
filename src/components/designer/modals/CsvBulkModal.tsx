'use client'

// ===========================================================================
// CsvBulkModal — upload CSV, map columns to text layers, generate designs
// Uses: shadcn Dialog, Button, Input, Select, Progress, Label
// ===========================================================================
import { useState, useRef } from 'react'
import { useDocumentStore } from '@/stores/designer/documentStore'
import { useUIStore } from '@/stores/designer/uiStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
import { Separator } from '@/components/ui/separator'
import { Upload, Table, ArrowRight, FileSpreadsheet } from 'lucide-react'

interface CsvRow {
  [key: string]: string
}

export default function CsvBulkModal() {
  const { csvModalOpen, setCsvModalOpen } = useUIStore()
  const { canvas, project } = useDocumentStore()

  const [csvData, setCsvData] = useState<CsvRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Get text objects on canvas
  const textLayers = canvas
    ? canvas.getObjects().filter((o: any) =>
        o.type === 'textbox' || o.type === 'i-text' || o.type === 'text'
      ).map((o: any) => ({
        id: o.id || 'unknown',
        text: (o.text || '').substring(0, 30),
      }))
    : []

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) return

      const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      setHeaders(hdrs)

      const rows: CsvRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row: CsvRow = {}
        hdrs.forEach((h, idx) => { row[h] = values[idx] || '' })
        rows.push(row)
      }
      setCsvData(rows)
    }
    reader.readAsText(file)
  }

  const handleGenerate = async () => {
    if (!canvas || !project || csvData.length === 0) return
    setGenerating(true)
    setGenerated(0)

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]

      for (const [layerId, csvColumn] of Object.entries(mappings)) {
        if (!csvColumn) continue
        const obj = canvas.getObjects().find((o: any) => o.id === layerId) as any
        if (obj && obj.set) {
          obj.set('text', row[csvColumn] || '')
        }
      }
      canvas.requestRenderAll()
      await new Promise(r => setTimeout(r, 100))

      const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 })

      try {
        await fetch(`/api/designer/${project.id}/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, format: 'png', fileName: `${project.name}_${i + 1}` }),
        })
      } catch { /* silent */ }

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${project.name}_${i + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setGenerated(i + 1)
    }

    setGenerating(false)
  }

  const progressPct = csvData.length > 0 ? (generated / csvData.length) * 100 : 0

  return (
    <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Create from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file and map columns to text layers on your canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload */}
          <div>
            <Button variant="outline" className="w-full border-dashed h-12" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {csvData.length > 0 ? `${csvData.length} rows loaded` : 'Upload CSV file'}
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
          </div>

          {/* Column mapping */}
          {headers.length > 0 && textLayers.length > 0 && (
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Map columns to text layers
              </Label>
              <div className="space-y-2 mt-2">
                {textLayers.map(layer => (
                  <div key={layer.id} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 truncate w-32" title={layer.text}>
                      &ldquo;{layer.text}&rdquo;
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Select
                      value={mappings[layer.id] || ''}
                      onValueChange={v => setMappings({ ...mappings, [layer.id]: v })}
                    >
                      <SelectTrigger size="sm" className="flex-1 text-xs">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map(h => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {csvData.length > 0 && (
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <Label className="text-[11px] text-muted-foreground">Preview (first 3 rows)</Label>
              <div className="overflow-x-auto mt-1">
                <table className="text-[10px] text-zinc-400 w-full">
                  <thead>
                    <tr>
                      {headers.map(h => <th key={h} className="text-left px-1 py-0.5 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {headers.map(h => <td key={h} className="px-1 py-0.5 truncate max-w-[80px]">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress */}
          {generating && (
            <div className="bg-blue-500/10 rounded-lg p-3 space-y-2">
              <p className="text-xs text-blue-400 font-medium">Generating: {generated} / {csvData.length}</p>
              <Progress value={progressPct} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setCsvModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || csvData.length === 0 || Object.keys(mappings).length === 0}
          >
            <Table className="mr-1.5 h-3.5 w-3.5" />
            {generating ? 'Generating...' : `Generate ${csvData.length} designs`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
