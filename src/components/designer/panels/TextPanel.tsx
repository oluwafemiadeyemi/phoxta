'use client'

// ===========================================================================
// TextPanel — text style presets + add custom text
// Uses: shadcn Button, Separator, ScrollArea
// ===========================================================================
import { useDocumentStore } from '@/stores/designer/documentStore'
import { TEXT_STYLE_PRESETS } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Heading1, Heading2, Type } from 'lucide-react'

export default function TextPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const pushUndo = useDocumentStore(s => s.pushUndo)
  const markDirty = useDocumentStore(s => s.markDirty)

  const addText = async (
    text: string,
    fontSize: number,
    fontWeight: string | number = 'normal',
    fontFamily = 'Inter',
  ) => {
    if (!canvas) return
    const fabricModule = await import('fabric')
    pushUndo('Add text')
    const obj = new fabricModule.Textbox(text, {
      left: 100,
      top: 100,
      fontSize,
      fontWeight: fontWeight as any,
      fontFamily,
      fill: '#000000',
      width: 300,
      editable: true,
    })
    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.requestRenderAll()
    markDirty()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">Text</h3>
        <Button className="w-full text-xs" size="sm" onClick={() => addText('Type something', 18)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add a text box
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide">Default styles</p>
        <div className="space-y-1">
          {TEXT_STYLE_PRESETS.map(preset => (
            <Button
              key={preset.label}
              variant="ghost"
              className="w-full justify-start h-auto py-2.5 px-3"
              onClick={() => addText(preset.label, preset.fontSize, preset.fontWeight, preset.fontFamily)}
            >
              <span style={{
                fontFamily: preset.fontFamily,
                fontSize: Math.min(preset.fontSize * 0.5, 24),
                fontWeight: preset.fontWeight as any,
              }} className="text-gray-700">
                {preset.label}
              </span>
              <span className="text-[10px] text-muted-foreground ml-2" style={{ fontSize: 10, fontWeight: 'normal', fontFamily: 'Inter' }}>
                {preset.fontFamily} · {preset.fontSize}px
              </span>
            </Button>
          ))}
        </div>

        <Separator className="my-3" />

        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wide">Quick add</p>
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start text-sm font-bold" size="sm"
            onClick={() => addText('Add a heading', 32, 700)}>
            <Heading1 className="mr-2 h-4 w-4" /> Add a heading
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm font-medium" size="sm"
            onClick={() => addText('Add a subheading', 22, 500)}>
            <Heading2 className="mr-2 h-4 w-4" /> Add a subheading
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm" size="sm"
            onClick={() => addText('Add body text', 14)}>
            <Type className="mr-2 h-4 w-4" /> Add body text
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}
