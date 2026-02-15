'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

function stripMd(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
}

interface Verdict {
  decision: 'go' | 'pivot' | 'kill'
  confidence: number
  headline: string
  reasoning: string
  nextSteps: string[]
  killConditions: string[]
  generatedAt: string
}

export default function VerdictPage() {
  const { id } = useParams<{ id: string }>()
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchVerdict()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchVerdict = async () => {
    try {
      const res = await fetch(`/api/idea/${id}/verdict`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setVerdict(data.verdict)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/idea/${id}/verdict`, {
        method: 'POST',
      })
      if (res.status === 429) {
        setError('AI rate limit reached. Please try again in a minute.')
        return
      }
      if (!res.ok) throw new Error('Failed to generate verdict')
      const data = await res.json()
      setVerdict(data.verdict)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'go':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pivot':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'kill':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Final Verdict</h1>

        {!verdict ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No verdict generated yet.</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {generating ? 'Generating Verdict...' : 'Generate Final Verdict'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Decision badge */}
            <div
              className={`rounded-xl border-2 p-8 text-center ${getDecisionColor(verdict.decision)}`}
            >
              <p className="text-sm font-medium uppercase tracking-wider mb-2">
                Verdict
              </p>
              <p className="text-4xl font-bold uppercase">{verdict.decision}</p>
              <p className="mt-2 text-sm opacity-75">
                Confidence: {Math.round(verdict.confidence * 100)}%
              </p>
            </div>

            {/* Headline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">{stripMd(verdict.headline)}</h2>
              <p className="text-gray-700 mt-3">{stripMd(verdict.reasoning)}</p>
            </div>

            {/* Next Steps */}
            {verdict.nextSteps?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Next Steps</h2>
                <ol className="space-y-2">
                  {verdict.nextSteps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-gray-700">
                      <span className="text-gray-400 font-mono text-sm mt-0.5">
                        {i + 1}.
                      </span>
                      {stripMd(step)}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Kill Conditions */}
            {verdict.killConditions?.length > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h2 className="font-semibold text-red-800 mb-3">
                  Kill Conditions — Stop If:
                </h2>
                <ul className="space-y-2">
                  {verdict.killConditions.map((kc, i) => (
                    <li key={i} className="flex gap-2 text-red-700">
                      <span className="mt-0.5">⚠</span>
                      {stripMd(kc)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mt-4 text-sm">{error}</div>
        )}
      </main>
    </div>
  )
}
