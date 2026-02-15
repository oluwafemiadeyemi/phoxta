'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PHASES } from '@/lib/phaseConfig'

interface Idea {
  id: string
  idea_seed: string
  current_day: number
  status: string
  completed_days: number[]
  created_at: string
}

const PHASE_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-green-500']

export default function IdeasDashboardPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      fetchIdeas()
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/ideas')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setIdeas(data)
    } catch (err) {
      console.error('Failed to load ideas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
      case 'active':
        return 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
      default:
        return 'bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600'
    }
  }

  const getCompletionPercent = (idea: Idea) => {
    const total = PHASES.reduce((sum, p) => sum + p.subPhases.length, 0)
    return Math.round(((idea.completed_days || []).length / total) * 100)
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/app">
            <Image src="/phoxta-logo.png" alt="Phoxta" width={130} height={130} className="rounded-2xl" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/app/new"
              className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all shadow-lg shadow-white/5"
            >
              + New Idea
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white tracking-tight">Your Ideas</h2>
          <p className="text-zinc-500 mt-1.5 text-sm">Track, validate, and launch your ventures</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">Loading ventures...</span>
            </div>
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center ring-1 ring-white/[0.06]">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No ventures yet</h3>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto text-sm">Begin your first strategic validation and take your idea from concept to launch.</p>
            <Link
              href="/app/new"
              className="inline-flex items-center gap-2 bg-white text-black px-7 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg shadow-white/5"
            >
              Start Your First Assessment
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {ideas.map((idea) => {
              const pct = getCompletionPercent(idea)
              const completed = idea.completed_days || []
              return (
                <div key={idea.id} className="group relative rounded-2xl bg-zinc-900/60 ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all duration-200 hover:bg-zinc-900/80">
                  <Link
                    href={`/app/idea/${idea.id}`}
                    className="block p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white group-hover:text-white/90 truncate">
                          {(idea.idea_seed ?? '').length > 100
                            ? (idea.idea_seed ?? '').slice(0, 100) + '...'
                            : idea.idea_seed ?? 'Untitled Venture'}
                        </h3>
                        <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                            {new Date(idea.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-zinc-700">·</span>
                          <span>{completed.length} of 14 phases done</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${getStatusStyle(idea.status)}`}>
                          {idea.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setConfirmDeleteId(idea.id)
                          }}
                          className="p-2 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                          title="Remove venture"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Phase-aware progress */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {PHASES.map((phase, pi) => (
                            <span key={phase.id} className="flex items-center gap-1 text-[10px] text-zinc-600">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                phase.subPhases.every(sp => completed.includes(sp.dayNumber))
                                  ? PHASE_COLORS[pi]
                                  : 'bg-zinc-700'
                              }`} />
                              {phase.name}
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] font-medium text-zinc-500">{pct}%</span>
                      </div>
                      <div className="flex gap-0.5">
                        {PHASES.map((phase, pi) => (
                          <div key={phase.id} className="flex gap-0.5 flex-1">
                            {phase.subPhases.map(sp => (
                              <div
                                key={sp.dayNumber}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  completed.includes(sp.dayNumber)
                                    ? PHASE_COLORS[pi]
                                    : sp.dayNumber === idea.current_day
                                      ? 'bg-blue-500/60 animate-pulse'
                                      : 'bg-zinc-800'
                                }`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl ring-1 ring-white/[0.08] shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Remove this venture?</h3>
            <p className="text-sm text-zinc-400 text-center mb-6">
              This will permanently remove the venture assessment and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 rounded-xl hover:bg-zinc-700 disabled:opacity-50 transition-colors ring-1 ring-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeletingId(confirmDeleteId)
                  try {
                    const res = await fetch(`/api/ideas?id=${confirmDeleteId}`, { method: 'DELETE' })
                    if (res.ok) {
                      setIdeas((prev) => prev.filter((i) => i.id !== confirmDeleteId))
                      setConfirmDeleteId(null)
                    }
                  } finally {
                    setDeletingId(null)
                  }
                }}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {deletingId ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
