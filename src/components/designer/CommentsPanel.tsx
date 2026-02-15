'use client'

// ===========================================================================
// CommentsPanel — threaded comments tied to objects / pages
// Uses: shadcn Input, Button, Badge, ScrollArea
// ===========================================================================
import { useState, useEffect, useRef } from 'react'
import { useList, useCreate } from '@refinedev/core'
import type { DesignComment } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Send } from 'lucide-react'

interface CommentsPanelProps {
  projectId: string
  currentPageId: string
}

export default function CommentsPanel({ projectId, currentPageId }: CommentsPanelProps) {
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { query, result } = useList<DesignComment>({
    resource: 'design_comments',
    filters: [{ field: 'project_id', operator: 'eq', value: projectId }],
    sorters: [{ field: 'created_at', order: 'asc' }],
  })

  const { mutate: createComment } = useCreate()

  const comments = result.data ?? []
  const isLoading = query.isLoading
  const refetch = query.refetch
  const pageComments = comments.filter((c: DesignComment) => !c.page_id || c.page_id === currentPageId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [pageComments.length])

  const handlePost = async () => {
    if (!body.trim()) return
    setPosting(true)
    try {
      createComment(
        {
          resource: 'design_comments',
          values: {
            body: body.trim(),
            project_id: projectId,
            page_id: currentPageId || null,
          },
        },
        {
          onSuccess: () => {
            setBody('')
            refetch()
          },
        }
      )
    } catch { /* */ } finally { setPosting(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-200">Comments</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">{pageComments.length}</Badge>
      </div>

      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center mt-8">Loading...</p>
        ) : pageComments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center mt-8">No comments yet</p>
        ) : (
          <div className="space-y-3">
            {pageComments.map((c: DesignComment) => (
              <div key={c.id} className="rounded-lg bg-zinc-800/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-zinc-400">
                    {c.author_id.substring(0, 8)}...
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 whitespace-pre-wrap">{c.body}</p>
                {c.resolved_at && (
                  <Badge variant="secondary" className="mt-1 text-[9px] bg-green-500/10 text-green-400">Resolved</Badge>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* New comment */}
      <div className="p-3 border-t border-white/[0.04]">
        <div className="flex gap-1.5">
          <Input
            type="text"
            placeholder="Write a comment..."
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePost()}
            className="flex-1 text-xs h-8"
          />
          <Button size="sm" onClick={handlePost} disabled={posting || !body.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
