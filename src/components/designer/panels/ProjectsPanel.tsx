'use client'

// ===========================================================================
// ProjectsPanel — recent projects list in left panel
// Uses: shadcn ScrollArea + Refine useList
// ===========================================================================
import { useList } from '@refinedev/core'
import type { DesignProject } from '@/types/designer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'

export default function ProjectsPanel() {
  const { query, result } = useList<DesignProject>({
    resource: 'design_projects',
    filters: [{ field: 'deleted_at', operator: 'null', value: true }],
    sorters: [{ field: 'updated_at', order: 'desc' }],
    pagination: { currentPage: 1, pageSize: 50 },
  })

  const projects = result.data ?? []
  const isLoading = query.isLoading

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-800">Projects</h3>
      </div>

      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center mt-8">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="text-center mt-8">
            <FolderOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No projects yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((p: DesignProject) => (
              <Link
                key={p.id}
                href={`/app/designer/${p.id}`}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
                  {p.preview_url ? (
                    <img src={p.preview_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate group-hover:text-gray-900">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.width}×{p.height}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
