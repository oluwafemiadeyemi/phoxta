'use client'

import { XenoTemplatePreview, XenoAiPreview, XenoDsPreview, XenoMaPreview, XenoWaPreview } from './XenoTemplatePreview'

// ---------------------------------------------------------------------------
// Shared types & helpers
// ---------------------------------------------------------------------------
export type TemplateId = 'xeno' | 'xenoAi' | 'xenoDs' | 'xenoMa' | 'xenoWa'

export interface TemplateInfo {
  id: TemplateId
  name: string
  description: string
  preview: string // emoji preview
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'xeno', name: 'Agency', description: 'Creative agency template with services, projects & awards', preview: '🎨' },
  { id: 'xenoAi', name: 'AI Agency', description: 'Tech & AI solutions template with features, pricing & FAQ', preview: '🤖' },
  { id: 'xenoDs', name: 'Design Studio', description: 'Design studio template with projects, team & awards', preview: '🖌️' },
  { id: 'xenoMa', name: 'Marketing', description: 'Marketing agency template with work process, projects & blog', preview: '📣' },
  { id: 'xenoWa', name: 'Web Agency', description: 'Web design agency template with services, process & FAQ', preview: '🌐' },
]

export interface TemplateProps {
  landingData: Record<string, unknown>
  setLandingData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  generatedImages: Record<string, string>
  approvedSections: Set<string>
  businessInfo: {
    contactEmail: string
    contactPhone: string
    location: string
    businessHours: string
    socialLinks: string
    ctaUrl: string
  }
  saveDay10State: (
    ld: Record<string, unknown>,
    img: Record<string, string>,
    ap: Set<string>,
    biz: TemplateProps['businessInfo'],
  ) => void
  findImageForSection: (name: string) => string | undefined
  stripMd: (s: string) => string
  colorScheme: { primary: string; secondary: string; accent: string; background: string; text: string }
  coverImage: string
  editedHtml?: string
  onEditedHtmlChange?: (html: string) => void
  ideaId?: string
}

// ---------------------------------------------------------------------------
// Template renderer map
// ---------------------------------------------------------------------------
export const TEMPLATE_RENDERERS: Record<TemplateId, React.FC<TemplateProps>> = {
  xeno: XenoTemplatePreview,
  xenoAi: XenoAiPreview,
  xenoDs: XenoDsPreview,
  xenoMa: XenoMaPreview,
  xenoWa: XenoWaPreview,
}

