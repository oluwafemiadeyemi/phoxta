'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { TEMPLATES, type TemplateId } from '@/components/LandingTemplates'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SavedSite {
  id: string
  name: string
  template: TemplateId
  createdAt: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSavedSites(): SavedSite[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('phoxta-sites') || '[]')
  } catch { return [] }
}

function saveSitesList(sites: SavedSite[]) {
  localStorage.setItem('phoxta-sites', JSON.stringify(sites))
}

function generateId(): string {
  return crypto.randomUUID()
}

// ---------------------------------------------------------------------------
// Template folder map (matches XenoTemplatePreview.tsx XENO_VARIANTS)
// ---------------------------------------------------------------------------
const TEMPLATE_FOLDERS: Record<TemplateId, string> = {
  xeno: '/templates/xeno/',
  xenoAi: '/templates/xeno-ai/',
  xenoDs: '/templates/xeno-ds/',
  xenoMa: '/templates/xeno-ma/',
  xenoWa: '/templates/xeno-wa/',
  xenoMin: '/templates/xeno-min/',
  xenoSu: '/templates/xeno-su/',
  xenoPf: '/templates/xeno-pf/',
  xenoCo: '/templates/xeno-co/',
  xenoRe: '/templates/xeno-re/',
  xenoInf: '/templates/xeno-inf/',
  xenoLaw: '/templates/xeno-law/',
  xenoFit: '/templates/xeno-fit/',
  xenoEdu: '/templates/xeno-edu/',
  xenoMed: '/templates/xeno-med/',
  xenoEv: '/templates/xeno-ev/',
  xenoRl: '/templates/xeno-rl/',
  xenoPh: '/templates/xeno-ph/',
  xenoTra: '/templates/xeno-tra/',
  xenoEco: '/templates/xeno-eco/',
  xenoMus: '/templates/xeno-mus/',
  xenoBar: '/templates/xeno-bar/',
  xenoCafe: '/templates/xeno-cafe/',
  xenoPet: '/templates/xeno-pet/',
  xenoArc: '/templates/xeno-arc/',
  xenoYog: '/templates/xeno-yog/',
  xenoAut: '/templates/xeno-aut/',
  xenoDen: '/templates/xeno-den/',
  xenoFlo: '/templates/xeno-flo/',
  xenoBak: '/templates/xeno-bak/',
  xenoSpa: '/templates/xeno-spa/',
  xenoNgo: '/templates/xeno-ngo/',
  xenoPod: '/templates/xeno-pod/',
  xenoCry: '/templates/xeno-cry/',
  xenoFas: '/templates/xeno-fas/',
  xenoInt: '/templates/xeno-int/',
  xenoDj: '/templates/xeno-dj/',
  xenoAcc: '/templates/xeno-acc/',
  xenoPlm: '/templates/xeno-plm/',
  xenoDay: '/templates/xeno-day/',
  xenoChu: '/templates/xeno-chu/',
  xenoIns: '/templates/xeno-ins/',
  xenoVet: '/templates/xeno-vet/',
  xenoPhr: '/templates/xeno-phr/',
  xenoLog: '/templates/xeno-log/',
  xenoAgr: '/templates/xeno-agr/',
  xenoWne: '/templates/xeno-wne/',
  xenoBrw: '/templates/xeno-brw/',
  xenoTat: '/templates/xeno-tat/',
  xenoCln: '/templates/xeno-cln/',
  xenoSec: '/templates/xeno-sec/',
  xenoMov: '/templates/xeno-mov/',
  xenoWed: '/templates/xeno-wed/',
  xenoHtl: '/templates/xeno-htl/',
  xenoGol: '/templates/xeno-gol/',
  xenoMar: '/templates/xeno-mar/',
  xenoDnc: '/templates/xeno-dnc/',
  xenoThr: '/templates/xeno-thr/',
  xenoMsm: '/templates/xeno-msm/',
  xenoRec: '/templates/xeno-rec/',
  xenoBld: '/templates/xeno-bld/',
  xenoSol: '/templates/xeno-sol/',
  xenoJwl: '/templates/xeno-jwl/',
  xenoOpt: '/templates/xeno-opt/',
  xenoChi: '/templates/xeno-chi/',
  xenoPsy: '/templates/xeno-psy/',
  xenoNut: '/templates/xeno-nut/',
  xenoCok: '/templates/xeno-cok/',
  xenoLnd: '/templates/xeno-lnd/',
  xenoPrn: '/templates/xeno-prn/',
  xenoCwh: '/templates/xeno-cwh/',
  xenoLau: '/templates/xeno-lau/',
  xenoNrs: '/templates/xeno-nrs/',
  xenoGrc: '/templates/xeno-grc/',
  xenoBks: '/templates/xeno-bks/',
  xenoGam: '/templates/xeno-gam/',
  xenoSpt: '/templates/xeno-spt/',
  xenoCam: '/templates/xeno-cam/',
  xenoDiv: '/templates/xeno-div/',
  xenoBnk: '/templates/xeno-bnk/',
  xenoApt: '/templates/xeno-apt/',
}

