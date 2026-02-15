'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PHASES, getDayStatus, TOTAL_SUB_PHASES } from '@/lib/phaseConfig'

interface Idea {
  id: string
  idea_seed: string
  target_audience: string | null
  core_outcome: string | null
  current_day: number
  status: string
  completed_days: number[]
  is_profile_locked: boolean
  ai_profile: Record<string, unknown> | null
  created_at: string
}

const PHASE_ACCENTS: Record<string, { ring: string; bg: string; text: string }> = {
  blue:   { ring: 'ring-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  purple: { ring: 'ring-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  amber:  { ring: 'ring-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  green:  { ring: 'ring-green-500/30', bg: 'bg-green-500/10', text: 'text-green-400' },
}

const PHASE_BAR_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-green-500']

export default function IdeaOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activePhase, setActivePhase] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetchIdea()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchIdea = async () => {
    try {
      const res = await fetch('/api/ideas')
      if (!res.ok) throw new Error('Failed to fetch')
      const ideas: Idea[] = await res.json()
      const found = ideas.find((i) => i.id === id)
      if (!found) {
        router.push('/app/ideas')
        return
      }
      setIdea(found)

      const tabParam = searchParams.get('tab')
      if (tabParam) {
        const tabIdx = PHASES.findIndex(p => p.name.toLowerCase() === tabParam.toLowerCase())
        if (tabIdx >= 0) { setActivePhase(tabIdx); return }
      }
      const phaseIdx = PHASES.findIndex(p =>
        p.subPhases.some(sp => sp.dayNumber === found.current_day)
      )
      if (phaseIdx >= 0) setActivePhase(phaseIdx)
    } catch (err) {
      console.error('Failed to load idea:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!idea) return null

  const completedDays = idea.completed_days || []
  const totalCompleted = completedDays.length
  const overallPct = Math.round((totalCompleted / TOTAL_SUB_PHASES) * 100)

  const phaseCompletions = PHASES.map(phase =>
    phase.subPhases.filter(sp => completedDays.includes(sp.dayNumber)).length
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">Completed</span>
      case 'current':
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 animate-pulse">Active</span>
      case 'available':
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">Ready</span>
      default:
        return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-500 ring-1 ring-zinc-700">Locked</span>
    }
  }

  const currentPhase = PHASES[activePhase]
  const accent = PHASE_ACCENTS[currentPhase.color] || PHASE_ACCENTS.blue

  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/app/ideas')}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Portfolio
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-400/70 hover:text-red-400 font-medium transition-colors"
            >
              Remove
            </button>
            {idea.status !== 'completed' && !idea.is_profile_locked && (
              <button
                onClick={async () => {
                  setRegenerating(true)
                  try {
                    const res = await fetch(`/api/idea/${id}/regenerate`, { method: 'POST' })
                    if (res.ok) await fetchIdea()
                  } finally {
                    setRegenerating(false)
                  }
                }}
                disabled={regenerating}
                className="text-sm text-zinc-400 hover:text-zinc-200 font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {regenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                    Recalibrating...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Recalibrate
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Idea title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
            {idea.idea_seed.length > 120 ? idea.idea_seed.slice(0, 120) + '...' : idea.idea_seed}
          </h1>
          {idea.target_audience && (
            <p className="text-zinc-500 text-sm">Target: {idea.target_audience}</p>
          )}
        </div>

        {/* Overall progress */}
        <div className="mb-10 p-5 rounded-2xl bg-zinc-900/60 ring-1 ring-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">{totalCompleted}/{TOTAL_SUB_PHASES} sub-phases completed</span>
            <span className="text-sm font-semibold text-white">{overallPct}%</span>
          </div>
          <div className="flex gap-1">
            {PHASES.map((phase, pi) => (
              <div key={phase.id} className="flex gap-0.5 flex-1">
                {phase.subPhases.map(sp => (
                  <div
                    key={sp.dayNumber}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      completedDays.includes(sp.dayNumber)
                        ? PHASE_BAR_COLORS[pi]
                        : sp.dayNumber === idea.current_day
                          ? 'bg-blue-500/50 animate-pulse'
                          : 'bg-zinc-800'
                    }`}
                  />
                ))}
                {pi < PHASES.length - 1 && <div className="w-1.5" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {PHASES.map((phase, pi) => (
              <span key={phase.id} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                <span className={`w-2 h-2 rounded-full ${PHASE_BAR_COLORS[pi]}`} />
                {phase.name}
              </span>
            ))}
          </div>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {PHASES.map((phase, idx) => {
            const isActive = idx === activePhase
            const pa = PHASE_ACCENTS[phase.color] || PHASE_ACCENTS.blue
            const completed = phaseCompletions[idx]
            const total = phase.subPhases.length
            const allDone = completed === total

            return (
              <button
                key={phase.id}
                onClick={() => setActivePhase(idx)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? `${pa.bg} ${pa.text} ring-1 ${pa.ring}`
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                <span className="text-base">{phase.icon}</span>
                <span>{phase.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  allDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isActive ? `${pa.bg} ${pa.text}` : 'bg-zinc-800 text-zinc-500'
                }`}>{completed}/{total}</span>
              </button>
            )
          })}
        </div>

        {/* Phase description */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">{currentPhase.icon}</span>
            Phase {currentPhase.id}: {currentPhase.name}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">{currentPhase.description}</p>
        </div>

        {/* Sub-phase cards */}
        <div className="grid gap-3">
          {currentPhase.subPhases.map((sp, idx) => {
            const status = getDayStatus(sp.dayNumber, idea.current_day, completedDays)
            const isClickable = status !== 'locked'
            const isCurrent = status === 'current'
            const isCompleted = status === 'completed'

            const card = (
              <div
                className={`group rounded-2xl p-5 transition-all duration-200 ${
                  isClickable
                    ? `bg-zinc-900/60 ring-1 ring-white/[0.06] hover:ring-white/[0.12] hover:bg-zinc-900/80 cursor-pointer ${isCurrent ? `${accent.ring}` : ''}`
                    : 'bg-zinc-900/30 ring-1 ring-white/[0.03] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                      isCompleted ? 'bg-emerald-500/10' : isCurrent ? accent.bg : 'bg-zinc-800'
                    }`}>
                      {isCompleted ? '\u2713' : sp.icon}
                    </span>
                    <span>
                      <span className="text-[11px] font-mono text-zinc-600 block">{currentPhase.id}.{idx + 1}</span>
                      <span className={isClickable ? 'text-white' : 'text-zinc-500'}>{sp.name}</span>
                    </span>
                  </h3>
                  {getStatusBadge(status)}
                </div>
                <p className="text-sm text-zinc-500 ml-12">{sp.description}</p>
              </div>
            )

            if (isClickable) {
              const href = sp.dayNumber === 7
                ? `/app/idea/${id}/report`
                : `/app/idea/${id}/day/${sp.dayNumber}`
              return <Link key={sp.dayNumber} href={href}>{card}</Link>
            }
            return <div key={sp.dayNumber}>{card}</div>
          })}
        </div>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl ring-1 ring-white/[0.08] shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Remove this venture?</h3>
            <p className="text-sm text-zinc-400 text-center mb-6">
              This will permanently remove the venture and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 rounded-xl hover:bg-zinc-700 disabled:opacity-50 transition-colors ring-1 ring-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    const res = await fetch(`/api/ideas?id=${id}`, { method: 'DELETE' })
                    if (res.ok) router.push('/app/ideas')
                  } finally {
                    setDeleting(false)
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}