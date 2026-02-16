'use client'

// ===========================================================================
// TemplatesPanel — template library with categories, search, create from
// Uses: shadcn Input, Button, Card, ScrollArea + Refine useList
// ===========================================================================
import { useState } from 'react'
import { useList } from '@refinedev/core'
import type { DesignProject } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Search, FileText } from 'lucide-react'

export default function TemplatesPanel() {
  const [search, setSearch] = useState('')

  const { query, result } = useList<DesignProject>({
    resource: 'design_projects',
    filters: [
      { field: 'is_template', operator: 'eq', value: true },
      { field: 'deleted_at', operator: 'null', value: true },
    ],
    sorters: [{ field: 'updated_at', order: 'desc' }],
    pagination: { currentPage: 1, pageSize: 50 },
  })

  const templates = result.data ?? []
  const isLoading = query.isLoading
  const filtered = templates.filter((t: DesignProject) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleUseTemplate = async (t: DesignProject) => {
    try {
      const res = await fetch('/api/designer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${t.name} (Copy)`,
          width: t.width,
          height: t.height,
          template_source_id: t.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        window.location.href = `/app/designer/${data.id}`
      }
    } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">Templates</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center mt-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-8">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No templates yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Create a project and mark it as template</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((t: DesignProject) => (
              <Card key={t.id} className="overflow-hidden cursor-pointer hover:shadow-sm transition group"
                onClick={() => handleUseTemplate(t)}>
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {t.preview_url ? (
                    <img src={t.preview_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="px-2 py-1.5">
                  <p className="text-[11px] font-medium text-gray-500 truncate group-hover:text-gray-800">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.width}×{t.height}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
