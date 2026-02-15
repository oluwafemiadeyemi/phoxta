'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Idea {
  id: string
  idea_seed: string
  who_for: string | null
  desired_outcome: string | null
  ai_profile: Record<string, unknown> | null
  profile_locked: boolean
}

export default function ConfirmPage() {
  const { id } = useParams<{ id: string }>()
  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [locking, setLocking] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      if (found) setIdea(found)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLock = async () => {
    setLocking(true)
    setError(null)
    try {
      const res = await fetch(`/api/idea/${id}/lock-profile`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to lock')
      }
      router.push(`/app/idea/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLocking(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/idea/${id}/regenerate`, {
        method: 'POST',
      })
      if (res.status === 429) {
        setError('AI rate limit reached. Please try again in a minute.')
        return
      }
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to regenerate')
      }
      const newProfile = await res.json()
      setIdea((prev) => (prev ? { ...prev, ai_profile: newProfile } : prev))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!idea) return null

  const profile = idea.ai_profile as Record<string, unknown> | null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push(`/app/idea/${id}`)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Idea
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Review AI Profile</h1>
        <p className="text-gray-500 mb-6">
          Review the AI-generated profile before starting your 7-day validation.
          You can regenerate it or lock it in if it looks good.
        </p>

        {idea.profile_locked && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6">
            Profile is locked. Start working through your days!
          </div>
        )}

        {profile ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Generated Profile</h2>
            <pre className="text-sm text-gray-700 overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg mb-6">
            No AI profile generated yet. Try regenerating.
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {!idea.profile_locked && (
          <div className="flex gap-3">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate Profile'}
            </button>
            <button
              onClick={handleLock}
              disabled={locking || !profile}
              className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {locking ? 'Locking...' : 'Lock & Start Validation'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