// ---------------------------------------------------------------------------
// Template Categories for grouping
// ---------------------------------------------------------------------------
type TemplateCategory = 'All' | 'Business' | 'Creative' | 'Health & Wellness' | 'Food & Drink' | 'Services' | 'Entertainment' | 'Community' | 'Tech'

const TEMPLATE_CATEGORIES: Record<TemplateCategory, TemplateId[]> = {
  'All': [],
  'Business': ['xenoCo', 'xenoMa', 'xenoWa', 'xenoAcc', 'xenoRl', 'xenoLaw', 'xenoArc', 'xenoIns', 'xenoLog', 'xenoHtl', 'xenoRec', 'xenoBnk', 'xenoApt'],
  'Creative': ['xeno', 'xenoDs', 'xenoPf', 'xenoMin', 'xenoPh', 'xenoFas', 'xenoInt', 'xenoTat', 'xenoJwl', 'xenoPrn'],
  'Health & Wellness': ['xenoMed', 'xenoDen', 'xenoFit', 'xenoYog', 'xenoSpa', 'xenoVet', 'xenoPhr', 'xenoOpt', 'xenoChi', 'xenoPsy', 'xenoNut', 'xenoNrs'],
  'Food & Drink': ['xenoRe', 'xenoCafe', 'xenoBak', 'xenoBar', 'xenoFlo', 'xenoWne', 'xenoBrw', 'xenoCok', 'xenoGrc'],
  'Services': ['xenoPlm', 'xenoAut', 'xenoPet', 'xenoEv', 'xenoDay', 'xenoCln', 'xenoSec', 'xenoMov', 'xenoWed', 'xenoBld', 'xenoLnd', 'xenoCwh', 'xenoLau'],
  'Entertainment': ['xenoMus', 'xenoDj', 'xenoPod', 'xenoInf', 'xenoGol', 'xenoMar', 'xenoDnc', 'xenoThr', 'xenoGam', 'xenoSpt', 'xenoDiv'],
  'Community': ['xenoEdu', 'xenoChu', 'xenoNgo', 'xenoTra', 'xenoEco', 'xenoAgr', 'xenoMsm', 'xenoBks', 'xenoCam'],
  'Tech': ['xenoAi', 'xenoSu', 'xenoCry', 'xenoSol'],
}

const CATEGORY_ICONS: Record<TemplateCategory, string> = {
  'All': '🌐',
  'Business': '💼',
  'Creative': '🎨',
  'Health & Wellness': '💚',
  'Food & Drink': '🍽️',
  'Services': '🔧',
  'Entertainment': '🎵',
  'Community': '🤝',
  'Tech': '🚀',
}

