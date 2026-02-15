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

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 10) * circumference
  const color = score >= 7 ? '#22c55e' : score >= 5 ? '#eab308' : '#ef4444'
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={circumference - progress}
        strokeLinecap="round" className="transition-all duration-1000" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="transform rotate-90 origin-center fill-gray-900 text-2xl font-bold">
        {score}
      </text>
    </svg>
  )
}

function MetricBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = value >= 7 ? 'bg-green-500' : value >= 5 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{value}</span>
    </div>
  )
}

const riskColors: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
}

interface Report {
  summary: string
  overallScore: number
  marketScore: number
  productScore: number
  teamReadiness: number
  competitivePosition: number
  customerDemand: number
  financialViability: number
  riskLevel: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  competitorComparison: { name: string; score: number; weakness: string }[]
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
  generatedAt: string
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [ideaSeed, setIdeaSeed] = useState('')
  const [currentDay, setCurrentDay] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/idea/${id}/report`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setReport(data.report)
      setIdeaSeed(data.idea?.ideaSeed || '')
      setCurrentDay(data.currentDay || data.idea?.currentDay || 0)
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
      const res = await fetch(`/api/idea/${id}/report`, { method: 'POST' })
      if (res.status === 429) {
        setError('AI rate limit reached. Please try again in a minute.')
        return
      }
      if (!res.ok) throw new Error('Failed to generate report')
      const data = await res.json()
      setReport(data.report)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const handleContinueToStrategy = async () => {
    setContinuing(true)
    setError(null)
    try {
      // Only call complete if strategy isn't already unlocked
      if (currentDay <= 7) {
        const res = await fetch(`/api/idea/${id}/complete/7`, { method: 'POST' })
        if (!res.ok) throw new Error('Failed to unlock strategy')
      }
      router.push(`/app/idea/${id}?tab=strategy`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setContinuing(false)
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.push(`/app/idea/${id}`)} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Idea
          </button>
          {report && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Generated {new Date(report.generatedAt).toLocaleDateString()}
              </span>
              <button onClick={handleGenerate} disabled={generating}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
                {generating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Validation Dashboard</h1>
          {ideaSeed && <p className="text-gray-500 mt-1 text-sm max-w-2xl">{ideaSeed.length > 150 ? ideaSeed.slice(0, 150) + '...' : ideaSeed}</p>}
        </div>

        {!report ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No report generated yet</h2>
            <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">
              Generate a comprehensive validation dashboard with metrics, SWOT analysis, competitive positioning, and actionable insights.
            </p>
            <button onClick={handleGenerate} disabled={generating}
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Dashboard...
                </span>
              ) : 'Generate Validation Dashboard'}
            </button>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mt-4 text-sm max-w-md mx-auto">{error}</div>}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scoreboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Score */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center justify-center">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Overall Score</h2>
                <ScoreRing score={report.overallScore} size={140} />
                <span className={`mt-3 text-xs font-medium px-3 py-1 rounded-full ${riskColors[report.riskLevel] || 'bg-gray-100 text-gray-700'}`}>
                  {report.riskLevel} Risk
                </span>
              </div>

              {/* Score Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Score Breakdown</h2>
                <div className="space-y-3">
                  <MetricBar label="Market" value={report.marketScore} />
                  <MetricBar label="Product" value={report.productScore} />
                  <MetricBar label="Team Readiness" value={report.teamReadiness} />
                  <MetricBar label="Competition" value={report.competitivePosition} />
                  <MetricBar label="Customer Demand" value={report.customerDemand} />
                  <MetricBar label="Financial" value={report.financialViability} />
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">📋</span>
                Executive Summary
              </h2>
              <p className="text-gray-700 leading-relaxed">{stripMd(report.summary)}</p>
            </div>

            {/* SWOT Analysis */}
            {report.swot && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-xs">🧭</span>
                  SWOT Analysis
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Strengths</h3>
                    <ul className="space-y-2">
                      {report.swot.strengths?.map((s, i) => (
                        <li key={i} className="text-sm text-green-900 flex gap-2"><span className="text-green-500 flex-shrink-0">✓</span>{stripMd(s)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
                    <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">Weaknesses</h3>
                    <ul className="space-y-2">
                      {report.swot.weaknesses?.map((w, i) => (
                        <li key={i} className="text-sm text-red-900 flex gap-2"><span className="text-red-500 flex-shrink-0">✗</span>{stripMd(w)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Opportunities</h3>
                    <ul className="space-y-2">
                      {report.swot.opportunities?.map((o, i) => (
                        <li key={i} className="text-sm text-blue-900 flex gap-2"><span className="text-blue-500 flex-shrink-0">→</span>{stripMd(o)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                    <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Threats</h3>
                    <ul className="space-y-2">
                      {report.swot.threats?.map((t, i) => (
                        <li key={i} className="text-sm text-amber-900 flex gap-2"><span className="text-amber-500 flex-shrink-0">⚠</span>{stripMd(t)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-xs">💪</span>
                  Validated Strengths
                </h2>
                <ul className="space-y-3">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</span>
                      <span className="leading-relaxed">{stripMd(s)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-xs">⚠️</span>
                  Identified Risks
                </h2>
                <ul className="space-y-3">
                  {report.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✗</span>
                      <span className="leading-relaxed">{stripMd(w)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Competitive Positioning */}
            {report.competitorComparison?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center text-xs">⚔️</span>
                  Competitive Positioning
                </h2>
                <div className="space-y-3">
                  {report.competitorComparison.map((c, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{stripMd(c.weakness)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${c.score * 10}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-6 text-right">{c.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
              <h2 className="text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-200 flex items-center justify-center text-xs">🎯</span>
                Strategic Recommendations
              </h2>
              <div className="space-y-3">
                {report.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3 bg-white/60 rounded-xl p-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <p className="text-sm text-gray-800 leading-relaxed pt-1">{stripMd(r)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue to Strategy */}
            <div className="text-center pt-4">
              <button
                onClick={handleContinueToStrategy}
                disabled={continuing}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-semibold text-base hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-200 inline-flex items-center gap-3"
              >
                {continuing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    Continue to Strategy
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && !generating && !continuing && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mt-4 text-sm">{error}</div>
        )}
      </main>
    </div>
  )
}
