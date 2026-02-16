'use client'

// ===========================================================================
// BrandKitPanel — colours, fonts, logos
// Uses: shadcn Button, Input, Card, ScrollArea + Refine useList / useCreate
// ===========================================================================
import { useState } from 'react'
import { useList, useCreate } from '@refinedev/core'
import { useDocumentStore } from '@/stores/designer/documentStore'
import type { DesignBrandKit } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Plus, Palette } from 'lucide-react'

export default function BrandKitPanel() {
  const canvas = useDocumentStore(s => s.canvas)
  const [newName, setNewName] = useState('')

  const { query, result } = useList<DesignBrandKit>({
    resource: 'design_brand_kits',
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { currentPage: 1, pageSize: 50 },
  })

  const { mutate: createKit, mutation: createMutation } = useCreate()
  const creating = createMutation.isPending

  const kits = result.data ?? []
  const isLoading = query.isLoading
  const refetch = query.refetch

  const handleCreateKit = () => {
    if (!newName.trim()) return
    createKit(
      {
        resource: 'design_brand_kits',
        values: { name: newName.trim(), colors: [], fonts: [], logos: [] },
      },
      {
        onSuccess: () => {
          setNewName('')
          refetch()
        },
      }
    )
  }

  const applyColor = (hex: string) => {
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active) {
      active.set('fill', hex)
      canvas.requestRenderAll()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">Brand Kit</h3>
        <div className="flex gap-1">
          <Input
            type="text"
            placeholder="New kit name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateKit()}
            className="flex-1 text-xs h-8"
          />
          <Button size="sm" onClick={handleCreateKit} disabled={creating}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center mt-8">Loading...</p>
        ) : kits.length === 0 ? (
          <div className="text-center mt-8">
            <Palette className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No brand kits yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {kits.map((kit: DesignBrandKit) => (
              <Card key={kit.id}>
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">{kit.name}</p>

                  {/* Colors */}
                  {kit.colors.length > 0 && (
                    <div className="mb-2">
                      <Label className="text-[10px] text-muted-foreground">Colors</Label>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {kit.colors.map((c: DesignBrandKit['colors'][number], i: number) => (
                          <button
                            key={i}
                            onClick={() => applyColor(c.hex)}
                            className="w-7 h-7 rounded-md border border-gray-200 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.hex }}
                            title={c.label || c.hex}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fonts */}
                  {kit.fonts.length > 0 && (
                    <div className="mb-2">
                      <Label className="text-[10px] text-muted-foreground">Fonts</Label>
                      <div className="space-y-0.5 mt-0.5">
                        {kit.fonts.map((f: DesignBrandKit['fonts'][number], i: number) => (
                          <p key={i} className="text-xs text-gray-500" style={{ fontFamily: f.family }}>
                            {f.family} ({f.source})
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logos */}
                  {kit.logos.length > 0 && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Logos</Label>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {kit.logos.map((l: DesignBrandKit['logos'][number], i: number) => (
                          <div key={i} className="w-10 h-10 rounded border border-gray-200 overflow-hidden">
                            <img src={l.url} alt={l.name} className="w-full h-full object-contain" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
