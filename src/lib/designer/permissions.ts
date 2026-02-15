// ===========================================================================
// Designer – permission helpers
// ===========================================================================
import type { CollabRole } from '@/types/designer'

export function canEdit(role: CollabRole | 'owner' | null): boolean {
  return role === 'owner' || role === 'editor'
}

export function canComment(role: CollabRole | 'owner' | null): boolean {
  return role === 'owner' || role === 'editor' || role === 'commenter'
}

export function canView(role: CollabRole | 'owner' | null): boolean {
  return role != null
}
