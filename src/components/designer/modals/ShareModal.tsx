'use client'

// ===========================================================================
// ShareModal — invite collaborators by email, role selection
// Uses: shadcn Dialog, Button, Input, Select, Badge
// ===========================================================================
import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/designer/uiStore'
import type { DesignCollaborator, CollabRole } from '@/types/designer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Share2, UserPlus, Link2, Trash2 } from 'lucide-react'

interface ShareModalProps {
  projectId: string
}

export default function ShareModal({ projectId }: ShareModalProps) {
  const { shareModalOpen, setShareModalOpen } = useUIStore()
  const [collabs, setCollabs] = useState<(DesignCollaborator & { email?: string })[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<CollabRole>('editor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!shareModalOpen) return
    loadCollabs()
  }, [shareModalOpen, projectId])

  const loadCollabs = async () => {
    try {
      const res = await fetch(`/api/designer/${projectId}/collaborators`)
      if (res.ok) setCollabs(await res.json())
    } catch { /* */ }
  }

  const invite = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/designer/${projectId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to invite')
      } else {
        setEmail('')
        await loadCollabs()
      }
    } catch {
      setError('Network error')
    } finally { setLoading(false) }
  }

  const remove = async (userId: string) => {
    try {
      await fetch(`/api/designer/${projectId}/collaborators?userId=${userId}`, { method: 'DELETE' })
      await loadCollabs()
    } catch { /* */ }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/app/designer/${projectId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share project
          </DialogTitle>
          <DialogDescription>Invite collaborators to this project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invite form */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
              className="flex-1 text-xs h-9"
            />
            <Select value={role} onValueChange={v => setRole(v as CollabRole)}>
              <SelectTrigger size="sm" className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor" className="text-xs">Editor</SelectItem>
                <SelectItem value="commenter" className="text-xs">Commenter</SelectItem>
                <SelectItem value="viewer" className="text-xs">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={invite} disabled={loading}>
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Collaborators list */}
          {collabs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">People with access</p>
              {collabs.map(c => (
                <div key={c.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{c.email || c.user_id}</p>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{c.role}</Badge>
                  </div>
                  <Button variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" onClick={() => remove(c.user_id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Copy link */}
          <Button variant="outline" className="w-full text-xs" onClick={handleCopyLink}>
            <Link2 className="mr-2 h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy link to project'}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShareModalOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
