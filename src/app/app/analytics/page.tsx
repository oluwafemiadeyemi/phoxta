'use client'

import { useEffect, useState, useMemo } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ──────────────────────────────────────────────
interface Metric {
  id: string
  label: string
  value: number
  previous_value: number
  unit: string
  category: string
  updated_at: string
}

interface Activity {
  id: string
  action: string
  detail: string
  timestamp: string
}

// ─── Sparkline Chart (SVG) ──────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const h = 36
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

// ─── Donut Chart (SVG) ──────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <div className="text-xs text-gray-400 text-center py-8">No data</div>
  const size = 140
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dashLen = pct * circumference
          const dashOffset = -offset
          offset += dashLen
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`} strokeDashoffset={dashOffset} strokeLinecap="round" />
          )
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
            <span className="text-xs text-gray-600">{seg.label}</span>
            <span className="text-xs font-medium text-gray-900">{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bar Chart (SVG) ────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-500 font-medium">{d.value}</span>
          <div className="w-full bg-indigo-500 rounded-t-md transition-all" style={{ height: `${(d.value / max) * 100}%`, minHeight: 4 }} />
          <span className="text-[10px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────
export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      await loadData()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    const { data: m } = await supabase.from('analytics_metrics').select('*').order('updated_at', { ascending: false })
    const { data: a } = await supabase.from('analytics_activities').select('*').order('timestamp', { ascending: false }).limit(20)
    if (m) setMetrics(m)
    if (a) setActivities(a)
  }

  // Demo data for charts (when DB is empty, show placeholder data)
  const sparkData = useMemo(() => {
    if (metrics.length > 0) return metrics.slice(0, 7).map(m => m.value)
    return [12, 19, 14, 25, 22, 30, 28]
  }, [metrics])

  const donutSegments = useMemo(() => [
    { label: 'Idea Validator', value: 45, color: '#3b82f6' },
    { label: 'Designer', value: 25, color: '#a855f7' },
    { label: 'Web Design', value: 15, color: '#14b8a6' },
    { label: 'CRM', value: 10, color: '#f43f5e' },
    { label: 'Email', value: 5, color: '#6366f1' },
  ], [])

  const barData = useMemo(() => [
    { label: 'Mon', value: 8 }, { label: 'Tue', value: 12 },
    { label: 'Wed', value: 6 }, { label: 'Thu', value: 15 },
    { label: 'Fri', value: 20 }, { label: 'Sat', value: 10 },
    { label: 'Sun', value: 5 },
  ], [])

  const kpis = [
    { label: 'Total Sessions', value: '1,248', change: '+12%', positive: true, icon: '👁️' },
    { label: 'Ideas Validated', value: '36', change: '+8%', positive: true, icon: '💡' },
    { label: 'Designs Created', value: '84', change: '+23%', positive: true, icon: '🎨' },
    { label: 'Emails Sent', value: '2.1K', change: '-3%', positive: false, icon: '📧' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading Analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <Image src="/phoxta-logo.png" alt="Phoxta" width={120} height={120} className="rounded-2xl" />
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-semibold text-gray-900">Analytics Hub</h1>
          </div>
          <Link href="/app" className="text-sm text-gray-500 hover:text-gray-700">← Back to Hub</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Time range toggle */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['7d', '30d', '90d'] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                <span className="text-lg">{kpi.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium ${kpi.positive ? 'text-green-600' : 'text-red-500'}`}>{kpi.change}</span>
                <span className="text-xs text-gray-400">vs last period</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Trend</h3>
            <BarChart data={barData} />
          </div>

          {/* Workspace Usage */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Workspace Usage</h3>
            <DonutChart segments={donutSegments} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              {[
                { label: 'Page Views', val: '3,482', spark: sparkData, color: '#6366f1' },
                { label: 'Avg. Session', val: '4m 32s', spark: [3, 4, 3.5, 5, 4.5, 6, 5.5], color: '#a855f7' },
                { label: 'Bounce Rate', val: '32%', spark: [40, 38, 35, 33, 32, 30, 32], color: '#f43f5e' },
                { label: 'Conversion', val: '8.2%', spark: [5, 6, 7, 6.5, 8, 7.5, 8.2], color: '#14b8a6' },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{m.label}</p>
                    <p className="text-lg font-bold text-gray-900">{m.val}</p>
                  </div>
                  <Sparkline data={m.spark} color={m.color} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.slice(0, 8).map(a => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-700">{a.action}</p>
                      <p className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { action: 'New idea validated', time: '2 hours ago' },
                  { action: 'Design project exported', time: '4 hours ago' },
                  { action: 'Contact moved to "Won"', time: '1 day ago' },
                  { action: 'Email campaign sent', time: '1 day ago' },
                  { action: 'Website published', time: '2 days ago' },
                  { action: 'New contact added to CRM', time: '3 days ago' },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-700">{a.action}</p>
                      <p className="text-xs text-gray-400">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
