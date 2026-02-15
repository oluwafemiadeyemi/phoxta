'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewIdeaPage() {
  const [ideaSeed, setIdeaSeed] = useState('')
  const [whoFor, setWhoFor] = useState('')
  const [desiredOutcome, setDesiredOutcome] = useState('')
  const [loading, setLoading] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ideaSeed.trim().length < 10) {
      setError('Please describe your venture concept in at least 10 characters.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      setAutofilling(true)
      const autofillRes = await fetch('/api/idea/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaSeed: ideaSeed.trim(),
          whoFor: whoFor.trim() || undefined,
          desiredOutcome: desiredOutcome.trim() || undefined,
        }),
      })

      if (autofillRes.status === 429) {
        setError('Rate limit reached. Please wait a moment and try again.')
        return
      }

      let aiProfile = null
      if (autofillRes.ok) {
        aiProfile = await autofillRes.json()
      }
      setAutofilling(false)

      const createRes = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaSeed: ideaSeed.trim(),
          whoFor: whoFor.trim() || null,
          desiredOutcome: desiredOutcome.trim() || null,
          aiProfile,
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || 'Failed to create idea')
      }

      const idea = await createRes.json()
      router.push(`/app/idea/${idea.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setLoading(false)
      setAutofilling(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/app/ideas')}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Back to Portfolio
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-5 ring-1 ring-white/[0.06]">
            <span className="text-2xl">💡</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">New Idea</h1>
          <p className="text-zinc-500 leading-relaxed">
            Describe your idea and we&#39;ll conduct a preliminary strategic
            analysis to initialise your validation framework.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="ideaSeed" className="block text-sm font-medium text-zinc-300 mb-2">
              Describe your Idea <span className="text-red-400">*</span>
            </label>
            <textarea
              id="ideaSeed"
              value={ideaSeed}
              onChange={(e) => setIdeaSeed(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className="w-full px-4 py-3 bg-zinc-900/60 border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none resize-none transition-all"
              placeholder="e.g. A platform that enables enterprise procurement teams to reduce vendor evaluation cycles from 6 weeks to 7 days using structured AI-driven due diligence..."
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              {ideaSeed.length}/2000 characters (min 10)
            </p>
          </div>

          <div>
            <label htmlFor="whoFor" className="block text-sm font-medium text-zinc-300 mb-2">
              Who is this for <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              id="whoFor"
              type="text"
              value={whoFor}
              onChange={(e) => setWhoFor(e.target.value)}
              maxLength={500}
              className="w-full px-4 py-3 bg-zinc-900/60 border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none transition-all"
              placeholder="e.g. Series A B2B SaaS founders scaling to $5M ARR"
            />
          </div>

          <div>
            <label
              htmlFor="desiredOutcome"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Strategic objective <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              id="desiredOutcome"
              type="text"
              value={desiredOutcome}
              onChange={(e) => setDesiredOutcome(e.target.value)}
              maxLength={500}
              className="w-full px-4 py-3 bg-zinc-900/60 border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none transition-all"
              placeholder="e.g. Evidence-based go/no-go decision with quantified market opportunity"
            />
          </div>

          {error && (
            <div className="text-sm p-4 rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3.5 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2"
          >
            {autofilling ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                Conducting strategic analysis...
              </>
            ) : loading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                Initialising venture assessment...
              </>
            ) : (
              <>
                Begin Validation
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
