'use client'

import { useEffect, useState, useMemo } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ──────────────────────────────────────────────
interface Contact {
  id: string
  name: string
  email: string
  company: string
  phone: string
  stage: Stage
  value: number
  notes: string
  created_at: string
  updated_at: string
}

type Stage = 'lead' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

const STAGES: { key: Stage; label: string; color: string; bg: string }[] = [
  { key: 'lead', label: 'Lead', color: 'text-gray-600', bg: 'bg-gray-100' },
  { key: 'contacted', label: 'Contacted', color: 'text-blue-600', bg: 'bg-blue-100' },
  { key: 'qualified', label: 'Qualified', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { key: 'proposal', label: 'Proposal', color: 'text-purple-600', bg: 'bg-purple-100' },
  { key: 'negotiation', label: 'Negotiation', color: 'text-amber-600', bg: 'bg-amber-100' },
  { key: 'won', label: 'Won', color: 'text-green-600', bg: 'bg-green-100' },
  { key: 'lost', label: 'Lost', color: 'text-red-600', bg: 'bg-red-100' },
]

type ViewMode = 'pipeline' | 'table'

// ─── Inline Modal ───────────────────────────────────────
function ContactModal({ contact, onClose, onSave }: {
  contact: Partial<Contact> | null
  onClose: () => void
  onSave: (data: Partial<Contact>) => void
}) {
  const [form, setForm] = useState<Partial<Contact>>(contact || {
    name: '', email: '', company: '', phone: '', stage: 'lead' as Stage, value: 0, notes: '',
  })

  if (!contact && !form) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{contact?.id ? 'Edit Contact' : 'New Contact'}</h3>
        <div className="space-y-3">
          <input
            placeholder="Full Name *"
            value={form.name || ''}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email || ''}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
          <input
            placeholder="Company"
            value={form.company || ''}
            onChange={e => setForm({ ...form, company: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
          <input
            placeholder="Phone"
            value={form.phone || ''}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
          <select
            value={form.stage || 'lead'}
            onChange={e => setForm({ ...form, stage: e.target.value as Stage })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          >
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <input
            placeholder="Deal Value ($)"
            type="number"
            value={form.value || ''}
            onChange={e => setForm({ ...form, value: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
          <textarea
            placeholder="Notes"
            rows={3}
            value={form.notes || ''}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none"
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { if (form.name) onSave(form) }}
            className="flex-1 px-4 py-2 text-sm text-white bg-rose-600 rounded-lg hover:bg-rose-700 font-medium"
          >
            {contact?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────
export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline')
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  // Auth check + load contacts
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      await loadContacts()
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadContacts = async () => {
    const { data } = await supabase
      .from('crm_contacts')
      .select('*')
      .order('updated_at', { ascending: false })
    if (data) setContacts(data)
  }

  const saveContact = async (data: Partial<Contact>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (data.id) {
      await supabase.from('crm_contacts').update({
        name: data.name, email: data.email, company: data.company,
        phone: data.phone, stage: data.stage, value: data.value,
        notes: data.notes, updated_at: new Date().toISOString(),
      }).eq('id', data.id)
    } else {
      await supabase.from('crm_contacts').insert({
        ...data, user_id: user.id,
      })
    }
    setShowModal(false)
    setEditingContact(null)
    await loadContacts()
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    await supabase.from('crm_contacts').delete().eq('id', id)
    await loadContacts()
  }

  const moveStage = async (id: string, stage: Stage) => {
    await supabase.from('crm_contacts').update({ stage, updated_at: new Date().toISOString() }).eq('id', id)
    await loadContacts()
  }

  const filtered = useMemo(() =>
    contacts.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase())
    ), [contacts, search])

  // Stats
  const totalValue = contacts.filter(c => c.stage === 'won').reduce((s, c) => s + (c.value || 0), 0)
  const pipelineValue = contacts.filter(c => !['won', 'lost'].includes(c.stage)).reduce((s, c) => s + (c.value || 0), 0)
  const wonCount = contacts.filter(c => c.stage === 'won').length
  const conversionRate = contacts.length > 0 ? Math.round((wonCount / contacts.length) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading CRM...</div>
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
            <h1 className="text-lg font-semibold text-gray-900">Phoxta CRM</h1>
          </div>
          <Link href="/app" className="text-sm text-gray-500 hover:text-gray-700">← Back to Hub</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Contacts', value: contacts.length, color: 'text-gray-900' },
            { label: 'Pipeline Value', value: `$${pipelineValue.toLocaleString()}`, color: 'text-indigo-600' },
            { label: 'Won Revenue', value: `$${totalValue.toLocaleString()}`, color: 'text-green-600' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, color: 'text-amber-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <input
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
            />
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('pipeline')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Pipeline</button>
              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Table</button>
            </div>
          </div>
          <button
            onClick={() => { setEditingContact({}); setShowModal(true) }}
            className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add Contact
          </button>
        </div>

        {/* Pipeline View */}
        {viewMode === 'pipeline' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.filter(s => s.key !== 'lost').map(stage => {
              const stageContacts = filtered.filter(c => c.stage === stage.key)
              const stageValue = stageContacts.reduce((s, c) => s + (c.value || 0), 0)
              return (
                <div
                  key={stage.key}
                  className="flex-shrink-0 w-64 bg-gray-100/50 rounded-xl p-3"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { const id = e.dataTransfer.getData('contactId'); if (id) moveStage(id, stage.key) }}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                      <span className="text-[10px] text-gray-400 bg-white rounded-full px-1.5 py-0.5">{stageContacts.length}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">${stageValue.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    {stageContacts.map(c => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData('contactId', c.id)}
                        onClick={() => { setEditingContact(c); setShowModal(true) }}
                        className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            {c.company && <p className="text-xs text-gray-400 mt-0.5">{c.company}</p>}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteContact(c.id) }}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        {c.value > 0 && <p className="text-xs text-green-600 font-medium mt-2">${c.value.toLocaleString()}</p>}
                        {c.email && <p className="text-[10px] text-gray-300 mt-1 truncate">{c.email}</p>}
                      </div>
                    ))}
                    {stageContacts.length === 0 && (
                      <div className="text-center py-6 text-xs text-gray-300">Drop contacts here</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Stage</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Value</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const stageInfo = STAGES.find(s => s.key === c.stage)
                    return (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.company || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stageInfo?.bg} ${stageInfo?.color}`}>
                            {stageInfo?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{c.value ? `$${c.value.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingContact(c); setShowModal(true) }}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                            </button>
                            <button
                              onClick={() => deleteContact(c.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                        {search ? 'No contacts match your search.' : 'No contacts yet. Add your first contact to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {contacts.length === 0 && !search && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Start Building Your Pipeline</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Add contacts, track deals through stages, and grow your business relationships.</p>
            <button
              onClick={() => { setEditingContact({}); setShowModal(true) }}
              className="inline-flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-rose-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Your First Contact
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <ContactModal
          contact={editingContact}
          onClose={() => { setShowModal(false); setEditingContact(null) }}
          onSave={saveContact}
        />
      )}
    </div>
  )
}
