'use client'

import { useEffect, useState, useRef, useCallback, use } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { TEMPLATES, type TemplateId, TEMPLATE_RENDERERS, type TemplateProps } from '@/components/LandingTemplates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SiteData {
  template: TemplateId
  editedHtml?: string
  colorScheme: { primary: string; secondary: string; accent: string; background: string; text: string }
}

const DEFAULT_COLORS = { primary: '#0f172a', secondary: '#1e293b', accent: '#3b82f6', background: '#ffffff', text: '#111827' }

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

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function SiteEditorPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  // Site state
  const [loading, setLoading] = useState(true)
  const [siteData, setSiteData] = useState<SiteData | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('xeno')
  const [editedHtml, setEditedHtml] = useState<string | undefined>(undefined)
  const [templateResetKey, setTemplateResetKey] = useState(0)
  const editedHtmlRef = useRef<string | undefined>(undefined)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Designer canvas state
  const [activeLeftPanel, setActiveLeftPanel] = useState<'templates' | 'layers' | null>(null)
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [layersData, setLayersData] = useState<Array<{ id: string; name: string; tag: string; items: Array<{ type: string; label: string; tag: string; key: string; sectionId: string }> }>>([])
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Dummy state for TemplateProps (not tied to any idea)
  const [landingData, setLandingData] = useState<Record<string, unknown>>({})
  const generatedImages: Record<string, string> = {}
  const approvedSections = new Set<string>()
  const businessInfo = { contactEmail: '', contactPhone: '', location: '', businessHours: '', socialLinks: '', ctaUrl: '' }

  // Auth check + load site data
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // Load site from localStorage
      const raw = localStorage.getItem(`phoxta-site-${siteId}`)
      if (!raw) { router.push('/app/sites'); return }

      try {
        const data: SiteData = JSON.parse(raw)
        setSiteData(data)
        setSelectedTemplate(data.template)
        if (data.editedHtml) {
          setEditedHtml(data.editedHtml)
          editedHtmlRef.current = data.editedHtml
        }
      } catch {
        router.push('/app/sites')
        return
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  // Persist to localStorage (debounced)
  const persistSite = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const data: SiteData = {
        template: selectedTemplate,
        editedHtml: editedHtmlRef.current,
        colorScheme: siteData?.colorScheme || DEFAULT_COLORS,
      }
      localStorage.setItem(`phoxta-site-${siteId}`, JSON.stringify(data))
    }, 800)
  }, [siteId, selectedTemplate, siteData?.colorScheme])

  // Listen for iframe messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'phoxta-layers-tree' && Array.isArray(e.data.sections)) {
        setLayersData(e.data.sections)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Flush save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const data: SiteData = {
        template: selectedTemplate,
        editedHtml: editedHtmlRef.current,
        colorScheme: siteData?.colorScheme || DEFAULT_COLORS,
      }
      localStorage.setItem(`phoxta-site-${siteId}`, JSON.stringify(data))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  // Helper: send action to iframe layer element
  const sendLayerAction = (action: 'click' | 'highlight', key: string, itemType: string) => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement | null
    iframe?.contentWindow?.postMessage({ type: 'phoxta-layer-action', action, key, itemType }, '*')
  }

  const toggleLeftPanel = (panel: typeof activeLeftPanel) => setActiveLeftPanel(p => p === panel ? null : panel)

  if (loading || !siteData) {
    return (
      <div className="min-h-screen bg-[#0e0e11] flex items-center justify-center">
        <div className="text-white/50">Loading editor...</div>
      </div>
    )
  }

  const cs = siteData.colorScheme || DEFAULT_COLORS

  const templateProps: TemplateProps = {
    landingData,
    setLandingData,
    generatedImages,
    approvedSections,
    businessInfo,
    saveDay10State: () => persistSite(),
    findImageForSection: () => undefined,
    stripMd,
    colorScheme: cs,
    coverImage: '',
    editedHtml,
    onEditedHtmlChange: (html: string) => {
      editedHtmlRef.current = html
      persistSite()
    },
  }

  const TemplateComponent = TEMPLATE_RENDERERS[selectedTemplate]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0e0e11] text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ════════════ TOP BAR ════════════ */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-white/[0.06] bg-[#18181b] shrink-0 z-[60]">
        {/* Left group */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/app/sites')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back
          </button>
          <div className="w-px h-5 bg-white/[0.08]" />
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/30 font-semibold uppercase tracking-[0.15em]">Editor</span>
          </div>
        </div>

        {/* Center – responsive device toggles */}
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          {/* Desktop */}
          <button type="button" onClick={() => setViewportMode('desktop')} title="Desktop (1440px)"
            className={`w-8 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${viewportMode === 'desktop' ? 'bg-white/[0.12] text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" /></svg>
          </button>
          {/* Tablet */}
          <button type="button" onClick={() => setViewportMode('tablet')} title="Tablet (768px)"
            className={`w-8 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${viewportMode === 'tablet' ? 'bg-white/[0.12] text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25V4.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" /></svg>
          </button>
          {/* Mobile */}
          <button type="button" onClick={() => setViewportMode('mobile')} title="Mobile (375px)"
            className={`w-8 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${viewportMode === 'mobile' ? 'bg-white/[0.12] text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
          </button>
          <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
          <span className="text-[10px] text-white/25 font-mono px-1.5">{viewportMode === 'desktop' ? '1440' : viewportMode === 'tablet' ? '768' : '375'}px</span>
        </div>

        {/* Right group */}
        <div className="flex items-center gap-2">
          {/* Reset Template */}
          <button
            type="button"
            title="Reset template to original"
            onClick={() => {
              if (!window.confirm('Reset the entire template to its original state? All edits will be lost.')) return
              setEditedHtml(undefined)
              editedHtmlRef.current = undefined
              setTemplateResetKey(k => k + 1)
              persistSite()
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-red-400 bg-white/[0.04] hover:bg-red-500/[0.08] border border-white/[0.06] hover:border-red-500/20 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
            Reset
          </button>
          <div className="w-px h-5 bg-white/[0.08]" />
          {/* Template Picker */}
          <div className="relative group">
            <button type="button" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              {TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Template'}
              <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-white/[0.08] bg-[#1e1e22]/95 backdrop-blur-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => {
                  if (t.id !== selectedTemplate) { setEditedHtml(undefined); editedHtmlRef.current = undefined }
                  setSelectedTemplate(t.id)
                  // Update site data
                  const data: SiteData = { template: t.id, editedHtml: t.id !== selectedTemplate ? undefined : editedHtmlRef.current, colorScheme: cs }
                  setSiteData(data)
                  localStorage.setItem(`phoxta-site-${siteId}`, JSON.stringify(data))
                  // Update site list name
                  try {
                    const sites = JSON.parse(localStorage.getItem('phoxta-sites') || '[]')
                    const idx = sites.findIndex((s: { id: string }) => s.id === siteId)
                    if (idx >= 0) {
                      sites[idx].template = t.id
                      sites[idx].name = `${t.name} Site`
                      localStorage.setItem('phoxta-sites', JSON.stringify(sites))
                    }
                  } catch {}
                }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${selectedTemplate === t.id ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.04]'}`}
                >
                  <span className="text-base w-5 text-center">{t.preview}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium">{t.name}</p>
                    <p className="text-[9px] opacity-40 truncate">{t.description}</p>
                  </div>
                  {selectedTemplate === t.id && <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              persistSite()
              // Force immediate save
              const data: SiteData = { template: selectedTemplate, editedHtml: editedHtmlRef.current, colorScheme: cs }
              localStorage.setItem(`phoxta-site-${siteId}`, JSON.stringify(data))
              // Brief visual confirmation
              const btn = document.activeElement as HTMLButtonElement
              if (btn) { btn.textContent = 'Saved!'; setTimeout(() => { btn.textContent = 'Save' }, 1500) }
            }}
            className="h-8 px-4 text-xs font-bold shadow-lg border-0 cursor-pointer rounded-md text-white"
            style={{ backgroundColor: cs.accent }}
          >
            Save
          </button>
        </div>
      </div>

      {/* ════════════ MAIN BODY ════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ──── LEFT ICON BAR (48px) ──── */}
        <div className="w-12 bg-[#141416] border-r border-white/[0.06] flex flex-col items-center py-3 gap-1 shrink-0">
          {/* Templates */}
          <button type="button" onClick={() => toggleLeftPanel('templates')} title="Templates"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${activeLeftPanel === 'templates' ? 'bg-white/[0.12] text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}>
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </button>
          {/* Layers */}
          <button type="button" onClick={() => toggleLeftPanel('layers')} title="Layers"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${activeLeftPanel === 'layers' ? 'bg-white/[0.12] text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}>
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
          </button>

          <div className="flex-1" />

          {/* Help hint */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white/15" title="Click elements on canvas to edit">
            <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
          </div>
        </div>

        {/* ──── LEFT EXPANDABLE PANEL (240px) ──── */}
        {activeLeftPanel && (
          <div className="w-60 bg-[#18181b] border-r border-white/[0.06] flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-left-2 duration-200">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{activeLeftPanel === 'templates' ? 'Templates' : 'Layers'}</span>
              <button type="button" onClick={() => setActiveLeftPanel(null)} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeLeftPanel === 'templates' && TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => {
                  if (t.id !== selectedTemplate) { setEditedHtml(undefined); editedHtmlRef.current = undefined }
                  setSelectedTemplate(t.id)
                  const data: SiteData = { template: t.id, editedHtml: t.id !== selectedTemplate ? undefined : editedHtmlRef.current, colorScheme: cs }
                  setSiteData(data)
                  localStorage.setItem(`phoxta-site-${siteId}`, JSON.stringify(data))
                  try {
                    const sites = JSON.parse(localStorage.getItem('phoxta-sites') || '[]')
                    const idx = sites.findIndex((s: { id: string }) => s.id === siteId)
                    if (idx >= 0) {
                      sites[idx].template = t.id
                      sites[idx].name = `${t.name} Site`
                      localStorage.setItem('phoxta-sites', JSON.stringify(sites))
                    }
                  } catch {}
                }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                    selectedTemplate === t.id ? 'bg-white/[0.08] border-white/[0.12] text-white ring-1 ring-white/[0.08]' : 'border-transparent text-white/50 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-xl w-8 h-8 rounded-md bg-white/[0.06] flex items-center justify-center">{t.preview}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold">{t.name}</p>
                    <p className="text-[9px] opacity-40 truncate mt-0.5">{t.description}</p>
                  </div>
                </button>
              ))}
              {activeLeftPanel === 'layers' && (
                <div className="space-y-1">
                  {layersData.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <svg className="w-6 h-6 text-white/15 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
                      <p className="text-[10px] text-white/25">Loading layers...</p>
                    </div>
                  )}
                  {layersData.map((section) => {
                    const isCollapsed = collapsedSections.has(section.id)
                    return (
                      <div key={section.id} className="mb-0.5">
                        {/* Section header — click to collapse/expand */}
                        <button
                          type="button"
                          onClick={() => setCollapsedSections(prev => {
                            const next = new Set(prev)
                            if (next.has(section.id)) next.delete(section.id)
                            else next.add(section.id)
                            return next
                          })}
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer group"
                        >
                          <svg className={`w-3 h-3 text-white/25 shrink-0 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                          <span className="text-[10px] font-semibold text-white/50 group-hover:text-white/70 truncate flex-1 text-left">{section.name}</span>
                          <span className="text-[8px] text-white/20 font-mono uppercase shrink-0">{section.items.length}</span>
                        </button>
                        {/* Layer items — collapsible */}
                        {!isCollapsed && (
                          <div className="pl-4 mt-0.5">
                            {section.items.length === 0 && (
                              <p className="text-[9px] text-white/15 px-2 py-1">No editable elements</p>
                            )}
                            {section.items.map((item, idx) => (
                              <button
                                key={`${section.id}_${item.key || ''}_${idx}`}
                                type="button"
                                onClick={() => sendLayerAction('click', item.key, item.type)}
                                onMouseEnter={() => sendLayerAction('highlight', item.key, item.type)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all cursor-pointer hover:bg-white/[0.06] group"
                              >
                                <span className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                                  item.type === 'text' ? 'bg-indigo-500/70' : item.type === 'image' ? 'bg-amber-500/70' : 'bg-blue-500/70'
                                }`}>
                                  {item.type === 'text' ? 'T' : item.type === 'image' ? '\uD83D\uDDBC' : '\uD83D\uDD17'}
                                </span>
                                <span className="text-[10px] text-white/50 group-hover:text-white/70 truncate flex-1 min-w-0">{item.label}</span>
                                <span className="text-[8px] text-white/15 font-mono uppercase shrink-0">{item.tag}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── CENTER: VIEWPORT-SIZED PREVIEW ──── */}
        <div className="flex-1 overflow-auto bg-[#0e0e11]">
          <div
            className="mx-auto h-full"
            style={{
              width: viewportMode === 'desktop' ? 1440 : viewportMode === 'tablet' ? 768 : 375,
              maxWidth: '100%',
              transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
              background: cs.background,
              boxShadow: viewportMode !== 'desktop' ? '0 0 60px rgba(0,0,0,.5)' : undefined,
            }}
          >
            <TemplateComponent key={`${selectedTemplate}-${templateResetKey}`} {...templateProps} />
          </div>
        </div>
      </div>
    </div>
  )
}
