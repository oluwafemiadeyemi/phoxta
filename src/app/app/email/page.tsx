'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ──────────────────────────────────────────────
interface Campaign {
  id: string
  name: string
  subject: string
  status: 'draft' | 'scheduled' | 'sent' | 'paused'
  recipients: number
  opens: number
  clicks: number
  body_html: string
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
}

type Tab = 'all' | 'draft' | 'scheduled' | 'sent'

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-600' },
  scheduled: { label: 'Scheduled', bg: 'bg-amber-100', text: 'text-amber-700' },
  sent: { label: 'Sent', bg: 'bg-green-100', text: 'text-green-700' },
  paused: { label: 'Paused', bg: 'bg-red-100', text: 'text-red-600' },
}

// ─── Campaign Editor Modal ──────────────────────────────
function CampaignEditor({ campaign, onClose, onSave }: {
  campaign: Partial<Campaign> | null
  onClose: () => void
  onSave: (data: Partial<Campaign>) => void
}) {
  const [form, setForm] = useState<Partial<Campaign>>(campaign || {
    name: '', subject: '', body_html: '', status: 'draft', recipients: 0,
  })
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{campaign?.id ? 'Edit Campaign' : 'New Campaign'}</h3>
        </div>

        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab('edit')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'edit' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Editor</button>
          <button onClick={() => setTab('preview')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'preview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'}`}>Preview</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'edit' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Campaign Name</label>
                <input
                  value={form.name || ''}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Welcome Series - Week 1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Subject Line</label>
                <input
                  value={form.subject || ''}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. You're going to love this..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Recipients</label>
                <input
                  type="number"
                  value={form.recipients || ''}
                  onChange={e => setForm({ ...form, recipients: Number(e.target.value) })}
                  placeholder="Number of recipients"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Body (HTML)</label>
                <textarea
                  value={form.body_html || ''}
                  onChange={e => setForm({ ...form, body_html: e.target.value })}
                  rows={10}
                  placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at || ''}
                  onChange={e => setForm({ ...form, scheduled_at: e.target.value, status: e.target.value ? 'scheduled' : 'draft' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-6 min-h-[200px]">
              <div className="mb-4 pb-3 border-b border-gray-100">
                <p className="text-xs text-gray-400">Subject:</p>
                <p className="text-sm font-medium text-gray-900">{form.subject || '(No subject)'}</p>
              </div>
              {form.body_html ? (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: form.body_html }} />
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No content yet. Switch to Editor tab to add email body.</p>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (form.name) onSave(form) }}
            className="flex-1 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium"
          >
            {campaign?.id ? 'Update' : 'Create'} Campaign
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────
export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      await loadCampaigns()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCampaigns(data)
  }

  const saveCampaign = async (data: Partial<Campaign>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (data.id) {
      await supabase.from('email_campaigns').update({
        name: data.name, subject: data.subject, body_html: data.body_html,
        recipients: data.recipients, status: data.status, scheduled_at: data.scheduled_at,
      }).eq('id', data.id)
    } else {
      await supabase.from('email_campaigns').insert({ ...data, user_id: user.id })
    }
    setShowEditor(false)
    setEditingCampaign(null)
    await loadCampaigns()
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    await supabase.from('email_campaigns').delete().eq('id', id)
    await loadCampaigns()
  }

  const duplicateCampaign = async (c: Campaign) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('email_campaigns').insert({
      name: `${c.name} (Copy)`, subject: c.subject, body_html: c.body_html,
      status: 'draft', recipients: c.recipients, user_id: user.id,
    })
    await loadCampaigns()
  }

  const filteredCampaigns = activeTab === 'all' ? campaigns : campaigns.filter(c => c.status === activeTab)

  // Stats
  const totalSent = campaigns.filter(c => c.status === 'sent').length
  const totalRecipients = campaigns.reduce((s, c) => s + (c.recipients || 0), 0)
  const totalOpens = campaigns.reduce((s, c) => s + (c.opens || 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
  const openRate = totalRecipients > 0 ? Math.round((totalOpens / totalRecipients) * 100) : 0
  const clickRate = totalOpens > 0 ? Math.round((totalClicks / totalOpens) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading Email Campaigns...</div>
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
            <h1 className="text-lg font-semibold text-gray-900">Email Campaigns</h1>
          </div>
          <Link href="/app" className="text-sm text-gray-500 hover:text-gray-700">← Back to Hub</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Campaigns Sent', value: totalSent, color: 'text-gray-900' },
            { label: 'Total Recipients', value: totalRecipients.toLocaleString(), color: 'text-indigo-600' },
            { label: 'Open Rate', value: `${openRate}%`, color: 'text-green-600' },
            { label: 'Click Rate', value: `${clickRate}%`, color: 'text-amber-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {([['all', 'All'], ['draft', 'Drafts'], ['scheduled', 'Scheduled'], ['sent', 'Sent']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {label}
                {key !== 'all' && (
                  <span className="ml-1 text-[10px] text-gray-400">({campaigns.filter(c => c.status === key).length})</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditingCampaign({}); setShowEditor(true) }}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            New Campaign
          </button>
        </div>

        {/* Campaign List */}
        <div className="space-y-3">
          {filteredCampaigns.map(c => {
            const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{c.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 truncate">Subject: {c.subject || '(No subject)'}</p>
                    <div className="flex items-center gap-5">
                      <span className="text-xs text-gray-400">
                        <span className="font-medium text-gray-600">{c.recipients || 0}</span> recipients
                      </span>
                      {c.status === 'sent' && (
                        <>
                          <span className="text-xs text-gray-400">
                            <span className="font-medium text-green-600">{c.opens || 0}</span> opens
                          </span>
                          <span className="text-xs text-gray-400">
                            <span className="font-medium text-indigo-600">{c.clicks || 0}</span> clicks
                          </span>
                        </>
                      )}
                      {c.scheduled_at && c.status === 'scheduled' && (
                        <span className="text-xs text-amber-600">Scheduled: {new Date(c.scheduled_at).toLocaleString()}</span>
                      )}
                      {c.sent_at && (
                        <span className="text-xs text-gray-400">Sent: {new Date(c.sent_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCampaign(c); setShowEditor(true) }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100" title="Edit">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                    </button>
                    <button onClick={() => duplicateCampaign(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50" title="Duplicate">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
                    </button>
                    <button onClick={() => deleteCampaign(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50" title="Delete">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {campaigns.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Create Your First Campaign</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Design beautiful emails, schedule sends, and track engagement — all in one place.</p>
            <button
              onClick={() => { setEditingCampaign({}); setShowEditor(true) }}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New Campaign
            </button>
          </div>
        )}

        {filteredCampaigns.length === 0 && campaigns.length > 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No campaigns in this category.</div>
        )}
      </main>

      {/* Editor Modal */}
      {showEditor && (
        <CampaignEditor
          campaign={editingCampaign}
          onClose={() => { setShowEditor(false); setEditingCampaign(null) }}
          onSave={saveCampaign}
        />
      )}
    </div>
  )
}