// ---------------------------------------------------------------------------
// Template Preview Thumbnail — renders the REAL template in a scaled iframe
// ---------------------------------------------------------------------------
function TemplateThumbnail({ templateId }: { templateId: TemplateId }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [scale, setScale] = useState(0.25)

  // Measure container width and compute scale
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        setScale(w / 1440)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const folder = TEMPLATE_FOLDERS[templateId]
    fetch(`${folder}index.html?v=${Date.now()}`)
      .then(r => r.text())
      .then(html => {
        // Fix relative asset paths so images/css load correctly
        const baseTag = `<base href="${folder}" />`
        const patched = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
        // Add styles to hide scrollbars, disable interaction, show AOS elements & hide preloader
        const freezeStyle = `<style>
          * { cursor: default !important; pointer-events: none !important; }
          ::-webkit-scrollbar { display: none !important; }
          html { overflow: hidden !important; -ms-overflow-style: none; scrollbar-width: none; }
          /* Force-show AOS elements that are hidden by default (opacity:0) */
          [data-aos] { opacity: 1 !important; transform: none !important; transition: none !important; }
          /* Hide preloader overlay */
          .preloader { display: none !important; }
          /* Disable smooth-scroll wrappers that may collapse content */
          #smooth-wrapper, #smooth-content { transform: none !important; }
        </style>`
        setSrcDoc(patched.replace('</head>', `${freezeStyle}</head>`))
      })
      .catch(() => {})
  }, [templateId])

  const iframeHeight = 900

  if (!srcDoc) {
    return (
      <div ref={containerRef} className="w-full aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden flex items-center justify-center animate-pulse">
        <span className="text-3xl">{TEMPLATES.find(t => t.id === templateId)?.preview || '🌐'}</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative bg-white"
      style={{ height: iframeHeight * scale }}
    >
      <iframe
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        title={`${templateId} preview`}
        className="absolute top-0 left-0 border-0"
        style={{
          width: '1440px',
          height: `${iframeHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
        tabIndex={-1}
      />
      {/* Invisible overlay to block any stray interactions */}
      <div className="absolute inset-0 z-10" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Full-size Preview Iframe (used in the preview modal)
// ---------------------------------------------------------------------------
function PreviewIframe({ templateId }: { templateId: TemplateId }) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null)

  useEffect(() => {
    const folder = TEMPLATE_FOLDERS[templateId]
    fetch(`${folder}index.html?v=${Date.now()}`)
      .then(r => r.text())
      .then(html => {
        const baseTag = `<base href="${folder}" />`
        const patched = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
        // Disable preloader, show AOS elements
        const fixStyle = `<style>
          .preloader { display: none !important; }
          [data-aos] { opacity: 1 !important; transform: none !important; transition: none !important; }
          #smooth-wrapper, #smooth-content { transform: none !important; }
        </style>`
        setSrcDoc(patched.replace('</head>', `${fixStyle}</head>`))
      })
      .catch(() => {})
  }, [templateId])

  if (!srcDoc) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 animate-pulse">Loading preview...</div>
      </div>
    )
  }

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-scripts"
      title={`${templateId} full preview`}
      className="w-full border-0"
      style={{ minHeight: '100vh', height: '100%' }}
      tabIndex={-1}
    />
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function SitesPage() {
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<SavedSite[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<TemplateId | null>(null)
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('All')
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setSites(getSavedSites())
      setLoading(false)
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateSite = (templateId: TemplateId) => {
    const id = generateId()
    const newSite: SavedSite = {
      id,
      name: `${TEMPLATES.find(t => t.id === templateId)?.name || 'Website'} Site`,
      template: templateId,
      createdAt: new Date().toISOString(),
    }
    // Save site metadata
    const updated = [newSite, ...sites]
    saveSitesList(updated)
    // Initialize site data in localStorage
    localStorage.setItem(`phoxta-site-${id}`, JSON.stringify({
      template: templateId,
      editedHtml: undefined,
      templateVersion: 4,
      colorScheme: { primary: '#0f172a', secondary: '#1e293b', accent: '#3b82f6', background: '#ffffff', text: '#111827' },
    }))
    router.push(`/app/sites/${id}`)
  }

  const handleDeleteSite = (siteId: string) => {
    if (!window.confirm('Delete this site? This cannot be undone.')) return
    setDeletingId(siteId)
    const updated = sites.filter(s => s.id !== siteId)
    saveSitesList(updated)
    localStorage.removeItem(`phoxta-site-${siteId}`)
    setSites(updated)
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <Image src="/phoxta-logo.png" alt="Phoxta" width={120} height={120} className="rounded-2xl" />
            </Link>
            <div className="w-px h-6 bg-gray-200" />
            <h1 className="text-lg font-semibold text-gray-900">Web Design</h1>
          </div>
          <Link href="/app" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Hub
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Template Gallery */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h2>
            <p className="text-gray-500">Pick a website template to start customizing</p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {(Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
                <span className={`text-xs ${activeCategory === cat ? 'text-blue-100' : 'text-gray-400'}`}>
                  {cat === 'All' ? TEMPLATES.length : TEMPLATE_CATEGORIES[cat].length}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeCategory === 'All' ? TEMPLATES : TEMPLATES.filter(t => TEMPLATE_CATEGORIES[activeCategory].includes(t.id))).map((t) => (
              <div
                key={t.id}
                className="group text-left bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300"
              >
                {/* Preview area */}
                <div className="relative overflow-hidden rounded-t-2xl">
                  <TemplateThumbnail templateId={t.id} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 z-20" />
                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(t.id)}
                      className="bg-white/90 backdrop-blur-sm text-gray-900 text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateSite(t.id)}
                      className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Use Template →
                    </button>
                  </div>
                </div>
                {/* Info */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{t.preview}</span>
                    <h3 className="text-base font-semibold text-gray-900">{t.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Sites */}
        {sites.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Your Sites</h2>
              <span className="text-sm text-gray-400">{sites.length} site{sites.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sites.map((site) => {
                const templateInfo = TEMPLATES.find(t => t.id === site.template)
                return (
                  <div key={site.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group">
                    {/* Click to open editor */}
                    <Link href={`/app/sites/${site.id}`} className="block">
                      <div className="relative overflow-hidden">
                        <TemplateThumbnail templateId={site.template} />
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{site.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {templateInfo?.name} • {new Date(site.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    {/* Delete */}
                    <div className="px-4 pb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteSite(site.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* ═══════════ Template Preview Modal ═══════════ */}
      {previewTemplate && (() => {
        const tpl = TEMPLATES.find(t => t.id === previewTemplate)
        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
            {/* Modal chrome */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{tpl?.preview}</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{tpl?.name}</h3>
                  <p className="text-xs text-gray-500">{tpl?.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setPreviewTemplate(null); handleCreateSite(previewTemplate) }}
                  className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-full hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Use Template →
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* Full-page iframe preview */}
            <div className="flex-1 overflow-auto bg-white" onClick={e => e.stopPropagation()}>
              <PreviewIframe templateId={previewTemplate} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
