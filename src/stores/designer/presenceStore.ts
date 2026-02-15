// ===========================================================================
// Designer – Presence store (Supabase Realtime)
// ===========================================================================
import { create } from 'zustand'
import type { PresenceUser } from '@/types/designer'

export interface PresenceState {
  peers: PresenceUser[]
  setPeers: (p: PresenceUser[]) => void
  addPeer: (p: PresenceUser) => void
  removePeer: (userId: string) => void
  updatePeer: (userId: string, data: Partial<PresenceUser>) => void
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4']

export function getPresenceColor(index: number) {
  return COLORS[index % COLORS.length]
}

export const usePresenceStore = create<PresenceState>((set) => ({
  peers: [],
  setPeers: (p) => set({ peers: p }),
  addPeer: (p) => set((s) => ({ peers: [...s.peers, p] })),
  removePeer: (userId) => set((s) => ({ peers: s.peers.filter((p) => p.userId !== userId) })),
  updatePeer: (userId, data) =>
    set((s) => ({
      peers: s.peers.map((p) => (p.userId === userId ? { ...p, ...data } : p)),
    })),
}))
