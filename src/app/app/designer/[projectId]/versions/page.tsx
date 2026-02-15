'use client'

// ===========================================================================
// Version History page — shadcn + Refine useList
// ===========================================================================
import { useState, use } from 'react'
import { useList, useCreate } from '@refinedev/core'
import Link from 'next/link'
import type { DesignVersion } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, History, Loader2, Clock } from 'lucide-react'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default function VersionsPage({ params }: PageProps) {
  const { projectId } = use(params)
  const [restoring, setRestoring] = useState<string | null>(null)

  const { query, result } = useList<DesignVersion>({
    resource: 'design_versions',
    filters: [{ field: 'project_id', operator: 'eq', value: projectId }],
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { currentPage: 1, pageSize: 100 },
  })

  const versions = result.data ?? []
  const isLoading = query.isLoading
  const refetch = query.refetch

  const createVersion = async () => {
    try {
      const res = await fetch(`/api/designer/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: `Snapshot ${new Date().toLocaleTimeString()}` }),
      })
      if (res.ok) refetch()
    } catch { /* */ }
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-white hover:bg-white/[0.06]" asChild>
              <Link href={`/app/designer/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="h-4 w-4" /> Version History
            </h1>
          </div>
          <Button size="sm" className="text-xs bg-white text-black hover:bg-zinc-200" onClick={createVersion}>
            Save snapshot
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading versions…</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">No versions saved yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((v: DesignVersion) => (
              <Card key={v.id} className="overflow-hidden bg-zinc-900/60 border-white/[0.06]">
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  {v.previewUrls?.[0] && (
                    <div className="w-16 h-16 rounded border border-white/[0.06] overflow-hidden shrink-0">
                      <img src={v.previewUrls[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-300">{v.label || 'Untitled version'}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(v.created_at).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-400 shrink-0"
                    onClick={() => {
                      setRestoring(v.id)
                      window.location.href = `/app/designer/${projectId}`
                    }}
                  >
                    {restoring === v.id ? 'Restoring…' : 'Open'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
