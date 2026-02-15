'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { getPrefillForDay } from '@/lib/prefill'
import { getSubPhaseForDay, getSubPhaseIndices } from '@/lib/phaseConfig'

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Textarea as ShadTextarea } from '@/components/ui/textarea'
import AssetLibraryModal from '@/components/AssetLibraryModal'
import { TEMPLATES, TEMPLATE_RENDERERS, type TemplateId, type TemplateProps } from '@/components/LandingTemplates'

// ---------------------------------------------------------------------------
// Auto-resizing textarea component
// ---------------------------------------------------------------------------
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 2,
  ...rest
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  minRows?: number
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 20 // ~text-sm line height
    const minHeight = lineHeight * minRows + 24 // padding
    el.style.height = Math.max(el.scrollHeight, minHeight) + 'px'
  }, [value, minRows])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${className ?? ''} resize-none overflow-hidden`}
      {...rest}
    />
  )
}

// ---------------------------------------------------------------------------
// FormattedText — renders AI text with rich formatting (robust parser)
// ---------------------------------------------------------------------------
function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip blank lines
    if (!trimmed) { i++; continue }

    // Heading: ### or #### etc
    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/)
    if (headingMatch) {
      elements.push(
        <h4 key={`h-${i}`} className="text-sm font-bold text-gray-900 mt-3 mb-1">
          {renderInline(headingMatch[1])}
        </h4>
      )
      i++; continue
    }

    // Bold-only header line: **Something:** or **Something**
    const boldHeaderMatch = trimmed.match(/^\*\*(.+?)\*\*\s*:?\s*$/)
    if (boldHeaderMatch) {
      elements.push(
        <h4 key={`bh-${i}`} className="text-sm font-bold text-gray-900 mt-3 mb-1">
          {boldHeaderMatch[1]}
        </h4>
      )
      i++; continue
    }

    // Collect consecutive bullet lines (- or •)
    if (/^\s*[-•]\s/.test(trimmed)) {
      const bulletItems: { text: string; idx: number }[] = []
      while (i < lines.length && /^\s*[-•]\s/.test(lines[i].trim())) {
        bulletItems.push({ text: lines[i].trim().replace(/^\s*[-•]\s*/, ''), idx: i })
        i++
      }
      elements.push(
        <ul key={`ul-${bulletItems[0].idx}`} className="space-y-1.5 ml-1 my-1">
          {bulletItems.map(b => (
            <li key={b.idx} className="flex gap-2 text-sm text-gray-800 leading-relaxed">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
              <span>{renderInline(b.text)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Collect consecutive numbered lines (1. 2. 3.)
    if (/^\s*\d+[.)]\s/.test(trimmed)) {
      const numItems: { num: string; text: string; idx: number }[] = []
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^\s*(\d+)[.)]\s*(.*)/)
        numItems.push({ num: m?.[1] ?? String(numItems.length + 1), text: m?.[2] ?? lines[i], idx: i })
        i++
      }
      elements.push(
        <ol key={`ol-${numItems[0].idx}`} className="space-y-1.5 ml-1 my-1">
          {numItems.map(n => (
            <li key={n.idx} className="flex gap-2 text-sm text-gray-800 leading-relaxed">
              <span className="text-blue-500 font-semibold flex-shrink-0 min-w-[1.25rem]">{n.num}.</span>
              <span>{renderInline(n.text)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Regular paragraph — collect consecutive non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-•]\s/.test(lines[i].trim()) &&
      !/^\s*\d+[.)]\s/.test(lines[i].trim()) &&
      !/^#{1,4}\s/.test(lines[i].trim()) &&
      !/^\*\*(.+?)\*\*\s*:?\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={`p-${i - paraLines.length}`} className="text-sm text-gray-800 leading-relaxed">
          {paraLines.map((pl, pli) => (
            <span key={pli}>
              {pli > 0 && ' '}
              {renderInline(pl)}
            </span>
          ))}
        </p>
      )
    }
  }

  return <div className={`space-y-2 ${className}`}>{elements}</div>
}

/** Render inline formatting: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[2]}</strong>)
    } else if (match[4]) {
      parts.push(<em key={match.index} className="italic text-gray-700">{match[4]}</em>)
    } else if (match[6]) {
      parts.push(<code key={match.index} className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{match[6]}</code>)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length > 0 ? parts : text
}

// ---------------------------------------------------------------------------
// Day metadata
// ---------------------------------------------------------------------------

const dayMeta: Record<
  number,
  { title: string; description: string; intro: string; tasks: string[]; fields: FieldDef[] }
> = {
  1: {
    title: 'Problem Definition',
    description: 'Articulate the core problem hypothesis and identify the target customer segment.',
    intro: 'Rigorous validation begins with a precisely defined problem. What specific pain exists, who experiences it, and how are they coping today? Vague problem definitions lead to unfocused strategies and wasted resources.',
    tasks: [
      'Articulate a clear, specific problem statement',
      'Define the target customer profile',
      'Identify distinct, observable pain points',
      'Map existing solutions and workarounds',
    ],
    fields: [
      { name: 'problemStatement', label: 'Problem Statement', type: 'textarea', required: true },
      { name: 'targetCustomer', label: 'Target Customer', type: 'textarea', required: true },
      { name: 'painPoints', label: 'Pain Points (one per line)', type: 'textarea-list', required: true },
      { name: 'existingSolutions', label: 'Current Solutions & Workarounds', type: 'textarea', required: false },
    ],
  },
  2: {
    title: 'Market Research',
    description: 'Quantify the market opportunity and map the competitive landscape.',
    intro: 'A viable venture requires a quantifiable market. Size the opportunity with rigorous methodology, understand who the incumbents are and where they fall short, and identify the structural dynamics shaping this space.',
    tasks: [
      'Quantify market size (TAM/SAM/SOM)',
      'Map competitive landscape',
      'Analyse market trends and dynamics',
      'Identify structural opportunities',
    ],
    fields: [
      { name: 'marketSize', label: 'Market Sizing (TAM/SAM/SOM)', type: 'textarea', required: true },
      { name: 'competitors', label: 'Competitive Landscape (one per line)', type: 'textarea-list', required: true },
      { name: 'trends', label: 'Market Dynamics & Trends', type: 'textarea', required: true },
      { name: 'opportunities', label: 'Strategic Opportunities', type: 'textarea', required: false },
    ],
  },
  3: {
    title: 'Value Proposition',
    description: 'Define the differentiated value proposition and competitive positioning.',
    intro: 'Incremental improvement is not a strategy. What is the specific, defensible capability that creates disproportionate value for the customer? Without a clear answer, you are competing on execution alone — and execution advantages are temporary.',
    tasks: [
      'Craft the value proposition',
      'Define competitive differentiation',
      'Articulate key customer benefits',
      'Assess defensibility and moat potential',
    ],
    fields: [
      { name: 'valueProposition', label: 'Value Proposition', type: 'textarea', required: true },
      { name: 'differentiation', label: 'Competitive Differentiation', type: 'textarea', required: true },
      { name: 'keyBenefits', label: 'Core Customer Benefits (one per line)', type: 'textarea-list', required: true },
      { name: 'unfairAdvantage', label: 'Defensible Advantage', type: 'textarea', required: false },
    ],
  },
  4: {
    title: 'Customer Validation',
    description: 'Validate assumptions with market evidence and customer intelligence.',
    intro: 'Assumptions are risks until validated. Preliminary market intelligence has been conducted — analysing public forums, reviews, research papers, and competitive signals — to stress-test your thesis. Review the evidence below. Optionally, deploy the interview form to gather primary customer data and strengthen your validation.',
    tasks: [
      'Review market intelligence findings',
      'Select strategic messaging positioning',
      'Deploy interview form for primary research (optional)',
      'Assess market willingness to pay',
      'Evaluate pivot requirements',
    ],
    fields: [
      { name: 'interviewCount', label: 'Data Points Analysed (research sources + interviews)', type: 'number', required: true },
      { name: 'keyFindings', label: 'Key Intelligence Findings', type: 'textarea', required: true },
      { name: 'customerQuotes', label: 'Customer Insights (one per line)', type: 'textarea-list', required: false },
      { name: 'willingness', label: 'Willingness to Pay', type: 'select', required: true, options: ['not_willing', 'somewhat', 'very_willing', 'eager'] },
      { name: 'pivotNeeded', label: 'Pivot Required?', type: 'select', required: true, options: ['false', 'true'] },
      { name: 'pivotDetails', label: 'Pivot Rationale', type: 'textarea', required: false },
    ],
  },
  5: {
    title: 'Business Model',
    description: 'Architect the revenue model, pricing strategy, and unit economics.',
    intro: 'A compelling solution without a viable business model is a cost centre. Define how value is captured, not just delivered — who pays, at what price point, through what mechanism, and with what unit economics.',
    tasks: [
      'Select revenue model',
      'Define pricing strategy and positioning',
      'Map cost structure',
      'Model path to profitability',
    ],
    fields: [
      { name: 'revenueModel', label: 'Revenue Model', type: 'select', required: true, options: ['subscription', 'one_time', 'freemium', 'marketplace', 'advertising', 'other'] },
      { name: 'pricingStrategy', label: 'Pricing Strategy', type: 'textarea', required: true },
      { name: 'estimatedRevenue', label: 'Revenue Projection', type: 'text', required: false },
      { name: 'costStructure', label: 'Cost Structure', type: 'textarea', required: true },
      { name: 'breakEvenEstimate', label: 'Path to Profitability', type: 'text', required: false },
    ],
  },
  6: {
    title: 'Go-to-Market Strategy',
    description: 'Design the initial market entry plan and outreach strategy.',
    intro: 'Minimum viable means the smallest credible experiment that generates actionable data. Define the most efficient path to first customers and structure the outreach to maximise signal quality over volume.',
    tasks: [
      'Define core feature set',
      'Select technology approach',
      'Establish execution timeline',
      'Design market entry strategy',
    ],
    fields: [
      { name: 'coreFeatures', label: 'Core Feature Set (one per line)', type: 'textarea-list', required: true },
      { name: 'techStack', label: 'Technology Approach', type: 'text', required: false },
      { name: 'timeline', label: 'Execution Timeline', type: 'textarea', required: true },
      { name: 'resources', label: 'Resource Requirements', type: 'textarea', required: false },
      { name: 'launchStrategy', label: 'Market Entry Strategy', type: 'textarea', required: true },
    ],
  },
  7: {
    title: 'Strategic Recommendation',
    description: 'Comprehensive synthesis of all evidence into a definitive go/pivot/kill recommendation.',
    intro: 'This is the culmination of your validation process. Six phases of evidence — market intelligence, competitive analysis, customer validation, and financial modelling — will be synthesised into a definitive, data-driven strategic recommendation.',
    tasks: [
      'Review the strategic recommendation',
      'Examine the validation assessment',
      'Determine next steps',
    ],
    fields: [],
  },
  8: {
    title: 'Business Plan',
    description: 'Generate a comprehensive, Fortune 500-standard business plan based on all validated evidence.',
    intro: 'A rigorous business plan separates serious founders from dreamers. AI has generated a complete, investor-ready business plan from your validation data. Every section is pre-filled — review each one and refine to match your vision.',
    tasks: [
      'Review the AI-generated executive summary',
      'Validate market sizing and competitive analysis',
      'Refine financial projections and unit economics',
      'Finalise operational plan and milestones',
    ],
    fields: [
      { name: 'companyName', label: 'Company / Product Name', type: 'text', required: true },
      { name: 'missionStatement', label: 'Mission Statement', type: 'textarea', required: true },
      { name: 'visionStatement', label: 'Vision Statement', type: 'textarea', required: true },
      { name: 'elevatorPitch', label: 'Elevator Pitch (30 seconds)', type: 'textarea', required: true },
      { name: 'problemStatement', label: 'Problem Statement', type: 'textarea', required: true },
      { name: 'solutionOverview', label: 'Solution Overview', type: 'textarea', required: true },
      { name: 'targetMarket', label: 'Target Market & Customer Segments', type: 'textarea', required: true },
      { name: 'marketSize', label: 'Market Size (TAM / SAM / SOM)', type: 'textarea', required: true },
      { name: 'competitiveLandscape', label: 'Competitive Landscape', type: 'textarea', required: true },
      { name: 'uniqueValueProp', label: 'Unique Value Proposition', type: 'textarea', required: true },
      { name: 'revenueModel', label: 'Revenue Model & Pricing Strategy', type: 'textarea', required: true },
      { name: 'unitEconomics', label: 'Unit Economics (CAC, LTV, Margins)', type: 'textarea', required: true },
      { name: 'financialProjections', label: 'Financial Projections (3-Year)', type: 'textarea', required: true },
      { name: 'fundingRequirements', label: 'Funding Requirements & Use of Funds', type: 'textarea', required: false },
      { name: 'goToMarket', label: 'Go-to-Market Strategy', type: 'textarea', required: true },
      { name: 'salesStrategy', label: 'Sales & Distribution Strategy', type: 'textarea', required: true },
      { name: 'marketingPlan', label: 'Marketing Plan & Channels', type: 'textarea', required: true },
      { name: 'operationsPlan', label: 'Operations Plan', type: 'textarea', required: true },
      { name: 'technologyStack', label: 'Technology & Product Roadmap', type: 'textarea', required: true },
      { name: 'teamStructure', label: 'Team Structure & Key Hires', type: 'textarea', required: true },
      { name: 'milestones', label: 'Key Milestones (12-Month Roadmap)', type: 'textarea', required: true },
      { name: 'riskAnalysis', label: 'Risk Analysis & Mitigation', type: 'textarea', required: true },
      { name: 'legalCompliance', label: 'Legal & Regulatory Considerations', type: 'textarea', required: false },
      { name: 'exitStrategy', label: 'Exit Strategy', type: 'textarea', required: false },
      { name: 'kpis', label: 'Key Performance Indicators', type: 'textarea', required: true },
      { name: 'day8CoverImage', label: 'Cover Image', type: 'text', required: false },
      { name: 'day8CoverZoom', label: 'Cover Zoom', type: 'text', required: false },
      { name: 'day8CoverPosX', label: 'Cover Position X', type: 'text', required: false },
      { name: 'day8CoverPosY', label: 'Cover Position Y', type: 'text', required: false },
      { name: 'day8CoverTextX', label: 'Cover Text X', type: 'text', required: false },
      { name: 'day8CoverTextY', label: 'Cover Text Y', type: 'text', required: false },
      { name: 'day8CoverLabelX', label: 'Cover Label X', type: 'text', required: false },
      { name: 'day8CoverLabelY', label: 'Cover Label Y', type: 'text', required: false },
    ],
  },
  9: {
    title: 'Branding',
    description: 'AI-assisted brand identity design — colours, typography, tone, and visual direction.',
    intro: 'Your brand is how the world perceives your venture. AI has generated a complete brand identity system for you. Explore each section, interact with the colour studio, and refine anything you\'d like. Every element is pre-filled — just make it yours.',
    tasks: [
      'Review AI-generated brand personality and name',
      'Explore colour palettes in the Brand Colour Studio',
      'Refine brand voice, typography, and visual direction',
      'Finalise your brand identity system',
    ],
    fields: [
      { name: 'brandPersonality', label: 'Brand Personality', type: 'text', required: true },
      { name: 'targetEmotion', label: 'Target Emotion', type: 'text', required: true },
      { name: 'inspirationBrands', label: 'Inspiration Brands', type: 'textarea-list', required: false },
      { name: 'primaryColor', label: 'Primary Colour', type: 'text', required: false },
      { name: 'secondaryColor', label: 'Secondary Colour', type: 'text', required: false },
      { name: 'accentColor', label: 'Accent Colour', type: 'text', required: false },
      { name: 'highlightColor', label: 'Highlight Colour', type: 'text', required: false },
      { name: 'subtleColor', label: 'Subtle Colour', type: 'text', required: false },
    ],
  },
  10: {
    title: 'Web Design',
    description: 'Generate a professional landing page website to share your business with customers.',
    intro: 'Your validation journey is complete. Now it\'s time to launch. AI will generate a professional landing page with all the copy, images, and design tailored to your brand. Review each section, approve or regenerate, then share your business with the world.',
    tasks: [
      'Provide your business contact details and location',
      'Review and approve each landing page section',
      'Generate hero and feature images with AI',
      'Preview your complete landing page',
      'Share your business website',
    ],
    fields: [],
  },
  11: {
    title: 'Market Strategy',
    description: 'Define your market positioning, channels, and competitive strategy.',
    intro: 'A strong market strategy connects your validated idea to the right audience through the right channels. Define how you will position against competitors, which distribution channels to prioritise, and how to build sustainable market share.',
    tasks: [
      'Define competitive positioning strategy',
      'Identify priority distribution channels',
      'Plan customer acquisition funnel',
      'Set growth metrics and targets',
    ],
    fields: [
      { name: 'positioning', label: 'Competitive Positioning', type: 'textarea', required: true },
      { name: 'channels', label: 'Distribution Channels (one per line)', type: 'textarea-list', required: true },
      { name: 'acquisitionFunnel', label: 'Customer Acquisition Funnel', type: 'textarea', required: true },
      { name: 'growthTargets', label: 'Growth Metrics & Targets', type: 'textarea', required: false },
      { name: 'partnerships', label: 'Strategic Partnerships', type: 'textarea', required: false },
    ],
  },
  12: {
    title: 'Operation Flow',
    description: 'Design the customer journey and operational workflow for your business.',
    intro: 'Operations are the engine behind your product. Map the end-to-end customer journey, define internal workflows, and identify the tools and processes needed to deliver your value proposition consistently at scale.',
    tasks: [
      'Map the end-to-end customer journey',
      'Define operational workflows',
      'Identify tools and infrastructure needs',
      'Plan for scaling operations',
    ],
    fields: [
      { name: 'customerJourney', label: 'Customer Journey Map', type: 'textarea', required: true },
      { name: 'operationalWorkflow', label: 'Operational Workflows', type: 'textarea', required: true },
      { name: 'toolsInfrastructure', label: 'Tools & Infrastructure', type: 'textarea', required: true },
      { name: 'scalingPlan', label: 'Scaling Plan', type: 'textarea', required: false },
      { name: 'kpis', label: 'Operational KPIs', type: 'textarea', required: false },
    ],
  },
  13: {
    title: 'Graphics Design',
    description: 'Create logos, social media assets, and marketing graphics for your brand.',
    intro: 'Visual identity brings your brand to life. Generate logos, social media templates, marketing graphics, and other visual assets that align with your brand identity system. Every asset is AI-generated and ready to use.',
    tasks: [
      'Generate logo concepts',
      'Create social media templates',
      'Design marketing graphics',
      'Review and refine visual assets',
    ],
    fields: [
      { name: 'logoStyle', label: 'Logo Style Preference', type: 'select', required: true, options: ['minimal', 'bold', 'elegant', 'playful', 'corporate'] },
      { name: 'logoText', label: 'Logo Text / Brand Name', type: 'text', required: true },
      { name: 'socialPlatforms', label: 'Social Media Platforms (one per line)', type: 'textarea-list', required: false },
      { name: 'graphicsNotes', label: 'Design Notes & Preferences', type: 'textarea', required: false },
    ],
  },
  14: {
    title: 'Launch',
    description: 'Final launch checklist, deployment, and go-live preparation.',
    intro: 'This is it — launch day. Review your final checklist, ensure all deliverables are ready, and prepare your go-live sequence. Every previous phase has led to this moment. Execute with confidence.',
    tasks: [
      'Complete the pre-launch checklist',
      'Verify all deliverables are ready',
      'Set launch date and sequence',
      'Prepare launch communications',
    ],
    fields: [
      { name: 'launchDate', label: 'Target Launch Date', type: 'text', required: true },
      { name: 'checklist', label: 'Pre-Launch Checklist (one per line)', type: 'textarea-list', required: true },
      { name: 'launchSequence', label: 'Launch Day Sequence', type: 'textarea', required: true },
      { name: 'communications', label: 'Launch Communications Plan', type: 'textarea', required: false },
      { name: 'contingency', label: 'Contingency Plan', type: 'textarea', required: false },
    ],
  },
}

interface FieldDef {
  name: string
  label: string
  type: 'text' | 'textarea' | 'textarea-list' | 'textarea-json' | 'number' | 'select'
  required: boolean
  options?: string[]
}

interface DayState {
  locked: boolean
  completed: boolean
  inputs: Record<string, unknown> | null
  aiOutputs: Record<string, unknown> | null
  metrics: Array<{ metric_name: string; metric_value: number | null; notes: string | null }>
}

interface Day4Hook {
  type: 'pain' | 'outcome' | 'fear'
  text: string
}

const HOOK_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pain: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Pain' },
  outcome: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Outcome' },
  fear: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Fear' },
}

interface Day6LaunchPlan {
  launchChannels: string[]
  recommendedTouchCount: number
  outreachScriptDrafts: string[]
  outreachScripts?: string[]
}

// ---------------------------------------------------------------------------
// Convert getPrefillForDay() structured output → form-field string values.
// ---------------------------------------------------------------------------
function prefillToFormStrings(
  dayNumber: number,
  prefill: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {}

  switch (dayNumber) {
    case 1: {
      // Keys match day1Schema exactly: problemStatement, targetCustomer, painPoints, existingSolutions
      const ps = prefill.problemStatement as string | undefined
      if (ps) out.problemStatement = ps
      const tc = prefill.targetCustomer as string | undefined
      if (tc) out.targetCustomer = tc
      const painPoints = prefill.painPoints as string[] | undefined
      if (painPoints?.length) out.painPoints = painPoints.join('\n')
      const sol = prefill.existingSolutions as string | undefined
      if (sol) out.existingSolutions = sol
      break
    }

    case 2: {
      const competitors = prefill.competitors as string[] | undefined
      if (competitors?.length) {
        out.competitors = competitors.join('\n')
      }
      const ms = prefill.marketSize as string | undefined
      if (ms) out.marketSize = ms
      const tr = prefill.trends as string | undefined
      if (tr) out.trends = tr
      const opp = prefill.opportunities as string | undefined
      if (opp) out.opportunities = opp
      break
    }

    case 3: {
      const vp = prefill.valueProposition as string | undefined
      const co = prefill.coreOutcome as string | undefined
      if (vp) out.valueProposition = vp
      else if (co) out.valueProposition = co
      const diff = prefill.differentiation as string | undefined
      const mvp = prefill.mvpType as string | undefined
      if (diff) out.differentiation = diff
      else if (mvp) out.differentiation = `MVP approach: ${mvp}`
      const benefits = prefill.keyBenefits as string[] | undefined
      if (benefits?.length) out.keyBenefits = benefits.join('\n')
      const ua = prefill.unfairAdvantage as string | undefined
      if (ua) out.unfairAdvantage = ua
      break
    }

    // Day 4: auto-research findings + hooks fallback
    case 4: {
      // Use actual AI auto-research keyFindings if available
      const kf = prefill.keyFindings as string | undefined
      if (kf) {
        out.keyFindings = kf
      } else {
        // Fallback: format hooks as keyFindings
        const hooks = prefill.hooks as Array<{ type: string; text: string }> | undefined
        if (hooks?.length) {
          const lines = hooks.map((h) => `[${h.type.toUpperCase()}] ${h.text}`)
          out.keyFindings = `AI-suggested messaging hooks:\n${lines.join('\n')}`
        }
      }
      // Use AI-estimated willingness
      const we = prefill.willingnessEstimate as string | undefined
      out.willingness = we || 'somewhat'
      // Map customerInsights → customerQuotes
      const ci = prefill.customerInsights as string[] | undefined
      if (ci?.length) {
        out.customerQuotes = ci.join('\n')
      }
      // Use AI research sample size as the interview/data-point count
      const rss = prefill.researchSampleSize as number | undefined
      out.interviewCount = String(rss && rss > 0 ? rss : 0)
      out.pivotNeeded = 'false'
      break
    }

    case 5: {
      const rm = prefill.revenueModel as string | undefined
      if (rm) out.revenueModel = rm
      const ps = prefill.pricingStrategy as string | undefined
      if (ps) out.pricingStrategy = ps
      else {
        const platform = prefill.platformTarget as string | undefined
        if (platform) out.pricingStrategy = `Target platform: ${platform}`
        const tool = prefill.toolPreference as string | undefined
        if (tool && !out.pricingStrategy) out.pricingStrategy = `Build approach: ${tool}`
      }
      const cs = prefill.costStructure as string | undefined
      if (cs) out.costStructure = cs
      else {
        const budget = prefill.budgetRange as string | undefined
        if (budget) out.costStructure = `Estimated budget: ${budget}`
      }
      const hours = prefill.timeAvailabilityHours as number | undefined
      if (hours) out.breakEvenEstimate = `Available time: ${hours} hrs/week`
      break
    }

    // Day 6: handled by launch-mode UI — launchStrategy fallback for generic form
    case 6: {
      const count = prefill.outreachCount as number | undefined
      if (count) out.launchStrategy = `Target outreach: ${count} people`
      break
    }

    // Day 8: Business Plan — all fields are strings, map directly
    case 8: {
      const day8Fields = [
        'companyName', 'missionStatement', 'visionStatement', 'elevatorPitch',
        'problemStatement', 'solutionOverview', 'targetMarket', 'marketSize',
        'competitiveLandscape', 'uniqueValueProp', 'revenueModel', 'unitEconomics',
        'financialProjections', 'fundingRequirements', 'goToMarket', 'salesStrategy',
        'marketingPlan', 'operationsPlan', 'technologyStack', 'teamStructure',
        'milestones', 'riskAnalysis', 'legalCompliance', 'exitStrategy', 'kpis',
      ]
      for (const key of day8Fields) {
        const val = prefill[key] as string | undefined
        if (val) out[key] = val
      }
      // Also carry over cover image fields from prefill
      for (const imgKey of ['day8CoverImage', 'day8CoverZoom', 'day8CoverPosX', 'day8CoverPosY', 'day8CoverTextX', 'day8CoverTextY', 'day8CoverLabelX', 'day8CoverLabelY']) {
        const v = prefill[imgKey] as string | undefined
        if (v) out[imgKey] = v
      }
      break
    }

    // Day 9: Brand Identity — handled by gamified UI, map text fields
    case 9: {
      const day9Fields = [
        'brandName', 'brandStory', 'typography', 'brandVoice',
        'visualDirection', 'logoGuidelines', 'brandPersonalityProfile',
      ]
      for (const key of day9Fields) {
        const val = prefill[key] as string | undefined
        if (val) out[key] = val
      }
      break
    }

    // Day 10: Web Design — handled by section-approval UI
    case 10: {
      const day10Fields = [
        'heroHeadline', 'heroSubheadline', 'heroCtaText', 'heroImagePrompt',
        'problemSection', 'solutionSection', 'socialProofSection',
        'pricingSection', 'finalCtaHeadline', 'finalCtaSubheadline',
        'finalCtaButtonText', 'footerTagline', 'metaTitle', 'metaDescription',
      ]
      for (const key of day10Fields) {
        const val = prefill[key] as string | undefined
        if (val) out[key] = val
      }
      break
    }

    // Day 11: Market Strategy
    case 11: {
      for (const key of ['positioning', 'acquisitionFunnel', 'growthTargets', 'partnerships']) {
        const val = prefill[key] as string | undefined
        if (val) out[key] = val
      }
      const channels = prefill.channels as string[] | undefined
      if (channels?.length) out.channels = channels.join('\n')
      break
    }

    // Day 12: Operation Flow
    case 12: {
      for (const key of ['customerJourney', 'operationalWorkflow', 'toolsInfrastructure', 'scalingPlan', 'kpis']) {
        const val = prefill[key] as string | undefined
        if (val) out[key] = val
      }
      break
    }

    // Day 13: Graphics Design
    case 13: {
      const ls = prefill.logoStyle as string | undefined
      if (ls) out.logoStyle = ls
      const lt = prefill.logoText as string | undefined
      if (lt) out.logoText = lt
      const sp = prefill.socialPlatforms as string[] | undefined
      if (sp?.length) out.socialPlatforms = sp.join('\n')
      const gn = prefill.graphicsNotes as string | undefined
      if (gn) out.graphicsNotes = gn
      break
    }

    // Day 14: Launch
    case 14: {
      const ld = prefill.launchDate as string | undefined
      if (ld) out.launchDate = ld
      const cl = prefill.checklist as string[] | undefined
      if (cl?.length) out.checklist = cl.join('\n')
      for (const key of ['launchSequence', 'communications', 'contingency']) {
        const val = prefill[key] as string | undefined
        if (val) out[key] = val
      }
      break
    }
  }

  // Strip markdown asterisks from all prefilled values
  for (const key of Object.keys(out)) {
    out[key] = stripMd(out[key])
  }
  return out
}

// Strip markdown formatting from AI-generated text (bold, italic, headers, bullets)
function stripMd(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold-italic***
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold**
    .replace(/\*(.+?)\*/g, '$1')           // *italic*
    .replace(/__(.+?)__/g, '$1')            // __bold__
    .replace(/_(.+?)_/g, '$1')              // _italic_
    .replace(/^#{1,6}\s+/gm, '')            // # headings
    .replace(/`(.+?)`/g, '$1')              // `inline code`
}

// ---------------------------------------------------------------------------
// AI Analysis — design system
// ---------------------------------------------------------------------------

const DAY_THEMES: Record<number, { gradient: string; icon: string; label: string }> = {
  1: { gradient: 'from-rose-500 to-pink-600', icon: '🎯', label: 'Problem Definition' },
  2: { gradient: 'from-blue-500 to-cyan-600', icon: '📊', label: 'Market Research' },
  3: { gradient: 'from-emerald-500 to-teal-600', icon: '💎', label: 'Value Proposition' },
  4: { gradient: 'from-purple-500 to-violet-600', icon: '🔬', label: 'Customer Validation' },
  5: { gradient: 'from-amber-500 to-orange-600', icon: '💰', label: 'Business Model' },
  6: { gradient: 'from-indigo-500 to-blue-600', icon: '🚀', label: 'Go-to-Market Strategy' },
  7: { gradient: 'from-gray-700 to-gray-900', icon: '⚖️', label: 'Strategic Recommendation' },
  8: { gradient: 'from-sky-600 to-blue-800', icon: '📑', label: 'Business Plan' },
  9: { gradient: 'from-fuchsia-500 to-purple-700', icon: '🎨', label: 'Branding' },
  10: { gradient: 'from-slate-700 to-zinc-900', icon: '🌐', label: 'Web Design' },
  11: { gradient: 'from-pink-500 to-rose-700', icon: '📣', label: 'Market Strategy' },
  12: { gradient: 'from-teal-500 to-emerald-700', icon: '🔄', label: 'Operation Flow' },
  13: { gradient: 'from-violet-500 to-indigo-700', icon: '🖼️', label: 'Graphics Design' },
  14: { gradient: 'from-lime-500 to-green-700', icon: '🎯', label: 'Launch' },
}

const AI_FIELD_LABELS: Record<string, string> = {
  problemStatement: 'Problem Statement',
  targetCustomer: 'Target Customer Segment',
  painPoints: 'Pain Points',
  existingSolutions: 'Current Solutions & Workarounds',
  marketSize: 'Market Sizing (TAM/SAM/SOM)',
  competitors: 'Competitive Landscape',
  trends: 'Market Dynamics',
  opportunities: 'Strategic Opportunities',
  coreOutcome: 'Core Outcome',
  mvpType: 'MVP Approach',
  valueProposition: 'Value Proposition',
  differentiation: 'Competitive Differentiation',
  keyBenefits: 'Core Benefits',
  unfairAdvantage: 'Defensible Advantage',
  hooks: 'Strategic Messaging Hooks',
  recommendedHookType: 'Recommended Positioning',
  keyFindings: 'Market Intelligence Findings',
  customerInsights: 'Customer Insights',
  marketEvidence: 'Market Evidence',
  willingnessEstimate: 'Willingness to Pay',
  researchSampleSize: 'Data Points Analysed',
  interviewQuestions: 'Recommended Interview Questions',
  timeAvailabilityHours: 'Weekly Time Budget',
  toolPreference: 'Technology Approach',
  skillLevel: 'Required Skill Level',
  budgetRange: 'Budget Range',
  platformTarget: 'Target Platform',
  revenueModel: 'Revenue Model & Pricing',
  pricingStrategy: 'Pricing Strategy',
  costStructure: 'Cost Structure',
  launchChannels: 'Market Entry Channels',
  recommendedTouchCount: 'Outreach Target',
  outreachScripts: 'Outreach Communications',
  companyName: 'Company Name',
  missionStatement: 'Mission Statement',
  visionStatement: 'Vision Statement',
  elevatorPitch: 'Elevator Pitch',
  solutionOverview: 'Solution Overview',
  targetMarket: 'Target Market & Segments',
  competitiveLandscape: 'Competitive Landscape',
  uniqueValueProp: 'Unique Value Proposition',
  unitEconomics: 'Unit Economics',
  financialProjections: 'Financial Projections',
  fundingRequirements: 'Funding Requirements',
  goToMarket: 'Go-to-Market Strategy',
  salesStrategy: 'Sales & Distribution',
  marketingPlan: 'Marketing Plan',
  operationsPlan: 'Operations Plan',
  technologyStack: 'Technology & Product Roadmap',
  teamStructure: 'Team Structure',
  milestones: 'Key Milestones',
  riskAnalysis: 'Risk Analysis',
  legalCompliance: 'Legal & Regulatory',
  exitStrategy: 'Exit Strategy',
  kpis: 'Key Performance Indicators',
  executiveSummary: 'Executive Summary',
  growthStrategy: 'Growth Strategy',
  riskMitigation: 'Risk Mitigation',
  implementationTimeline: 'Implementation Timeline',
  brandName: 'Brand Name Direction',
  brandStory: 'Brand Story',
  colorPalette: 'Colour Palette',
  typography: 'Typography Recommendations',
  brandVoice: 'Brand Voice & Tone',
  visualDirection: 'Visual Direction',
  logoGuidelines: 'Logo Guidelines',
  brandPersonalityProfile: 'Brand Personality Profile',
}

function getAISuggestions(dayNumber: number, outputs: Record<string, unknown>): string[] {
  const suggestions: string[] = []
  switch (dayNumber) {
    case 1: {
      const pp = outputs.painPoints as string[] | undefined
      if (pp && pp.length < 4)
        suggestions.push('Consider identifying more pain points — the strongest ideas tackle multiple, interconnected frustrations.')
      if (!outputs.existingSolutions)
        suggestions.push('Research existing solutions thoroughly. Understanding alternatives sharpens your positioning.')
      suggestions.push('Proceeding to Market Research: quantify the opportunity and map the competitive landscape for the problem defined above.')
      break
    }
    case 2: {
      const comp = outputs.competitors as string[] | undefined
      if (comp && comp.length > 5)
        suggestions.push('High competitive density detected — differentiation will be critical. Focus on positioning against incumbent weaknesses.')
      if (outputs.opportunities)
        suggestions.push('Leverage the identified market gaps to inform your Value Proposition in the next phase.')
      suggestions.push('Next phase: translate these market insights into a differentiated Value Proposition that addresses the structural gaps identified.')
      break
    }
    case 3: {
      const mvp = outputs.mvpType as string | undefined
      if (mvp)
        suggestions.push(`Recommended approach: ${mvp === 'manual' ? 'manual/concierge' : mvp === 'nocode' ? 'no-code' : 'lightweight'} — the fastest path to validating the core assumption with minimal capital expenditure.`)
      if (outputs.unfairAdvantage)
        suggestions.push('The identified competitive advantage should be central to your positioning and messaging strategy.')
      suggestions.push('Next phase: market intelligence will be conducted — analysing public data, forums, reviews, and competitive signals — to validate your positioning with real market evidence.')
      break
    }
    case 4: {
      const w = outputs.willingnessEstimate as string | undefined
      const s = outputs.researchSampleSize as number | undefined
      if (w === 'not_willing')
        suggestions.push('Low willingness-to-pay signal detected. Consider repositioning the offering or pivoting the target segment before proceeding.')
      else if (w === 'eager')
        suggestions.push('Strong demand signals confirmed. Market readiness is high — prioritise speed to market before competitive response.')
      if (s && s < 50)
        suggestions.push('Limited data sample. Deploy the interview form to additional prospects to strengthen statistical confidence.')
      suggestions.push('Next phase: convert validated demand into a sustainable business model — revenue architecture, pricing, and unit economics.')
      break
    }
    case 5: {
      if (outputs.revenueModel)
        suggestions.push(`Validate the ${String(outputs.revenueModel)} model through structured pricing conversations with 3–5 qualified prospects before market entry.`)
      suggestions.push('Maintain capital discipline. Allocate resources exclusively to capabilities that deliver core customer value.')
      suggestions.push('Next phase: design the go-to-market strategy and define the minimum viable experiment to prove the model.')
      break
    }
    case 6: {
      const tc = outputs.recommendedTouchCount as number | undefined
      if (tc)
        suggestions.push(`Target outreach: ${tc} qualified prospects in the initial market entry phase. Track conversion rates and response quality systematically.`)
      const os = outputs.outreachScripts as string[] | undefined
      if (os?.length)
        suggestions.push('Personalise each outreach communication for the recipient. Tailored messaging achieves 3x higher engagement rates.')
      suggestions.push('Final phase: all evidence from six phases will be synthesised into a definitive strategic recommendation.')
      break
    }
    case 7: {
      suggestions.push('Your validation is complete. Next: generate a comprehensive business plan to turn this evidence into an actionable roadmap.')
      break
    }
    case 8: {
      suggestions.push('Your business plan is ready. Share it with advisors, investors, or co-founders for feedback before execution.')
      suggestions.push('Next: establish your brand identity — the visual and emotional foundation of your venture.')
      break
    }
    case 9: {
      suggestions.push('Use the colour wheel below to explore palettes. Each colour communicates specific emotions and associations to your target audience.')
      suggestions.push('Your brand identity is the foundation of all marketing. Consistency across touchpoints builds trust and recognition.')
      break
    }
  }
  return suggestions
}

// ---------------------------------------------------------------------------
// Color Wheel Gamification Component — Stanford Design-School Style
// ---------------------------------------------------------------------------

const COLOR_FAMILIES: { name: string; colors: { name: string; hex: string; meaning: string; brands: string; emotion: string }[] }[] = [
  {
    name: 'Reds',
    colors: [
      { name: 'Crimson', hex: '#DC2626', meaning: 'Power, passion, urgency', brands: 'Netflix, CNN, Target', emotion: 'Action & Desire' },
      { name: 'Coral', hex: '#F87171', meaning: 'Friendly energy, warmth', brands: 'Airbnb, Figma', emotion: 'Approachable Boldness' },
      { name: 'Rose', hex: '#FB7185', meaning: 'Romance, gentleness, care', brands: 'Victoria\'s Secret, Glossier', emotion: 'Tenderness' },
      { name: 'Burgundy', hex: '#991B1B', meaning: 'Sophistication, richness, depth', brands: 'Harvard, Cartier', emotion: 'Refined Power' },
    ],
  },
  {
    name: 'Oranges',
    colors: [
      { name: 'Tangerine', hex: '#EA580C', meaning: 'Enthusiasm, creativity, fun', brands: 'Fanta, Nickelodeon', emotion: 'Energy & Joy' },
      { name: 'Amber', hex: '#D97706', meaning: 'Warmth, confidence, resourcefulness', brands: 'Amazon, Chewy', emotion: 'Trust & Warmth' },
      { name: 'Peach', hex: '#FDBA74', meaning: 'Friendliness, youth, approachability', brands: 'Peach, Instagram (accent)', emotion: 'Soft Energy' },
      { name: 'Burnt Sienna', hex: '#C2410C', meaning: 'Earthy, reliable, craftmanship', brands: 'Etsy, Masterclass', emotion: 'Authenticity' },
    ],
  },
  {
    name: 'Yellows',
    colors: [
      { name: 'Sunflower', hex: '#EAB308', meaning: 'Optimism, clarity, intelligence', brands: 'McDonald\'s, IKEA, CAT', emotion: 'Happiness & Confidence' },
      { name: 'Gold', hex: '#CA8A04', meaning: 'Premium, success, prestige', brands: 'Rolex, Versace, MGM', emotion: 'Luxury & Achievement' },
      { name: 'Lemon', hex: '#FDE047', meaning: 'Freshness, playfulness, energy', brands: 'Snapchat, Best Buy', emotion: 'Youthful Optimism' },
      { name: 'Marigold', hex: '#B45309', meaning: 'Heritage, reliability, tradition', brands: 'UPS, Timberland', emotion: 'Dependable Warmth' },
    ],
  },
  {
    name: 'Greens',
    colors: [
      { name: 'Emerald', hex: '#059669', meaning: 'Growth, prosperity, nature', brands: 'Starbucks, Whole Foods', emotion: 'Balance & Renewal' },
      { name: 'Lime', hex: '#84CC16', meaning: 'Innovation, freshness, vitality', brands: 'Android, Spotify, Xbox', emotion: 'Progress & Energy' },
      { name: 'Forest', hex: '#166534', meaning: 'Stability, wealth, prestige', brands: 'Land Rover, Lacoste', emotion: 'Trust & Heritage' },
      { name: 'Mint', hex: '#6EE7B7', meaning: 'Calm, clean, health', brands: 'Robinhood, Mint', emotion: 'Freshness & Clarity' },
      { name: 'Sage', hex: '#86EFAC', meaning: 'Serenity, wellness, natural', brands: 'Aesop, The Body Shop', emotion: 'Peaceful Growth' },
    ],
  },
  {
    name: 'Blues',
    colors: [
      { name: 'Royal Blue', hex: '#2563EB', meaning: 'Trust, authority, intelligence', brands: 'Facebook, Samsung, Visa', emotion: 'Security & Reliability' },
      { name: 'Sky', hex: '#0EA5E9', meaning: 'Freedom, openness, clarity', brands: 'Skype, Twitter, Zoom', emotion: 'Openness & Calm' },
      { name: 'Navy', hex: '#1E3A5F', meaning: 'Authority, professionalism, depth', brands: 'IBM, Goldman Sachs, Ford', emotion: 'Prestige & Trust' },
      { name: 'Cobalt', hex: '#1D4ED8', meaning: 'Innovation, precision, technology', brands: 'Intel, GE, Boeing', emotion: 'Technical Mastery' },
      { name: 'Cerulean', hex: '#0284C7', meaning: 'Inspiration, reliability, progress', brands: 'LinkedIn, Dell, HP', emotion: 'Professional Trust' },
    ],
  },
  {
    name: 'Purples',
    colors: [
      { name: 'Violet', hex: '#7C3AED', meaning: 'Creativity, wisdom, luxury', brands: 'Cadbury, Twitch, Roku', emotion: 'Imagination & Ambition' },
      { name: 'Indigo', hex: '#4F46E5', meaning: 'Depth, intuition, technology', brands: 'Discord, Notion, Figma', emotion: 'Wisdom & Innovation' },
      { name: 'Lavender', hex: '#A78BFA', meaning: 'Grace, elegance, tranquility', brands: 'Hallmark, Aussie', emotion: 'Calm & Refinement' },
      { name: 'Plum', hex: '#581C87', meaning: 'Richness, exclusivity, mystery', brands: 'Wonka, Premier League', emotion: 'Opulence & Depth' },
    ],
  },
  {
    name: 'Pinks',
    colors: [
      { name: 'Hot Pink', hex: '#EC4899', meaning: 'Bold, youthful, energetic', brands: 'T-Mobile, Lyft, Dribbble', emotion: 'Innovation & Play' },
      { name: 'Fuchsia', hex: '#C026D3', meaning: 'Creative, unconventional, striking', brands: 'Cosmopolitan, Flickr', emotion: 'Creative Energy' },
      { name: 'Blush', hex: '#FDA4AF', meaning: 'Gentle, romantic, compassionate', brands: 'Glossier, Benefit', emotion: 'Warmth & Care' },
      { name: 'Magenta', hex: '#DB2777', meaning: 'Passion, transformation, impact', brands: 'Barbie, LG', emotion: 'Bold Individuality' },
    ],
  },
  {
    name: 'Neutrals',
    colors: [
      { name: 'Slate', hex: '#475569', meaning: 'Sophistication, neutrality, premium', brands: 'Apple, Mercedes, Uber', emotion: 'Modern & Minimal' },
      { name: 'Charcoal', hex: '#1F2937', meaning: 'Authority, elegance, power', brands: 'Nike, Chanel, Prada', emotion: 'Prestige & Power' },
      { name: 'Stone', hex: '#78716C', meaning: 'Reliability, warmth, craftsmanship', brands: 'Burberry, Muji', emotion: 'Sophisticated Calm' },
      { name: 'Ivory', hex: '#FFFBEB', meaning: 'Purity, simplicity, premium', brands: 'Apple, Aesop, Byredo', emotion: 'Clean Luxury' },
      { name: 'Graphite', hex: '#374151', meaning: 'Professional, strong, timeless', brands: 'SpaceX, Tesla, Dyson', emotion: 'Technical Authority' },
    ],
  },
]

const ALL_COLORS = COLOR_FAMILIES.flatMap(f => f.colors)

function ColorWheelPicker({ onColorSelect, selectedColors, onRemoveColor }: { onColorSelect: (hex: string, name: string) => void; selectedColors: string[]; onRemoveColor: (index: number) => void }) {
  const [activeFamily, setActiveFamily] = useState(0)
  const [hoveredColor, setHoveredColor] = useState<typeof ALL_COLORS[0] | null>(null)
  const [selectedInfo, setSelectedInfo] = useState<typeof ALL_COLORS[0] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [wheelRotation, setWheelRotation] = useState(0)

  const info = selectedInfo || hoveredColor
  const slotLabels = ['Primary', 'Secondary', 'Accent', 'Highlight', 'Subtle']
  const slotIcons = ['◉', '◎', '✦', '✧', '○']

  // Spin the wheel for fun
  const handleSpin = () => {
    setSpinning(true)
    const randomRotation = wheelRotation + 720 + Math.random() * 720
    setWheelRotation(randomRotation)
    const randomFamily = Math.floor(Math.random() * COLOR_FAMILIES.length)
    setTimeout(() => {
      setActiveFamily(randomFamily)
      setSpinning(false)
    }, 1500)
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-black px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span className="text-lg">🎨</span> Brand Colour Studio
            </h3>
            <p className="text-white/70 text-xs mt-0.5">Select up to 5 colours to build your brand palette</p>
          </div>
          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className={`inline-block transition-transform duration-1000 ${spinning ? 'animate-spin' : ''}`}>🎡</span>
            {spinning ? 'Spinning...' : 'Surprise Me'}
          </button>
        </div>
      </div>

      <div className="p-5 bg-gradient-to-br from-gray-50 to-white space-y-5">
        {/* Colour Family Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {COLOR_FAMILIES.map((family, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveFamily(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeFamily === i
                  ? 'bg-gray-900 text-white shadow-md scale-105'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:shadow-sm'
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: family.colors[0].hex }} />
              {family.name}
            </button>
          ))}
        </div>

        {/* Colour Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {COLOR_FAMILIES[activeFamily].colors.map((color) => {
            const isSelected = selectedColors.includes(color.hex)
            const selectedIndex = selectedColors.indexOf(color.hex)

            return (
              <button
                key={color.hex}
                type="button"
                className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                  isSelected
                    ? 'border-gray-900 ring-2 ring-offset-2 ring-purple-400 scale-105 shadow-md'
                    : 'border-transparent hover:border-gray-300'
                }`}
                onMouseEnter={() => setHoveredColor(color)}
                onMouseLeave={() => setHoveredColor(null)}
                onClick={() => {
                  setSelectedInfo(color)
                  if (isSelected) {
                    onRemoveColor(selectedIndex)
                  } else if (selectedColors.length < 5) {
                    onColorSelect(color.hex, color.name)
                  }
                }}
              >
                <div className="h-16 w-full relative" style={{ backgroundColor: color.hex }}>
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="text-white font-bold text-sm bg-black/40 w-6 h-6 rounded-full flex items-center justify-center">
                        {selectedIndex + 1}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="bg-white p-2 text-center">
                  <p className="text-[11px] font-semibold text-gray-900 truncate">{color.name}</p>
                  <p className="text-[9px] text-gray-400 font-mono">{color.hex}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Colour Psychology Card */}
        {info && (
          <div
            className="rounded-xl border overflow-hidden transition-all duration-300 shadow-sm"
            style={{ borderColor: info.hex + '60' }}
          >
            <div className="h-2 w-full" style={{ backgroundColor: info.hex }} />
            <div className="p-4 bg-white">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl shadow-md flex-shrink-0" style={{ backgroundColor: info.hex }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900 text-sm">{info.name}</p>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{info.hex}</span>
                  </div>
                  <p className="text-xs text-purple-600 font-semibold mb-1">{info.emotion}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{info.meaning}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    <span className="font-semibold text-gray-500">Used by:</span> {info.brands}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Palette Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯</span> Your Brand Palette
            </p>
            <p className="text-[10px] text-gray-400">{selectedColors.length}/5 selected</p>
          </div>
          <div className="flex gap-2">
            {slotLabels.map((label, i) => {
              const filled = !!selectedColors[i]
              return (
                <div key={i} className="flex-1 text-center group">
                  <div
                    className={`h-14 rounded-xl border-2 transition-all relative ${
                      filled
                        ? 'border-gray-300 shadow-sm cursor-pointer hover:shadow-md'
                        : 'border-dashed border-gray-300 bg-gray-50'
                    }`}
                    style={{ backgroundColor: selectedColors[i] || 'transparent' }}
                    onClick={() => filled && onRemoveColor(i)}
                  >
                    {!filled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-300 text-lg">{slotIcons[i]}</span>
                      </div>
                    )}
                    {filled && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-[10px]">
                        <span className="text-white text-xs font-bold">✕</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1.5 font-semibold">{label}</p>
                  {filled && (
                    <p className="text-[9px] text-gray-400 font-mono">{selectedColors[i]}</p>
                  )}
                </div>
              )
            })}
          </div>
          {/* Palette Preview Bar */}
          {selectedColors.length >= 2 && (
            <div className="mt-3 h-8 rounded-lg overflow-hidden flex shadow-inner border border-gray-200">
              {selectedColors.map((c, i) => (
                <div key={i} className="flex-1 transition-all" style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AIAnalysisSection({ dayNumber, outputs, onRegenerate, isRegenerating, isCompleted, ideaId, fetchState }: { dayNumber: number; outputs: Record<string, unknown>; onRegenerate?: () => void; isRegenerating?: boolean; isCompleted?: boolean; ideaId?: string; fetchState?: () => void }) {
  const [open, setOpen] = useState(false)
  const theme = DAY_THEMES[dayNumber] ?? DAY_THEMES[1]
  const suggestions = getAISuggestions(dayNumber, outputs)

  // Day 8 specific state
  const [day8RegenKey, setDay8RegenKey] = useState<string | null>(null)
  const [day8HeroImage, setDay8HeroImage] = useState<string>('')
  const [day8AssetOpen, setDay8AssetOpen] = useState(false)
  const [day8AssetSection, setDay8AssetSection] = useState('')

  const handleDay8Regen = async (sectionKey: string) => {
    if (!ideaId) return
    setDay8RegenKey(sectionKey)
    try {
      const res = await fetch(`/api/idea/${ideaId}/regen-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, currentContent: outputs[sectionKey], dayNumber: 8 }),
      })
      if (res.ok) {
        fetchState?.()
      }
    } catch { /* ignore */ } finally { setDay8RegenKey(null) }
  }

  const handleDay8AssetSelect = (url: string) => {
    setDay8HeroImage(url)
    if (ideaId) {
      try { fetch(`/api/idea/${ideaId}/save-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, section: day8AssetSection }) }).catch(() => {}) } catch {}
    }
  }

  // ---- Sub-components ----
  const TextCard = ({ label, value, borderColor = 'border-gray-300' }: { label: string; value: string; borderColor?: string }) => (
    <div className={`border-l-4 ${borderColor} bg-gray-50 rounded-r-lg p-4`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
      <FormattedText text={value} />
    </div>
  )

  const ListItems = ({ label, items, icon = '→', iconColor = 'text-gray-400' }: { label: string; items: string[]; icon?: string; iconColor?: string }) => (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-gray-700">
            <span className={`${iconColor} flex-shrink-0 mt-0.5`}>{icon}</span>
            <span className="leading-relaxed">{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  const StatCard = ({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) => (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )

  const Badge = ({ label, variant = 'default' }: { label: string; variant?: 'default' | 'green' | 'amber' | 'red' | 'blue' | 'purple' }) => {
    const styles = {
      default: 'bg-gray-100 text-gray-700',
      green: 'bg-green-100 text-green-700',
      amber: 'bg-amber-100 text-amber-700',
      red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700',
    }
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[variant]}`}>{label}</span>
  }

  // ---- Day-specific content ----
  function renderDayContent() {
    switch (dayNumber) {
      // ===== Day 1: Problem Definition =====
      case 1: {
        const ps = outputs.problemStatement as string | undefined
        const tc = outputs.targetCustomer as string | undefined
        const pp = outputs.painPoints as string[] | undefined
        const es = outputs.existingSolutions as string | undefined
        return (
          <div className="space-y-4">
            {ps && <TextCard label="Problem Statement" value={ps} borderColor="border-rose-400" />}
            {tc && <TextCard label="Target Customer" value={tc} borderColor="border-blue-400" />}
            {pp?.length && <ListItems label="Pain Points" items={pp} icon="🔴" iconColor="text-red-400" />}
            {es && <TextCard label="Existing Solutions" value={es} borderColor="border-gray-400" />}
          </div>
        )
      }

      // ===== Day 2: Market Research =====
      case 2: {
        const ms = outputs.marketSize as string | undefined
        const comp = outputs.competitors as string[] | undefined
        const tr = outputs.trends as string | undefined
        const opp = outputs.opportunities as string | undefined
        return (
          <div className="space-y-4">
            {ms && <TextCard label="Market Size (TAM / SAM / SOM)" value={ms} borderColor="border-blue-400" />}
            {comp?.length && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Competitors</p>
                <div className="flex flex-wrap gap-2">
                  {comp.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                      <span className="text-xs">⚔️</span> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tr && <TextCard label="Market Trends" value={tr} borderColor="border-amber-400" />}
            {opp && <TextCard label="Opportunities" value={opp} borderColor="border-green-400" />}
          </div>
        )
      }

      // ===== Day 3: Value Proposition =====
      case 3: {
        const co = outputs.coreOutcome as string | undefined
        const mvp = outputs.mvpType as string | undefined
        const vp = outputs.valueProposition as string | undefined
        const diff = outputs.differentiation as string | undefined
        const kb = outputs.keyBenefits as string[] | undefined
        const ua = outputs.unfairAdvantage as string | undefined
        return (
          <div className="space-y-4">
            {co && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Core Outcome</p>
                <p className="text-base font-semibold text-emerald-900">{stripMd(co)}</p>
              </div>
            )}
            {mvp && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">MVP Approach:</span>
                <Badge label={mvp === 'manual' ? '🛠 Manual / Concierge' : mvp === 'nocode' ? '⚡ No-Code' : '💻 Lightweight Code'} variant="blue" />
              </div>
            )}
            {vp && <TextCard label="Value Proposition" value={vp} borderColor="border-emerald-400" />}
            {diff && <TextCard label="Differentiation" value={diff} borderColor="border-teal-400" />}
            {kb?.length && <ListItems label="Key Benefits" items={kb} icon="✓" iconColor="text-emerald-500" />}
            {ua && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Unfair Advantage</p>
                <p className="text-sm text-amber-900 leading-relaxed">{stripMd(ua)}</p>
              </div>
            )}
          </div>
        )
      }

      // ===== Day 4: Customer Validation =====
      case 4: {
        const kf = outputs.keyFindings as string | undefined
        const hooks = outputs.hooks as Array<{ type: string; text: string }> | undefined
        const rht = outputs.recommendedHookType as string | undefined
        const ci = outputs.customerInsights as string[] | undefined
        const me = outputs.marketEvidence as string[] | undefined
        const we = outputs.willingnessEstimate as string | undefined
        const rss = outputs.researchSampleSize as number | undefined
        const iq = outputs.interviewQuestions as string[] | undefined

        const willingnessConfig: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'default' }> = {
          not_willing: { label: '❌ Not Willing', variant: 'red' },
          somewhat: { label: '🤔 Somewhat Willing', variant: 'amber' },
          very_willing: { label: '✅ Very Willing', variant: 'green' },
          eager: { label: '🔥 Eager to Pay', variant: 'green' },
        }
        const wc = we ? willingnessConfig[we] : null

        return (
          <div className="space-y-5">
            {/* Stats row */}
            {(rss || we) && (
              <div className="grid grid-cols-2 gap-3">
                {rss != null && <StatCard label="Data Points Analysed" value={rss} subtitle="forums, reviews, reports" />}
                {wc && (
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Willingness to Pay</p>
                    <div className="mt-2"><Badge label={wc.label} variant={wc.variant} /></div>
                  </div>
                )}
              </div>
            )}
            {kf && <TextCard label="Key Research Findings" value={kf} borderColor="border-purple-400" />}

            {/* Hooks */}
            {hooks?.length && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Messaging Hooks</p>
                  {rht && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Best: {rht}</span>}
                </div>
                <div className="space-y-2">
                  {hooks.map((hook, i) => {
                    const hookStyles: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
                      pain: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100', badgeText: 'text-red-700' },
                      outcome: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100', badgeText: 'text-green-700' },
                      fear: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100', badgeText: 'text-amber-700' },
                    }
                    const hs = hookStyles[hook.type] ?? { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100', badgeText: 'text-gray-700' }
                    const isRecommended = hook.type === rht
                    return (
                      <div key={i} className={`${hs.bg} border ${hs.border} rounded-lg p-3.5 ${isRecommended ? 'ring-2 ring-purple-300 ring-offset-1' : ''}`}>
                        <div className="flex items-start gap-2.5">
                          <span className={`inline-block text-xs font-bold uppercase px-2 py-0.5 rounded ${hs.badge} ${hs.badgeText} flex-shrink-0 mt-0.5`}>
                            {hook.type}
                          </span>
                          <p className="text-sm text-gray-800 leading-relaxed">{stripMd(hook.text)}</p>
                        </div>
                        {isRecommended && <p className="text-xs text-purple-600 font-medium mt-2 ml-0.5">⭐ Recommended — lead with this hook</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {ci?.length && <ListItems label="Customer Insights" items={ci} icon="💡" iconColor="text-purple-400" />}
            {me?.length && <ListItems label="Market Evidence" items={me} icon="📎" iconColor="text-blue-400" />}

            {iq?.length && (
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-2">Interview Questions</p>
                <ol className="space-y-2">
                  {iq.map((q, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-violet-900">
                      <span className="text-violet-400 font-bold flex-shrink-0 w-5 text-right">{i + 1}.</span>
                      <span className="leading-relaxed">{stripMd(q)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )
      }

      // ===== Day 5: Business Model =====
      case 5: {
        const rm = outputs.revenueModel as string | undefined
        const ps = outputs.pricingStrategy as string | undefined
        const cs = outputs.costStructure as string | undefined
        const hours = outputs.timeAvailabilityHours as number | undefined
        const tool = outputs.toolPreference as string | undefined
        const skill = outputs.skillLevel as string | undefined
        const budget = outputs.budgetRange as string | undefined
        const platform = outputs.platformTarget as string | undefined

        const toolLabels: Record<string, string> = { manual: '🛠 Manual', nocode: '⚡ No-Code', code: '💻 Code' }
        const skillLabels: Record<string, string> = { beginner: '🟢 Beginner', intermediate: '🟡 Intermediate', advanced: '🔴 Advanced' }
        const platformLabels: Record<string, string> = { web: '🌐 Web', mobile: '📱 Mobile', both: '🌐📱 Both' }

        return (
          <div className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {hours != null && <StatCard label="Hours / Week" value={hours} />}
              {budget && <StatCard label="Budget" value={`£${budget}`} />}
              {tool && (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Build</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{toolLabels[tool] ?? tool}</p>
                </div>
              )}
              {platform && (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{platformLabels[platform] ?? platform}</p>
                </div>
              )}
            </div>
            {skill && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skill Level:</span>
                <Badge label={skillLabels[skill] ?? skill} variant="default" />
              </div>
            )}
            {rm && <TextCard label="Revenue Model" value={rm} borderColor="border-amber-400" />}
            {ps && <TextCard label="Pricing Strategy" value={ps} borderColor="border-green-400" />}
            {cs && <TextCard label="Cost Structure" value={cs} borderColor="border-red-400" />}
          </div>
        )
      }

      // ===== Day 6: Launch Planning =====
      case 6: {
        const channels = outputs.launchChannels as string[] | undefined
        const tc = outputs.recommendedTouchCount as number | undefined
        const scripts = outputs.outreachScripts as string[] | undefined

        const channelConfig: Record<string, { icon: string; bg: string; text: string }> = {
          community: { icon: '👥', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
          cold_outreach: { icon: '📧', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
          ads: { icon: '📢', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
          partners: { icon: '🤝', bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
        }

        return (
          <div className="space-y-4">
            {tc != null && <StatCard label="Outreach Target" value={tc} subtitle="people to contact" />}
            {channels?.length && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Launch Channels</p>
                <div className="flex flex-wrap gap-2">
                  {channels.map((ch, i) => {
                    const cc = channelConfig[ch] ?? { icon: '📌', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' }
                    return (
                      <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${cc.bg} ${cc.text}`}>
                        <span>{cc.icon}</span>
                        {ch.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            {scripts?.length && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Outreach Scripts</p>
                <div className="space-y-3">
                  {scripts.map((script, i) => (
                    <div key={i} className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Script {i + 1}</span>
                      </div>
                      <FormattedText text={script} className="text-indigo-900" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      // ===== Day 8: Business Plan — Editorial Landing Page =====
      case 8: {
        const companyName = outputs.companyName ? String(outputs.companyName) : 'Business Plan'

        // Editorial styling constants
        const ed = {
          accent: '#c9a96e',
          primary: '#1a1a2e',
          muted: '#6b7280',
          light: '#f9f8f6',
          serif: 'Georgia, "Times New Roman", serif',
        }

        // ---- Helper: extract numbers from text ----
        const extractNumbers = (text: string): { label: string; value: number; unit: string }[] => {
          const results: { label: string; value: number; unit: string }[] = []
          const patterns = [
            /(?:TAM|Total Addressable Market)[:\s]*[£$]?([\d,.]+)\s*(billion|million|B|M|bn|mn|K|k)/gi,
            /(?:SAM|Serviceable Addressable Market)[:\s]*[£$]?([\d,.]+)\s*(billion|million|B|M|bn|mn|K|k)/gi,
            /(?:SOM|Serviceable Obtainable Market)[:\s]*[£$]?([\d,.]+)\s*(billion|million|B|M|bn|mn|K|k)/gi,
            /(?:CAC|Customer Acquisition Cost)[:\s]*[£$]?([\d,.]+)/gi,
            /(?:LTV|Lifetime Value|CLV)[:\s]*[£$]?([\d,.]+)/gi,
            /(?:ARPU)[:\s]*[£$]?([\d,.]+)/gi,
            /(?:MRR|Monthly Recurring Revenue)[:\s]*[£$]?([\d,.]+)/gi,
            /(?:ARR|Annual Recurring Revenue)[:\s]*[£$]?([\d,.]+)/gi,
            /(?:Gross Margin|Margin)[:\s]*([\d,.]+)%/gi,
          ]
          const labels = ['TAM', 'SAM', 'SOM', 'CAC', 'LTV', 'ARPU', 'MRR', 'ARR', 'Margin']
          patterns.forEach((p, idx) => {
            const m = p.exec(text)
            if (m) {
              const raw = parseFloat(m[1].replace(/,/g, ''))
              const unit = m[2] || (labels[idx] === 'Margin' ? '%' : '')
              results.push({ label: labels[idx], value: raw, unit: unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase() })
            }
          })
          return results
        }

        // ---- Helper: Parse table-like content ----
        const parseTableRows = (text: string): string[][] => {
          const lines = text.split('\n').filter(l => l.trim())
          const rows: string[][] = []
          for (const line of lines) {
            if (line.includes('|')) {
              const cells = line.split('|').map(c => c.trim()).filter(Boolean)
              if (cells.length >= 2 && !cells.every(c => /^[-:]+$/.test(c))) rows.push(cells)
            } else if (line.includes('\t')) {
              const cells = line.split('\t').map(c => c.trim()).filter(Boolean)
              if (cells.length >= 2) rows.push(cells)
            }
          }
          return rows
        }

        // ---- Helper: Render regenerate button ----
        const RegenBtn = ({ sectionKey }: { sectionKey: string }) => (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDay8Regen(sectionKey) }}
            disabled={day8RegenKey === sectionKey}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{ color: ed.accent, backgroundColor: `${ed.accent}10`, border: `1px solid ${ed.accent}25` }}
            title="Regenerate this section"
          >
            {day8RegenKey === sectionKey ? (
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            )}
            {day8RegenKey === sectionKey ? 'Regenerating…' : 'Regenerate'}
          </button>
        )

        // ---- Helper: Render formatted text with tables ----
        const BPText = ({ text, sectionKey }: { text: string; sectionKey?: string }) => {
          const tableRows = parseTableRows(text)

          // If text has table-like content, render both text and table
          if (tableRows.length > 1) {
            const nonTableText = text.split('\n')
              .filter(l => !l.includes('|') && !l.includes('\t') || l.trim() === '')
              .join('\n').trim()

            return (
              <div>
                {nonTableText && <FormattedText text={nonTableText} />}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                        {tableRows[0].map((h, i) => (
                          <th key={i} className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.slice(1).map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="py-3 px-4 text-sm" style={{ color: ci === 0 ? ed.primary : ed.muted, fontWeight: ci === 0 ? 500 : 400 }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }

          return <FormattedText text={text} />
        }

        // ---- Section definitions with categories ----
        type BPCategory = 'vision' | 'market' | 'product' | 'finance' | 'strategy' | 'operations' | 'risk'
        interface BPSection { key: string; icon: string; label: string; category: BPCategory }

        const bpSections: BPSection[] = [
          { key: 'missionStatement', icon: '🎯', label: 'Mission Statement', category: 'vision' },
          { key: 'visionStatement', icon: '🔭', label: 'Vision Statement', category: 'vision' },
          { key: 'elevatorPitch', icon: '🚀', label: 'Elevator Pitch', category: 'vision' },
          { key: 'problemStatement', icon: '⚡', label: 'Problem Statement', category: 'product' },
          { key: 'solutionOverview', icon: '💡', label: 'Solution Overview', category: 'product' },
          { key: 'uniqueValueProp', icon: '💎', label: 'Unique Value Proposition', category: 'product' },
          { key: 'targetMarket', icon: '👥', label: 'Target Market & Segments', category: 'market' },
          { key: 'marketSize', icon: '📊', label: 'Market Size (TAM/SAM/SOM)', category: 'market' },
          { key: 'competitiveLandscape', icon: '⚔️', label: 'Competitive Landscape', category: 'market' },
          { key: 'revenueModel', icon: '💳', label: 'Revenue Model & Pricing', category: 'finance' },
          { key: 'unitEconomics', icon: '📐', label: 'Unit Economics', category: 'finance' },
          { key: 'financialProjections', icon: '💰', label: 'Financial Projections', category: 'finance' },
          { key: 'fundingRequirements', icon: '🏦', label: 'Funding & Use of Funds', category: 'finance' },
          { key: 'goToMarket', icon: '🗺️', label: 'Go-to-Market Strategy', category: 'strategy' },
          { key: 'salesStrategy', icon: '🤝', label: 'Sales & Distribution', category: 'strategy' },
          { key: 'marketingPlan', icon: '📣', label: 'Marketing Plan', category: 'strategy' },
          { key: 'operationsPlan', icon: '⚙️', label: 'Operations Plan', category: 'operations' },
          { key: 'technologyStack', icon: '🖥️', label: 'Technology & Roadmap', category: 'operations' },
          { key: 'teamStructure', icon: '👔', label: 'Team & Key Hires', category: 'operations' },
          { key: 'milestones', icon: '🏁', label: '12-Month Roadmap', category: 'operations' },
          { key: 'riskAnalysis', icon: '🛡️', label: 'Risk Analysis', category: 'risk' },
          { key: 'legalCompliance', icon: '⚖️', label: 'Legal & Compliance', category: 'risk' },
          { key: 'exitStrategy', icon: '🚪', label: 'Exit Strategy', category: 'risk' },
          { key: 'kpis', icon: '📈', label: 'Key Performance Indicators', category: 'risk' },
        ]

        const filledSections = bpSections.filter(s => outputs[s.key])

        const catMeta: Record<BPCategory, { label: string; icon: string }> = {
          vision: { label: 'Vision & Mission', icon: '🎯' },
          market: { label: 'Market Analysis', icon: '📊' },
          product: { label: 'Product', icon: '💡' },
          finance: { label: 'Financials', icon: '💰' },
          strategy: { label: 'Strategy', icon: '🗺️' },
          operations: { label: 'Operations', icon: '⚙️' },
          risk: { label: 'Risk & Governance', icon: '🛡️' },
        }

        // Extract metrics
        const allFinText = [outputs.unitEconomics, outputs.marketSize, outputs.financialProjections, outputs.revenueModel]
          .filter(Boolean).map(String).join(' ')
        const extractedMetrics = extractNumbers(allFinText)
        const tamSamSom = extractedMetrics.filter(m => ['TAM', 'SAM', 'SOM'].includes(m.label))
        const financeMetrics = extractedMetrics.filter(m => !['TAM', 'SAM', 'SOM'].includes(m.label))

        return (
          <div style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Asset Library Modal */}
            {ideaId && (
              <AssetLibraryModal
                open={day8AssetOpen}
                onOpenChange={setDay8AssetOpen}
                ideaId={ideaId}
                section={day8AssetSection}
                onSelect={handleDay8AssetSelect}
                currentImages={day8HeroImage ? { [day8AssetSection]: day8HeroImage } : {}}
              />
            )}

            {/* ===== HERO — Editorial split with image ===== */}
            <section style={{ backgroundColor: ed.light }}>
              <div className="border-t-[3px]" style={{ borderColor: ed.accent }} />
              <div className="grid lg:grid-cols-2 min-h-[50vh]">
                {/* Left: editorial text */}
                <div className="flex flex-col justify-center px-8 md:px-12 py-12 md:py-16">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] mb-6" style={{ color: ed.accent }}>
                    ◆&ensp;Business Plan
                  </p>
                  <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-light leading-[1.08] tracking-[-0.02em] mb-4" style={{ color: ed.primary, fontFamily: ed.serif }}>
                    {companyName}
                  </h2>
                  <div className="w-16 h-0.5 mb-6" style={{ backgroundColor: ed.accent }} />

                  {typeof outputs.elevatorPitch === 'string' && outputs.elevatorPitch && (
                    <p className="text-base leading-[1.8] max-w-lg font-light italic mb-6" style={{ color: `${ed.primary}70`, fontFamily: ed.serif }}>
                      {stripMd(outputs.elevatorPitch as string)}
                    </p>
                  )}

                  {/* Metrics strip */}
                  {extractedMetrics.length > 0 && (
                    <div className="flex flex-wrap gap-6 mt-4 pt-6 border-t" style={{ borderColor: `${ed.primary}10` }}>
                      {[...tamSamSom.slice(0, 3), ...financeMetrics.slice(0, Math.max(1, 4 - tamSamSom.length))].map((m, idx) => (
                        <div key={idx}>
                          <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-0.5" style={{ color: ed.accent }}>{m.label}</p>
                          <p className="text-xl font-light" style={{ color: ed.primary, fontFamily: ed.serif }}>
                            {m.label === 'Margin' ? `${m.value}%` : `${m.value}${m.unit.charAt(0)}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs mt-6" style={{ color: `${ed.primary}30` }}>
                    {filledSections.length} sections · Investor-grade documentation
                  </p>
                </div>

                {/* Right: hero image */}
                <div className="relative group cursor-pointer" onClick={() => { setDay8AssetSection('Business Plan Hero'); setDay8AssetOpen(true) }}>
                  {day8HeroImage ? (
                    <img src={day8HeroImage} alt="Business Plan" className="w-full h-full object-cover min-h-[300px] lg:min-h-full" />
                  ) : (
                    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center" style={{ backgroundColor: `${ed.primary}06` }}>
                      <span className="text-5xl opacity-20 mb-3">🏢</span>
                      <p className="text-xs font-medium" style={{ color: ed.muted }}>Click to add hero image</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 px-4 py-2 rounded-lg text-xs font-semibold" style={{ color: ed.primary }}>
                      📷 Change Image
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== TABLE OF CONTENTS ===== */}
            <section className="py-12 md:py-16" style={{ backgroundColor: 'white' }}>
              <div className="max-w-5xl mx-auto px-8 md:px-12">
                <div className="grid md:grid-cols-3 gap-10">
                  <div>
                    <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>Contents</h3>
                    <div className="w-12 h-0.5 mt-4" style={{ backgroundColor: ed.accent }} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="grid sm:grid-cols-2 gap-x-10 gap-y-0">
                      {(Object.entries(catMeta) as [BPCategory, typeof catMeta[BPCategory]][]).map(([cat, meta]) => {
                        const catSecs = filledSections.filter(s => s.category === cat)
                        if (catSecs.length === 0) return null
                        return (
                          <div key={cat} className="border-t py-3" style={{ borderColor: `${ed.primary}08` }}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: ed.accent }}>
                              {meta.label}
                            </p>
                            {catSecs.map(s => (
                              <p key={s.key} className="text-sm leading-relaxed flex items-center gap-2" style={{ color: `${ed.primary}55` }}>
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ed.accent }} />{s.label}
                              </p>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== SECTIONS ===== */}
            {filledSections.map((section, secIdx) => {
              const content = String(outputs[section.key])
              const isAlt = secIdx % 2 === 1
              const isTable = ['marketSize', 'unitEconomics', 'financialProjections', 'fundingRequirements', 'competitiveLandscape', 'kpis'].includes(section.key)

              // Market Size — with metrics table
              if (section.key === 'marketSize' && tamSamSom.length > 0) {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Metric</th>
                              <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Value</th>
                              <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tamSamSom.map((m, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{m.label}</td>
                                <td className="py-3 px-4 text-right font-light" style={{ color: ed.primary, fontFamily: ed.serif }}>{m.value.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right" style={{ color: ed.muted }}>{m.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Unit Economics — metrics table
              if (section.key === 'unitEconomics') {
                const ueMetrics = extractNumbers(content)
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      {ueMetrics.length > 0 && (
                        <div className="overflow-x-auto mb-6">
                          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Metric</th>
                                <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ueMetrics.map((m, idx) => (
                                <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                  <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{m.label}</td>
                                  <td className="py-3 px-4 text-right font-light" style={{ color: ed.primary, fontFamily: ed.serif }}>
                                    {m.label === 'Margin' ? `${m.value}%` : `£${m.value.toLocaleString()}`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Financial Projections — year-by-year table
              if (section.key === 'financialProjections') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              {['Metric', 'Year 1', 'Year 2', 'Year 3'].map((h, i) => (
                                <th key={i} className={`py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em] ${i > 0 ? 'text-right' : 'text-left'}`} style={{ color: ed.primary }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {['Revenue', 'Expenses', 'Net Profit', 'Growth Rate'].map((metric, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{metric}</td>
                                {['Foundation', 'Scaling', 'Acceleration'].map((phase, pi) => (
                                  <td key={pi} className="py-3 px-4 text-right" style={{ color: ed.muted }}>—</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Funding — allocation table
              if (section.key === 'fundingRequirements') {
                const fundingAlloc = [
                  { area: 'Product Development', pct: '40%' },
                  { area: 'Marketing & Growth', pct: '25%' },
                  { area: 'Hiring & Talent', pct: '20%' },
                  { area: 'Operations', pct: '10%' },
                  { area: 'Reserve / Buffer', pct: '5%' },
                ]
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Allocation Area</th>
                              <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>% of Funds</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Visual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fundingAlloc.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.area}</td>
                                <td className="py-3 px-4 text-right font-light" style={{ color: ed.primary, fontFamily: ed.serif }}>{row.pct}</td>
                                <td className="py-3 px-4">
                                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${ed.primary}08`, width: '100%' }}>
                                    <div className="h-full rounded-full" style={{ width: row.pct, backgroundColor: ed.accent }} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Milestones — timeline table
              if (section.key === 'milestones') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Quarter</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Phase</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Timeline</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white" style={{ backgroundColor: ed.accent }}>{q}</span>
                                </td>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{['Launch & Validate', 'Growth & Iteration', 'Scale & Optimize', 'Expand & Refine'][idx]}</td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>Month {idx * 3 + 1}–{idx * 3 + 3}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Team — org table
              if (section.key === 'teamStructure') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Department</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Role</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Priority</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { dept: '🖥️ Engineering', role: 'CTO / Lead Engineer', priority: 'Immediate' },
                              { dept: '📣 Marketing', role: 'Growth Lead', priority: 'Q1–Q2' },
                              { dept: '🤝 Sales', role: 'Sales Lead', priority: 'Q2–Q3' },
                              { dept: '⚙️ Operations', role: 'Operations Manager', priority: 'Q3–Q4' },
                            ].map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.dept}</td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>{row.role}</td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${ed.accent}15`, color: ed.accent }}>{row.priority}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Risk Analysis — category table
              if (section.key === 'riskAnalysis') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Risk Category</th>
                              <th className="text-center py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Severity</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Mitigation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { cat: '📊 Market Risk', severity: 'Medium', mitigation: 'Diversified target segments' },
                              { cat: '🖥️ Technical Risk', severity: 'Low', mitigation: 'Proven tech stack, MVP-first' },
                              { cat: '⚔️ Competitive Risk', severity: 'Medium', mitigation: 'Strong differentiators' },
                              { cat: '💰 Financial Risk', severity: 'High', mitigation: 'Lean operations, staged funding' },
                              { cat: '⚖️ Regulatory Risk', severity: 'Low', mitigation: 'Compliance-first approach' },
                              { cat: '👥 Team Risk', severity: 'Medium', mitigation: 'Key hire roadmap' },
                            ].map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.cat}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{
                                    backgroundColor: row.severity === 'High' ? '#fef2f2' : row.severity === 'Medium' ? '#fffbeb' : '#f0fdf4',
                                    color: row.severity === 'High' ? '#dc2626' : row.severity === 'Medium' ? '#d97706' : '#16a34a',
                                  }}>{row.severity}</span>
                                </td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>{row.mitigation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // KPIs — metrics table
              if (section.key === 'kpis') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Category</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>KPI</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Target</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { cat: '📈 Growth', kpi: 'Monthly Active Users', target: 'Track monthly' },
                              { cat: '🎯 Engagement', kpi: 'Retention Rate', target: 'Track weekly' },
                              { cat: '💰 Revenue', kpi: 'MRR / ARR', target: 'Track monthly' },
                              { cat: '⚡ Efficiency', kpi: 'CAC : LTV Ratio', target: '> 3:1' },
                            ].map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.cat}</td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>{row.kpi}</td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>{row.target}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Go-to-Market — phases table
              if (section.key === 'goToMarket') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Phase</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Focus</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Timeline</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { phase: '🌱 Phase 1', focus: 'Traction & Validation', timeline: '0–3 months' },
                              { phase: '🚀 Phase 2', focus: 'Scale & Iterate', timeline: '3–9 months' },
                              { phase: '🌍 Phase 3', focus: 'Expand & Dominate', timeline: '9–18 months' },
                            ].map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.phase}</td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>{row.focus}</td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>{row.timeline}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Sales funnel
              if (section.key === 'salesStrategy') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Funnel Stage</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Conversion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['Awareness', 'Interest', 'Consideration', 'Decision', 'Purchase'].map((stage, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{stage}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-2 rounded-full overflow-hidden flex-1" style={{ backgroundColor: `${ed.primary}06` }}>
                                      <div className="h-full rounded-full" style={{ width: `${100 - idx * 18}%`, backgroundColor: ed.accent }} />
                                    </div>
                                    <span className="text-xs font-light" style={{ color: ed.muted }}>{100 - idx * 18}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // Competitive Landscape — comparison table
              if (section.key === 'competitiveLandscape') {
                return (
                  <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                          <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <RegenBtn sectionKey={section.key} />
                      </div>
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Category</th>
                              <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { cat: '🎯 Direct Competitors', type: 'Same market, same solution' },
                              { cat: '🔄 Indirect Competitors', type: 'Same market, different approach' },
                              { cat: '⚡ Emerging Threats', type: 'New entrants & disruptors' },
                            ].map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.cat}</td>
                                <td className="py-3 px-4" style={{ color: ed.muted }}>{row.type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <BPText text={content} />
                    </div>
                  </section>
                )
              }

              // ---- Default editorial section ----
              return (
                <section key={section.key} className="py-12 md:py-16 border-t" style={{ backgroundColor: isAlt ? ed.light : 'white', borderColor: `${ed.primary}06` }}>
                  <div className="max-w-5xl mx-auto px-8 md:px-12">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                        <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                        <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                      </div>
                      <RegenBtn sectionKey={section.key} />
                    </div>
                    <BPText text={content} sectionKey={section.key} />
                  </div>
                </section>
              )
            })}

            {/* ===== EDITORIAL FOOTER ===== */}
            <section className="py-16" style={{ backgroundColor: ed.primary }}>
              <div className="max-w-3xl mx-auto px-8 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] mb-5" style={{ color: ed.accent }}>
                  ◆&ensp;{companyName}
                </p>
                <h3 className="text-3xl md:text-4xl font-light text-white mb-3 tracking-tight" style={{ fontFamily: ed.serif }}>
                  Business Plan Complete
                </h3>
                <p className="text-white/40 text-sm">
                  {filledSections.length} sections · Generated with Phoxta
                </p>
              </div>
            </section>
          </div>
        )
      }

      // ===== Day 9: Brand Identity =====
      case 9: {
        const bn = outputs.brandName as string | undefined
        const bs = outputs.brandStory as string | undefined
        const cp = outputs.colorPalette as { hex: string; name: string; meaning: string }[] | undefined
        const ty = outputs.typography as string | undefined
        const bv = outputs.brandVoice as string | undefined
        const vd = outputs.visualDirection as string | undefined
        const lg = outputs.logoGuidelines as string | undefined
        const bp = outputs.brandPersonalityProfile as string | undefined

        return (
          <div className="space-y-5">
            {bn && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 text-center">
                <p className="text-xs font-bold text-fuchsia-600 uppercase tracking-wider">Brand Name Direction</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stripMd(bn)}</p>
              </div>
            )}
            {bp && <TextCard label="Brand Personality" value={bp} borderColor="border-fuchsia-400" />}
            {bs && <TextCard label="Brand Story" value={bs} borderColor="border-purple-400" />}

            {/* Colour Palette */}
            {cp?.length && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Colour Palette</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cp.map((c, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      <div className="h-20 w-full" style={{ backgroundColor: c.hex }} />
                      <div className="p-3 bg-white">
                        <p className="text-sm font-bold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.hex}</p>
                        <p className="text-xs text-gray-600 mt-1">{stripMd(c.meaning)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bv && <TextCard label="Brand Voice & Tone" value={bv} borderColor="border-violet-400" />}
            {ty && <TextCard label="Typography" value={ty} borderColor="border-indigo-400" />}
            {vd && <TextCard label="Visual Direction" value={vd} borderColor="border-pink-400" />}
            {lg && <TextCard label="Logo Guidelines" value={lg} borderColor="border-rose-400" />}
          </div>
        )
      }

      // ===== Fallback: generic rendering =====
      default: {
        return (
          <div className="space-y-3">
            {Object.entries(outputs).map(([key, value]) => {
              const label = AI_FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim()
              if (typeof value === 'number') {
                return <StatCard key={key} label={label} value={value} />
              }
              if (Array.isArray(value)) {
                const items = value.map(v =>
                  typeof v === 'object' && v !== null
                    ? ('text' in v ? String(v.text) : JSON.stringify(v))
                    : String(v)
                )
                return <ListItems key={key} label={label} items={items} />
              }
              if (typeof value === 'string') {
                return <TextCard key={key} label={label} value={value} />
              }
              return (
                <div key={key}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                  <FormattedText text={String(value)} />
                </div>
              )
            })}
          </div>
        )
      }
    }
  }

  // ---- Main render ----
  return (
    <>
      {/* AI Analysis Trigger Button — breathing with swirling gradient */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ai-breathe-btn w-full flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-white font-semibold text-base shadow-lg cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98]"
      >
        <span className="text-2xl">{theme.icon}</span>
        <span>View AI Analysis</span>
        <span className="text-white/70 text-sm ml-1">— {theme.label}</span>
      </button>

      {/* Floating Popup Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ai-popup-overlay" onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Popup with swirling gradient border */}
          <div className="relative w-full max-w-2xl max-h-[85vh] ai-popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="ai-gradient-border">
              <div className="bg-white rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className={`bg-gradient-to-r ${theme.gradient} px-5 py-4 flex-shrink-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-xl">{theme.icon}</span>
                      </div>
                      <div>
                        <h2 className="font-bold text-white text-base">AI Analysis</h2>
                        <p className="text-xs text-white/80">{theme.label} — AI assessment</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1">
                  <div className="p-5">
                    {renderDayContent()}
                  </div>

                  {/* Divider */}
                  {suggestions.length > 0 && <div className="border-t border-gray-100" />}

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="px-5 py-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">💡</span>
                        <h3 className="font-semibold text-gray-900 text-sm">AI Suggestions</h3>
                      </div>
                      <ul className="space-y-2">
                        {suggestions.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                            <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span>
                            <span className="leading-relaxed">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Regenerate button */}
                  {onRegenerate && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={isRegenerating}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isRegenerating ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Recalibrating Analysis...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                            </svg>
                            Recalibrate Analysis
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Day 10: Landing Page Builder — onboarding, section approval, live preview
// ---------------------------------------------------------------------------

interface LandingPageSection {
  key: string
  label: string
  icon: string
  type: 'text' | 'textarea' | 'features' | 'faq' | 'array-cards' | 'testimonials' | 'stats' | 'categories' | 'products' | 'blog'
  description: string
}

const LANDING_SECTIONS: LandingPageSection[] = [
  { key: 'bannerSubtitle', label: 'Banner Subtitle', icon: '🏷️', type: 'text', description: 'Short teaser label above the headline (2 words)' },
  { key: 'heroHeadline', label: 'Hero Headline', icon: '🎯', type: 'text', description: 'The bold headline visitors see first (7 words)' },
  { key: 'heroSubheadline', label: 'Hero Subheadline', icon: '✨', type: 'text', description: 'Supporting text under the headline (15 words)' },
  { key: 'heroCtaText', label: 'Hero CTA Button', icon: '🔘', type: 'text', description: 'Primary call-to-action text (2 words)' },
  { key: 'discountCards', label: 'Value Proposition Cards', icon: '💎', type: 'array-cards', description: '3 promo cards with title, description, and CTA' },
  { key: 'whyChooseHeadline', label: 'Why Choose Us Title', icon: '🏆', type: 'text', description: 'Section heading (6 words)' },
  { key: 'chooseSubtitle', label: 'Why Choose Us Subtitle', icon: '🏷️', type: 'text', description: 'Small label above the heading (2 words)' },
  { key: 'whyChooseDescription', label: 'Why Choose Us Text', icon: '📋', type: 'text', description: 'Brief explanation (14 words)' },
  { key: 'benefits', label: 'Benefits', icon: '⚡', type: 'features', description: '3 benefit cards with icon, title, and description' },
  { key: 'featuresSectionTitle', label: 'Features Title', icon: '🧩', type: 'text', description: 'Features section heading (3 words)' },
  { key: 'featuresSubtitle', label: 'Features Subtitle', icon: '🏷️', type: 'text', description: 'Small label above the heading (2 words)' },
  { key: 'products', label: 'Feature Cards', icon: '📦', type: 'products', description: '6 product/feature cards' },
  { key: 'aboutHeadline', label: 'About Headline', icon: '💡', type: 'text', description: 'About section heading (7 words)' },
  { key: 'aboutSubtitle', label: 'About Subtitle', icon: '🏷️', type: 'text', description: 'Small label above the heading (2 words)' },
  { key: 'aboutDescription', label: 'About Description', icon: '📝', type: 'text', description: 'About section text (21 words)' },
  { key: 'aboutCtaText', label: 'About CTA Button', icon: '🔘', type: 'text', description: 'About section button text (2 words)' },
  { key: 'aboutStats', label: 'Statistics', icon: '📊', type: 'stats', description: '3 counter statistics' },
  { key: 'categoriesSubtitle', label: 'Categories Subtitle', icon: '🏷️', type: 'text', description: 'Small label above the heading (1 word)' },
  { key: 'categoriesHeadline', label: 'Categories Headline', icon: '📁', type: 'text', description: 'Categories section heading (3 words)' },
  { key: 'categories', label: 'Categories', icon: '📁', type: 'categories', description: '4 category/use-case cards' },
  { key: 'offerHeadline', label: 'Offer Headline', icon: '🎁', type: 'text', description: 'Special offer heading (3 words)' },
  { key: 'offerSubtitle', label: 'Offer Subtitle', icon: '🏷️', type: 'text', description: 'Small label above the heading (2 words)' },
  { key: 'offerDescription', label: 'Offer Description', icon: '💰', type: 'text', description: 'Offer details (7 words)' },
  { key: 'offerCtaText', label: 'Offer CTA Button', icon: '🔘', type: 'text', description: 'Offer button text (2 words)' },
  { key: 'offerProducts', label: 'Offer Items', icon: '🛍️', type: 'products', description: '5 offer highlight items' },
  { key: 'testimonialSubtitle', label: 'Testimonials Subtitle', icon: '🏷️', type: 'text', description: 'Small label above the heading (1 word)' },
  { key: 'testimonialHeadline', label: 'Testimonials Headline', icon: '⭐', type: 'text', description: 'Testimonials section heading (3 words)' },
  { key: 'testimonials', label: 'Testimonials', icon: '⭐', type: 'testimonials', description: '3 customer testimonials (21 words each)' },
  { key: 'blogSubtitle', label: 'Blog Subtitle', icon: '🏷️', type: 'text', description: 'Small label above the heading (3 words)' },
  { key: 'blogHeadline', label: 'Blog Headline', icon: '📰', type: 'text', description: 'Blog section heading (4 words)' },
  { key: 'blogPosts', label: 'Blog Posts', icon: '📰', type: 'blog', description: '3 article teasers' },
  { key: 'newsletterTitle', label: 'Newsletter Title', icon: '📧', type: 'text', description: 'Newsletter section label (2 words)' },
  { key: 'newsletterSubtitle', label: 'Newsletter Subtitle', icon: '📬', type: 'text', description: 'Newsletter heading (8 words)' },
  { key: 'finalCtaButtonText', label: 'Subscribe Button', icon: '🔘', type: 'text', description: 'Subscribe button text (1 word)' },
  { key: 'footerDescription', label: 'Footer Description', icon: '📌', type: 'text', description: 'Company description (24 words)' },
  { key: 'footerTagline', label: 'Footer Tagline', icon: '🏷️', type: 'text', description: 'Copyright tagline' },
]

function Day10LandingPageBuilder({
  ideaId,
  state,
  prefilled,
  formData,
  setFormData,
  fetchState,
}: {
  ideaId: string
  state: DayState | null
  prefilled: boolean
  formData: Record<string, string>
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fetchState: () => void
}) {
  const [step, setStep] = useState<'onboarding' | 'sections' | 'preview'>('onboarding')
  const [businessInfo, setBusinessInfo] = useState({
    contactEmail: '',
    contactPhone: '',
    location: '',
    businessHours: '',
    socialLinks: '',
    ctaUrl: '',
  })
  const [approvedSections, setApprovedSections] = useState<Set<string>>(new Set())
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({})
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetModalSection, setAssetModalSection] = useState('')
  const [day10Generating, setDay10Generating] = useState(false)
  const [day10Error, setDay10Error] = useState<string | null>(null)
  const [landingData, setLandingData] = useState<Record<string, unknown>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [day10Submitting, setDay10Submitting] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('xeno')
  const [editedHtml, setEditedHtml] = useState<string | undefined>(undefined)
  const [templateResetKey, setTemplateResetKey] = useState(0)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Refs to track latest state for cleanup/unmount flush
  const landingDataRef = useRef(landingData)
  const generatedImagesRef = useRef(generatedImages)
  const approvedSectionsRef = useRef(approvedSections)
  const businessInfoRef = useRef(businessInfo)
  const selectedTemplateRef = useRef(selectedTemplate)
  const editedHtmlRef = useRef(editedHtml)

  // Designer canvas state
  const [activeLeftPanel, setActiveLeftPanel] = useState<'templates' | 'assets' | 'layers' | null>(null)
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [layersData, setLayersData] = useState<Array<{ id: string; name: string; tag: string; items: Array<{ type: string; label: string; tag: string; key: string; sectionId: string }> }>>([])
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  useEffect(() => { landingDataRef.current = landingData }, [landingData])
  useEffect(() => { generatedImagesRef.current = generatedImages }, [generatedImages])
  useEffect(() => { approvedSectionsRef.current = approvedSections }, [approvedSections])
  useEffect(() => { businessInfoRef.current = businessInfo }, [businessInfo])
  useEffect(() => { selectedTemplateRef.current = selectedTemplate }, [selectedTemplate])
  useEffect(() => { editedHtmlRef.current = editedHtml }, [editedHtml])

  // Debounced auto-save of Day 10 state (images, approvals, businessInfo, edited landingData)
  const saveDay10State = useCallback((
    currentLandingData: Record<string, unknown>,
    currentImages: Record<string, string>,
    currentApproved: Set<string>,
    currentBizInfo: typeof businessInfo,
  ) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/days/10`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId,
            _day10State: {
              landingData: currentLandingData,
              generatedImages: currentImages,
              approvedSections: [...currentApproved],
              businessInfo: currentBizInfo,
              selectedTemplate: selectedTemplateRef.current,
              editedHtml: editedHtmlRef.current || undefined,
            },
          }),
        })
      } catch { /* ignore save errors */ }
    }, 800)
  }, [ideaId])

  // Immediate save (non-debounced) for critical moments like submit/unmount
  const flushDay10Save = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const data = landingDataRef.current
    if (Object.keys(data).length === 0) return
    try {
      await fetch(`/api/days/10`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          _day10State: {
            landingData: data,
            generatedImages: generatedImagesRef.current,
            approvedSections: [...approvedSectionsRef.current],
            businessInfo: businessInfoRef.current,
            selectedTemplate: selectedTemplateRef.current,
            editedHtml: editedHtmlRef.current || undefined,
          },
        }),
      })
    } catch { /* ignore */ }
  }, [ideaId])

  // Custom submit handler that preserves Day 10 state (the parent handleSubmit sends empty body)
  const handleDay10Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDay10Submitting(true)
    await flushDay10Save()
    await fetchState()
    setDay10Submitting(false)
  }

  // Flush pending save on component unmount via sendBeacon
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        const data = landingDataRef.current
        if (Object.keys(data).length > 0) {
          navigator.sendBeacon(
            `/api/days/10`,
            new Blob([JSON.stringify({
              ideaId,
              _day10State: {
                landingData: data,
                generatedImages: generatedImagesRef.current,
                approvedSections: [...approvedSectionsRef.current],
                businessInfo: businessInfoRef.current,
                selectedTemplate: selectedTemplateRef.current,
                editedHtml: editedHtmlRef.current || undefined,
              },
            })], { type: 'application/json' })
          )
        }
      }
    }
  }, [ideaId])

  // Safety net: flush on browser close/refresh
  useEffect(() => {
    const onBeforeUnload = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        const data = landingDataRef.current
        if (Object.keys(data).length > 0) {
          navigator.sendBeacon(
            `/api/days/10`,
            new Blob([JSON.stringify({
              ideaId,
              _day10State: {
                landingData: data,
                generatedImages: generatedImagesRef.current,
                approvedSections: [...approvedSectionsRef.current],
                businessInfo: businessInfoRef.current,
                selectedTemplate: selectedTemplateRef.current,
                editedHtml: editedHtmlRef.current || undefined,
              },
            })], { type: 'application/json' })
          )
        }
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [ideaId])

  // Load existing data from state
  useEffect(() => {
    // First, try to restore saved Day 10 state from day_inputs
    if (state?.inputs) {
      const saved = (state.inputs as Record<string, unknown>)?._day10State as {
        landingData?: Record<string, unknown>
        generatedImages?: Record<string, string>
        approvedSections?: string[]
        businessInfo?: typeof businessInfo
        selectedTemplate?: TemplateId
        editedHtml?: string
      } | undefined

      if (saved) {
        if (saved.landingData && Object.keys(saved.landingData).length > 0) {
          setLandingData(saved.landingData)
          if (saved.landingData.heroHeadline) setStep('sections')
        } else if (state?.aiOutputs && Object.keys(state.aiOutputs).length > 0) {
          setLandingData(state.aiOutputs)
          if (state.aiOutputs.heroHeadline) setStep('sections')
        }
        if (saved.generatedImages) setGeneratedImages(saved.generatedImages)
        if (saved.approvedSections) setApprovedSections(new Set(saved.approvedSections))
        if (saved.businessInfo) setBusinessInfo(saved.businessInfo)
        if (saved.selectedTemplate && saved.selectedTemplate in TEMPLATE_RENDERERS) setSelectedTemplate(saved.selectedTemplate)
        if (saved.editedHtml) setEditedHtml(saved.editedHtml)
        return
      }
    }
    // Fallback: load from AI outputs if no saved state
    if (state?.aiOutputs && Object.keys(state.aiOutputs).length > 0) {
      setLandingData(state.aiOutputs)
      if (state.aiOutputs.heroHeadline) {
        setStep('sections')
      }
    }
  }, [state?.aiOutputs, state?.inputs])

  const [fetchingImages, setFetchingImages] = useState(false)
  const pexelsFetchedRef = useRef(false)

  // Auto-fetch Pexels images whenever landingData has imageSearchTerms but not all images resolved
  useEffect(() => {
    const searchTerms = landingData.imageSearchTerms as Record<string, string> | undefined
    if (!searchTerms || Object.keys(searchTerms).length === 0) return
    if (pexelsFetchedRef.current) return

    // Only skip if we already have a Pexels image for EVERY search-term key
    const termKeys = Object.keys(searchTerms)
    const missingKeys = termKeys.filter((k) => !generatedImages[k])
    if (missingKeys.length === 0) return

    // Build queries only for missing keys
    const queries: Record<string, string> = {}
    missingKeys.forEach((k) => { queries[k] = searchTerms[k] })

    const fetchImages = async () => {
      setFetchingImages(true)
      try {
        const res = await fetch(`/api/idea/${ideaId}/pexels-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries }),
        })
        if (res.ok) {
          const data = await res.json()
          const imgs = data.images || {}
          if (Object.keys(imgs).length > 0) {
            pexelsFetchedRef.current = true
            setGeneratedImages((prev) => {
              const merged = { ...prev, ...imgs }
              // Persist to server
              saveDay10State(landingData, merged, approvedSections, businessInfo)
              return merged
            })
          }
        }
      } catch { /* ignore — user can pick images manually */ }
      finally { setFetchingImages(false) }
    }
    fetchImages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingData.imageSearchTerms, ideaId])

  useEffect(() => {
    if (prefilled && Object.keys(formData).length > 0) {
      setStep('sections')
    }
  }, [prefilled, formData])

  const triggerDay10Generate = async () => {
    setDay10Generating(true)
    setDay10Error(null)
    try {
      const res = await fetch(`/api/idea/${ideaId}/generate-day-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber: 10 }),
      })
      if (res.ok) {
        const result = await res.json()
        setLandingData(result)
        setStep('sections')

        // Auto-fetch Pexels images using AI-generated search terms
        let fetchedImages: Record<string, string> = {}
        const searchTerms = result.imageSearchTerms as Record<string, string> | undefined
        if (searchTerms && Object.keys(searchTerms).length > 0) {
          try {
            const pexelsRes = await fetch(`/api/idea/${ideaId}/pexels-batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ queries: searchTerms }),
            })
            if (pexelsRes.ok) {
              const pexelsData = await pexelsRes.json()
              fetchedImages = pexelsData.images || {}
              setGeneratedImages((prev) => ({ ...prev, ...fetchedImages }))
            }
          } catch { /* Pexels fetch failed — user can still pick images manually */ }
        }

        // Save immediately (not debounced) before fetching state to avoid race condition
        // Use functional setter to capture the latest generatedImages (avoids stale closure)
        setGeneratedImages((latestImages) => {
          const mergedImages = { ...latestImages, ...fetchedImages }
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          fetch(`/api/days/10`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ideaId,
              _day10State: {
                landingData: result,
                generatedImages: mergedImages,
                approvedSections: [...approvedSections],
                businessInfo,
                selectedTemplate,
                editedHtml: undefined,
              },
            }),
          }).catch(() => { /* ignore */ })
          return mergedImages
        })
        fetchState()
      } else {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.error || `Generation failed (status ${res.status}). Please try again.`
        console.error('[Day10] Generation failed:', msg)
        setDay10Error(msg)
      }
    } catch (err) {
      console.error('[Day10] Generation error:', err)
      setDay10Error('Network error — please check your connection and try again.')
    } finally {
      setDay10Generating(false)
    }
  }

  const handleOnboardingSubmit = () => {
    setFormData((prev) => ({
      ...prev,
      contactEmail: businessInfo.contactEmail,
      contactPhone: businessInfo.contactPhone,
      location: businessInfo.location,
      businessHours: businessInfo.businessHours,
      socialLinks: businessInfo.socialLinks,
      ctaUrl: businessInfo.ctaUrl,
    }))
    triggerDay10Generate()
  }

  const handleRegenerateSection = async (sectionKey: string, feedback?: string) => {
    setRegenerating(sectionKey)
    try {
      const currentContent = landingData[sectionKey]
      const res = await fetch(`/api/idea/${ideaId}/regen-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, currentContent, feedback, businessInfo }),
      })
      if (res.ok) {
        const data = await res.json()
        setLandingData((prev) => {
          const next = { ...prev, [sectionKey]: data.content }
          saveDay10State(next, generatedImages, approvedSections, businessInfo)
          return next
        })
      }
    } catch { /* ignore */ } finally { setRegenerating(null) }
  }

  const handleOpenAssetLibrary = (section: string) => {
    setAssetModalSection(section)
    setAssetModalOpen(true)
  }

  const handleAssetSelected = (url: string) => {
    setGeneratedImages((prev) => {
      // Save the old image to the library before replacing it
      const oldUrl = prev[assetModalSection]
      if (oldUrl && oldUrl !== url) {
        fetch(`/api/idea/${ideaId}/save-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: oldUrl, section: assetModalSection }),
        }).catch(() => {})
      }
      const next = { ...prev, [assetModalSection]: url }
      saveDay10State(landingData, next, approvedSections, businessInfo)
      return next
    })

    // Notify the iframe to replace the specific image instance
    window.dispatchEvent(
      new CustomEvent('phoxta-image-replaced', { detail: { url, section: assetModalSection } }),
    )
  }

  // Listen for image click events from HTML template iframe
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.section) {
        setAssetModalSection(detail.section)
        setAssetModalOpen(true)
      }
    }
    window.addEventListener('phoxta-open-asset-library', handler)
    return () => window.removeEventListener('phoxta-open-asset-library', handler)
  }, [])

  // Listen for layers tree broadcast from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'phoxta-layers-tree' && Array.isArray(e.data.sections)) {
        setLayersData(e.data.sections)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Helper: send action to iframe layer element
  const sendLayerAction = (action: 'click' | 'highlight', key: string, itemType: string) => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement | null
    iframe?.contentWindow?.postMessage({ type: 'phoxta-layer-action', action, key, itemType }, '*')
  }



  const colorScheme = landingData.colorScheme as { primary?: string; secondary?: string; accent?: string; background?: string; text?: string } | undefined
  const features = (landingData.featuresSection as Array<{ title: string; description: string; icon: string }>) || []
  const faqs = (landingData.faqSection as Array<{ question: string; answer: string }>) || []
  const imageSearchTerms = (landingData.imageSearchTerms as Record<string, string>) || {}

  // Helper: find the best matching generated image for a landing page section
  const findImageForSection = (sectionName: string): string | undefined => {
    // Direct match
    if (generatedImages[sectionName]) return generatedImages[sectionName]
    // Case-insensitive partial match
    const lower = sectionName.toLowerCase()
    for (const [key, url] of Object.entries(generatedImages)) {
      if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return url
    }
    return undefined
  }

  const renderSectionContent = (section: LandingPageSection) => {
    const value = landingData[section.key]
    if (!value) return <p className="text-muted-foreground text-sm italic">Generating...</p>

    if (section.type === 'features' && Array.isArray(value)) {
      return (
        <div className="grid grid-cols-2 gap-3">
          {(value as Array<{ title: string; description: string; icon: string }>).map((f, i) => (
            <Card key={i} className="py-3 gap-2">
              <CardContent className="px-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm font-semibold">{stripMd(f.title)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stripMd(f.description)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (section.type === 'faq' && Array.isArray(value)) {
      return (
        <Accordion type="multiple" className="w-full">
          {(value as Array<{ question: string; answer: string }>).map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-sm font-semibold">{stripMd(faq.question)}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-xs">{stripMd(faq.answer)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )
    }

    if (section.type === 'array-cards' && Array.isArray(value)) {
      return (
        <div className="grid grid-cols-3 gap-3">
          {(value as Array<{ title: string; description: string; ctaText: string }>).map((card, i) => (
            <Card key={i} className="py-3 gap-2">
              <CardContent className="px-4 text-center">
                <p className="text-sm font-semibold mb-1">{card.title}</p>
                <p className="text-xs text-muted-foreground mb-2">{card.description}</p>
                <span className="text-[10px] font-medium text-primary">{card.ctaText}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (section.type === 'testimonials' && Array.isArray(value)) {
      return (
        <div className="space-y-3">
          {(value as Array<{ text: string; name: string; role: string }>).map((t, i) => (
            <Card key={i} className="py-3 gap-1">
              <CardContent className="px-4">
                <p className="text-xs text-muted-foreground italic mb-2">&ldquo;{t.text}&rdquo;</p>
                <p className="text-xs font-semibold">{t.name} <span className="font-normal text-muted-foreground">· {t.role}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (section.type === 'stats' && Array.isArray(value)) {
      return (
        <div className="grid grid-cols-3 gap-3">
          {(value as Array<{ number: string; suffix: string; label: string }>).map((s, i) => (
            <div key={i} className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-bold">{s.number}<span className="text-primary">{s.suffix}</span></p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )
    }

    if (section.type === 'categories' && Array.isArray(value)) {
      return (
        <div className="grid grid-cols-4 gap-2">
          {(value as Array<{ title: string }>).map((c, i) => (
            <div key={i} className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium">{c.title}</p>
            </div>
          ))}
        </div>
      )
    }

    if (section.type === 'products' && Array.isArray(value)) {
      return (
        <div className="grid grid-cols-3 gap-3">
          {(value as Array<{ title: string; description: string }>).map((p, i) => (
            <Card key={i} className="py-2 gap-1">
              <CardContent className="px-3">
                <p className="text-xs font-semibold mb-1">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">{p.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (section.type === 'blog' && Array.isArray(value)) {
      return (
        <div className="grid grid-cols-3 gap-3">
          {(value as Array<{ title: string; excerpt: string }>).map((b, i) => (
            <Card key={i} className="py-3 gap-1">
              <CardContent className="px-4">
                <p className="text-xs font-semibold mb-1">{b.title}</p>
                <p className="text-[10px] text-muted-foreground">{b.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{stripMd(String(value))}</p>
  }

  // ---- ONBOARDING STEP ----
  if (step === 'onboarding' && !day10Generating) {
    return (
      <section className="space-y-5">
        <Card className="text-center">
          <CardContent className="pt-2">
            <div className="w-14 h-14 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
              <span className="text-2xl">🌐</span>
            </div>
            <CardTitle className="text-lg">Build Your Landing Page</CardTitle>
            <CardDescription className="mt-2">AI will create a professional one-pager website from your validation data, brand identity, and business plan. First, provide your contact details.</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-primary text-primary-foreground rounded-t-xl px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <CardTitle className="text-sm">Business Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="text-xs uppercase tracking-wider">Contact Email *</Label>
                <Input id="contact-email" type="email" value={businessInfo.contactEmail} onChange={(e) => setBusinessInfo({ ...businessInfo, contactEmail: e.target.value })} placeholder="hello@yourcompany.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone" className="text-xs uppercase tracking-wider">Phone Number</Label>
                <Input id="contact-phone" type="tel" value={businessInfo.contactPhone} onChange={(e) => setBusinessInfo({ ...businessInfo, contactPhone: e.target.value })} placeholder="+44 20 1234 5678" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs uppercase tracking-wider">Business Location</Label>
              <Input id="location" value={businessInfo.location} onChange={(e) => setBusinessInfo({ ...businessInfo, location: e.target.value })} placeholder="London, United Kingdom" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours" className="text-xs uppercase tracking-wider">Business Hours</Label>
              <Input id="hours" value={businessInfo.businessHours} onChange={(e) => setBusinessInfo({ ...businessInfo, businessHours: e.target.value })} placeholder="Mon-Fri 9am-6pm GMT" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social" className="text-xs uppercase tracking-wider">Social Media Links</Label>
              <ShadTextarea id="social" rows={2} value={businessInfo.socialLinks} onChange={(e) => setBusinessInfo({ ...businessInfo, socialLinks: e.target.value })} placeholder={"https://twitter.com/yourcompany\nhttps://linkedin.com/company/yourcompany"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cta-url" className="text-xs uppercase tracking-wider">CTA Destination URL</Label>
              <Input id="cta-url" type="url" value={businessInfo.ctaUrl} onChange={(e) => setBusinessInfo({ ...businessInfo, ctaUrl: e.target.value })} placeholder="https://yourapp.com/signup" />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleOnboardingSubmit} disabled={!businessInfo.contactEmail.trim()} className="w-full h-12 text-sm font-semibold" size="lg">
          🌐 Generate Landing Page with AI
        </Button>
      </section>
    )
  }

  // ---- GENERATING ----
  if (day10Generating) {
    return (
      <section className="space-y-4">
        <Card className="text-center">
          <CardContent className="pt-2">
            <div className="w-14 h-14 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
              <span className="text-2xl animate-pulse">🌐</span>
            </div>
            <CardTitle>Generating your landing page...</CardTitle>
            <CardDescription className="mt-2">AI is crafting copy, designing sections, and preparing image prompts. This may take up to a minute.</CardDescription>
            <Progress value={65} className="mt-4 mx-auto max-w-xs" />
          </CardContent>
        </Card>
      </section>
    )
  }

  // ---- GENERATION ERROR ----
  if (day10Error && Object.keys(landingData).length === 0) {
    return (
      <section className="space-y-4">
        <Card className="text-center border-destructive">
          <CardContent className="pt-2">
            <div className="w-14 h-14 mx-auto mb-3 bg-destructive/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <CardTitle className="text-destructive">Generation Failed</CardTitle>
            <CardDescription className="mt-2">{day10Error}</CardDescription>
            <button
              onClick={() => { setDay10Error(null); triggerDay10Generate() }}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              Retry Generation
            </button>
          </CardContent>
        </Card>
      </section>
    )
  }

  // ---- SECTION REVIEW STEP ----
  if (step === 'sections' && !showPreview) {
    return (
      <section className="space-y-5">

        {/* Section Cards */}
        {LANDING_SECTIONS.map((section) => {
          return (
            <Card key={section.key} className="overflow-hidden py-0 gap-0">
              <CardHeader className="rounded-t-xl px-5 py-3 bg-primary text-primary-foreground">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{section.icon}</span>
                    <div>
                      <CardTitle className="text-sm text-inherit">{section.label}</CardTitle>
                      <p className="text-[10px] opacity-70">{section.description}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {renderSectionContent(section)}
                <Separator className="my-4" />
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRegenerateSection(section.key)} disabled={regenerating === section.key || !landingData[section.key]}>
                    {regenerating === section.key ? (
                      <><svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Regenerating...</>
                    ) : '↻ Regenerate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* AI Images section — auto-populated from Pexels using AI search terms */}
        {Object.keys(imageSearchTerms).length > 0 && (
          <Card className="overflow-hidden py-0 gap-0">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-xl px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🖼️</span>
                <CardTitle className="text-sm text-inherit">Landing Page Images</CardTitle>
                {fetchingImages && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-primary-foreground/70 animate-pulse">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    Finding stock photos…
                  </span>
                )}
              </div>
              <CardDescription className="text-primary-foreground/60 text-xs">Auto-selected stock photos for each section. Click any image to change it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(imageSearchTerms).map(([section, query]) => (
                  <div key={section} className="group relative rounded-lg overflow-hidden border bg-muted/30">
                    {generatedImages[section] ? (
                      <div
                        className="cursor-pointer"
                        onClick={() => handleOpenAssetLibrary(section)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={generatedImages[section]} alt={query} className="w-full h-32 object-cover group-hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
                        </div>
                      </div>
                    ) : fetchingImages ? (
                      <div className="w-full h-32 flex flex-col items-center justify-center bg-muted/40 animate-pulse">
                        <svg className="w-6 h-6 text-muted-foreground/40 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                      </div>
                    ) : (
                      <div
                        className="w-full h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => handleOpenAssetLibrary(section)}
                      >
                        <span className="text-2xl mb-1">🖼️</span>
                        <span className="text-xs text-muted-foreground">Choose</span>
                      </div>
                    )}
                    <div className="px-2 py-1.5 bg-background/90">
                      <p className="text-[11px] font-medium truncate capitalize">{section.replace(/(\d+)$/, ' $1')}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{query}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Asset Library Modal */}
        <AssetLibraryModal
          open={assetModalOpen}
          onOpenChange={setAssetModalOpen}
          ideaId={ideaId}
          section={assetModalSection}
          onSelect={handleAssetSelected}
          currentImages={generatedImages}
          defaultQuery={imageSearchTerms[assetModalSection] || ''}
        />

        {/* Preview & Submit */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowPreview(true)} className="flex-1 h-12">
            👁️ Preview Landing Page
          </Button>
          <form onSubmit={handleDay10Submit} className="flex-1">
            <Button type="submit" disabled={day10Submitting} className="w-full h-12">
              {day10Submitting
                ? '🌐 Saving Landing Page...'
                : '🚀 Save & Complete Landing Page'}
            </Button>
          </form>
        </div>
      </section>
    )
  }

  // ---- FULLSCREEN DESIGNER CANVAS ----
  if (showPreview) {
    const pc = colorScheme?.primary || '#0f172a'
    const sc = colorScheme?.secondary || '#1e293b'
    const ac = colorScheme?.accent || '#3b82f6'
    const bg = colorScheme?.background || '#ffffff'
    const tx = colorScheme?.text || '#111827'

    const templateProps: TemplateProps = {
      landingData,
      setLandingData,
      generatedImages,
      approvedSections,
      businessInfo,
      saveDay10State,
      findImageForSection,
      stripMd,
      colorScheme: { primary: pc, secondary: sc, accent: ac, background: bg, text: tx },
      coverImage: formData.day8CoverImage || '',
      editedHtml,
      ideaId,
      onEditedHtmlChange: (html: string) => {
        editedHtmlRef.current = html
        saveDay10State(landingData, generatedImages, approvedSections, businessInfo)
      },
    }

    const TemplateComponent = TEMPLATE_RENDERERS[selectedTemplate]

    // Helpers
    const toggleLeftPanel = (panel: typeof activeLeftPanel) => setActiveLeftPanel(p => p === panel ? null : panel)

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0e0e11] text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

        {/* ════════════ TOP BAR ════════════ */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-white/[0.06] bg-[#18181b] shrink-0 z-[60]">
          {/* Left group */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowPreview(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer">
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
                saveDay10State(landingData, generatedImages, approvedSections, businessInfo)
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
                  <button key={t.id} type="button" onClick={() => { if (t.id !== selectedTemplate) { setEditedHtml(''); editedHtmlRef.current = '' } setSelectedTemplate(t.id); saveDay10State(landingData, generatedImages, approvedSections, businessInfo) }}
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

            <form onSubmit={handleDay10Submit} className="inline">
              <Button type="submit" disabled={day10Submitting} size="sm" className="h-8 px-4 text-xs font-bold shadow-lg border-0 cursor-pointer" style={{ backgroundColor: ac, color: '#fff' }}>
                {day10Submitting ? 'Saving...' : 'Save & Complete'}
              </Button>
            </form>
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
            {/* Assets */}
            <button type="button" onClick={() => toggleLeftPanel('assets')} title="Assets"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${activeLeftPanel === 'assets' ? 'bg-white/[0.12] text-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'}`}>
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
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
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{activeLeftPanel === 'templates' ? 'Templates' : activeLeftPanel === 'layers' ? 'Layers' : 'Asset Library'}</span>
                <button type="button" onClick={() => setActiveLeftPanel(null)} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeLeftPanel === 'templates' && TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => { if (t.id !== selectedTemplate) { setEditedHtml(''); editedHtmlRef.current = '' } setSelectedTemplate(t.id); saveDay10State(landingData, generatedImages, approvedSections, businessInfo) }}
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
                {activeLeftPanel === 'assets' && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-white/30 px-1">Click any image on the canvas to replace it with assets from your library.</p>
                    <button type="button" onClick={() => { setAssetModalSection('hero'); setAssetModalOpen(true) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer">
                      <svg className="w-4 h-4 shrink-0 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      <span className="text-[11px] font-medium">Open Asset Library</span>
                    </button>
                    {/* Show generated images as thumbnails */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(generatedImages).filter(([, url]) => url).map(([key, url]) => (
                        <div key={key} className="aspect-video rounded-md overflow-hidden bg-white/[0.04] border border-white/[0.06] group relative cursor-pointer" onClick={() => { setAssetModalSection(key); setAssetModalOpen(true) }}>
                          <img src={url} alt={key} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[9px] font-medium text-white/80">Replace</span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                background: bg,
                boxShadow: viewportMode !== 'desktop' ? '0 0 60px rgba(0,0,0,.5)' : undefined,
              }}
            >
              <TemplateComponent key={`${selectedTemplate}-${templateResetKey}`} {...templateProps} />
            </div>
          </div>
        </div>

        {/* Asset Library Modal */}
        <AssetLibraryModal
          open={assetModalOpen}
          onOpenChange={setAssetModalOpen}
          ideaId={ideaId}
          section={assetModalSection}
          onSelect={handleAssetSelected}
          currentImages={generatedImages}
          defaultQuery={imageSearchTerms[assetModalSection] || ''}
        />
      </div>
    )
  }

  return null
}

// ===== Editorial Day 8 Style Constants =====
const ED_STYLES = { accent: '#c9a96e', primary: '#1a1a2e', muted: '#6b7280', light: '#f9f8f6', serif: 'Georgia, "Times New Roman", serif' } as const

// ===== Day 8 — Extracted stable components =====

interface Day8FormatToolbarProps {
  visible: boolean
  sectionKey: string
  day8SavingSection: string | null
  day8SavedSection: string | null
  day8DirtySections: Set<string>
  day8ColorPickerSection: string | null
  setDay8ColorPickerSection: React.Dispatch<React.SetStateAction<string | null>>
  day8EditorHtmlRef: React.MutableRefObject<Record<string, string>>
  formData: Record<string, string>
  metaFields: FieldDef[]
  ideaId: string
  dayNumber: number
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setDay8SavingSection: React.Dispatch<React.SetStateAction<string | null>>
  setDay8SavedSection: React.Dispatch<React.SetStateAction<string | null>>
  setDay8DirtySections: React.Dispatch<React.SetStateAction<Set<string>>>
  fetchState: () => Promise<void>
}

const COLOR_SWATCHES = [
  '#000000', '#374151', '#6b7280', '#dc2626', '#ea580c', '#ca8a04',
  '#16a34a', '#059669', '#0ea5e9', '#2563eb', '#7c3aed', '#db2777',
  '#991b1b', '#92400e', '#854d0e', '#166534', '#1e3a5f', '#581c87',
]

function Day8FormatToolbar({
  visible, sectionKey,
  day8SavingSection, day8SavedSection, day8DirtySections, day8ColorPickerSection,
  setDay8ColorPickerSection, day8EditorHtmlRef,
  formData, metaFields, ideaId, dayNumber,
  setFormData, setDay8SavingSection, setDay8SavedSection, setDay8DirtySections, fetchState,
}: Day8FormatToolbarProps) {
  // Persist the user's text selection so toolbar clicks can restore it
  const savedRangeRef = useRef<Range | null>(null)

  if (!visible) return null

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const restoreSelection = () => {
    const range = savedRangeRef.current
    if (range) {
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }

  const handleFormat = (cmd: string, value?: string) => {
    // Re-focus the editor and restore the saved selection before exec
    const editorEl = document.querySelector(`[data-bp-section="${sectionKey}"]`) as HTMLDivElement
    if (editorEl) editorEl.focus()
    restoreSelection()
    document.execCommand(cmd, false, value)
    // Capture updated HTML in ref so formatting survives re-renders
    if (editorEl) {
      day8EditorHtmlRef.current[sectionKey] = editorEl.innerHTML
    }
    // Update saved range to reflect post-format selection
    saveSelection()
  }
  const preventFocusLoss = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); saveSelection() }
  const isSaving = day8SavingSection === sectionKey
  const isSaved = day8SavedSection === sectionKey
  const isDirty = day8DirtySections.has(sectionKey)
  const showColorPicker = day8ColorPickerSection === sectionKey
  const ed = ED_STYLES

  const handleSave = async () => {
    setDay8SavingSection(sectionKey)
    try {
      // Grab latest HTML from ref only for dirty sections
      const latestData = { ...formData }
      for (const [k, v] of Object.entries(day8EditorHtmlRef.current)) {
        if (v && day8DirtySections.has(k)) latestData[k] = v
      }
      const body: Record<string, unknown> = { ideaId }
      for (const field of metaFields) {
        const raw = latestData[field.name] ?? ''
        if (raw.trim()) body[field.name] = raw
      }
      const res = await fetch(`/api/days/${dayNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        // Sync all editor HTML to formData
        setFormData(prev => {
          const next = { ...prev }
          for (const [k, v] of Object.entries(day8EditorHtmlRef.current)) {
            if (v) next[k] = v
          }
          return next
        })
        setDay8SavedSection(sectionKey)
        setDay8DirtySections(prev => { const s = new Set(prev); s.delete(sectionKey); return s })
        await fetchState()
        setTimeout(() => setDay8SavedSection(prev => prev === sectionKey ? null : prev), 2000)
      }
    } catch { /* ignore */ }
    setDay8SavingSection(null)
  }

  return (
    <div
      className="absolute left-0 right-0 flex items-center gap-0.5 flex-wrap px-3 py-2 rounded-xl shadow-xl border border-gray-200 bg-white/95 backdrop-blur-md z-30 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ bottom: '100%', marginBottom: 6 }}
      onMouseDown={e => { e.preventDefault(); saveSelection() }}
    >
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('bold')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-xs font-bold transition-colors" style={{ color: ed.primary }} title="Bold"><strong>B</strong></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('italic')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-xs transition-colors" style={{ color: ed.primary }} title="Italic"><em>I</em></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('underline')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-xs transition-colors" style={{ color: ed.primary }} title="Underline"><u>U</u></button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('strikeThrough')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-xs transition-colors" style={{ color: ed.primary }} title="Strikethrough"><s>S</s></button>
      <div className="w-px h-4 mx-1" style={{ backgroundColor: `${ed.primary}15` }} />
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('insertUnorderedList')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 transition-colors" style={{ color: ed.primary }} title="Bullet list">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
      </button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('insertOrderedList')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 transition-colors" style={{ color: ed.primary }} title="Numbered list">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zm0 5A.75.75 0 016.75 9h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 9.75zm0 5a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /><text x="2" y="6" fontSize="5" fontWeight="bold" fill="currentColor">1</text><text x="2" y="11" fontSize="5" fontWeight="bold" fill="currentColor">2</text><text x="2" y="16" fontSize="5" fontWeight="bold" fill="currentColor">3</text></svg>
      </button>
      <div className="w-px h-4 mx-1" style={{ backgroundColor: `${ed.primary}15` }} />
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('formatBlock', 'h3')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-[10px] font-bold transition-colors" style={{ color: ed.primary }} title="Heading">H</button>
      <button type="button" onMouseDown={preventFocusLoss} onClick={() => handleFormat('formatBlock', 'blockquote')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-xs transition-colors" style={{ color: ed.primary }} title="Quote">❝</button>
      <div className="w-px h-4 mx-1" style={{ backgroundColor: `${ed.primary}15` }} />
      {/* Color picker */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => setDay8ColorPickerSection(showColorPicker ? null : sectionKey)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-xs font-bold transition-colors relative"
          style={{ color: ed.primary }}
          title="Text colour"
        >
          A
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, #dc2626, #2563eb, #16a34a)' }} />
        </button>
        {showColorPicker && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 grid grid-cols-6 gap-1.5"
            style={{ width: 164 }}
            onMouseDown={preventFocusLoss}
          >
            {COLOR_SWATCHES.map(color => (
              <button
                key={color}
                type="button"
                onMouseDown={preventFocusLoss}
                onClick={() => {
                  handleFormat('foreColor', color)
                  setDay8ColorPickerSection(null)
                }}
                className="w-5 h-5 rounded-full border border-gray-300 hover:scale-125 hover:shadow-md transition-all cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1" />
      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || (!isDirty && !isSaved)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isSaved
            ? 'bg-green-50 text-green-600 border border-green-200'
            : isDirty
              ? 'bg-black text-white hover:bg-gray-800 shadow-sm'
              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
        }`}
        title="Save section"
      >
        {isSaving ? (
          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
        ) : isSaved ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
        )}
        {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
      </button>
    </div>
  )
}

// Parse table content — shared helper
function parseTableRowsHelper(text: string): string[][] {
  const rows: string[][] = []
  for (const line of text.split('\n').filter(l => l.trim())) {
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 2 && !cells.every(c => /^[-:]+$/.test(c))) rows.push(cells)
    } else if (line.includes('\t')) {
      const cells = line.split('\t').map(c => c.trim()).filter(Boolean)
      if (cells.length >= 2) rows.push(cells)
    }
  }
  return rows
}

interface Day8BPTextProps {
  text: string
  sectionKey: string
  day8FocusedEditor: string | null
  day8SavedSection: string | null
  day8SavingSection: string | null
  day8DirtySections: Set<string>
  day8ColorPickerSection: string | null
  setDay8ColorPickerSection: React.Dispatch<React.SetStateAction<string | null>>
  day8EditorHtmlRef: React.MutableRefObject<Record<string, string>>
  formData: Record<string, string>
  metaFields: FieldDef[]
  ideaId: string
  dayNumber: number
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setDay8FocusedEditor: React.Dispatch<React.SetStateAction<string | null>>
  setDay8SavingSection: React.Dispatch<React.SetStateAction<string | null>>
  setDay8SavedSection: React.Dispatch<React.SetStateAction<string | null>>
  setDay8DirtySections: React.Dispatch<React.SetStateAction<Set<string>>>
  fetchState: () => Promise<void>
}

function Day8BPText({
  text, sectionKey,
  day8FocusedEditor, day8SavedSection, day8SavingSection, day8DirtySections,
  day8ColorPickerSection, setDay8ColorPickerSection,
  day8EditorHtmlRef, formData, metaFields, ideaId, dayNumber,
  setFormData, setDay8FocusedEditor, setDay8SavingSection, setDay8SavedSection, setDay8DirtySections, fetchState,
}: Day8BPTextProps) {
  const tableRows = parseTableRowsHelper(text)
  const isFocused = day8FocusedEditor === sectionKey
  const ed = ED_STYLES

  // Initialise the ref HTML from text on first access
  if (day8EditorHtmlRef.current[sectionKey] === undefined) {
    day8EditorHtmlRef.current[sectionKey] = stripMd(text).replace(/\n/g, '<br />')
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Store innerHTML in ref — NOT in state — so React never overwrites formatting
    day8EditorHtmlRef.current[sectionKey] = e.currentTarget.innerHTML || ''
    // Mark dirty via state so save button activates (no formData update here)
    setDay8DirtySections(prev => { const s = new Set(prev); s.add(sectionKey); return s })
    if (day8SavedSection === sectionKey) setDay8SavedSection(null)
  }

  return (
    <div className="relative">
      {/* Floating toolbar popup */}
      <Day8FormatToolbar
        visible={isFocused}
        sectionKey={sectionKey}
        day8SavingSection={day8SavingSection}
        day8SavedSection={day8SavedSection}
        day8DirtySections={day8DirtySections}
        day8ColorPickerSection={day8ColorPickerSection}
        setDay8ColorPickerSection={setDay8ColorPickerSection}
        day8EditorHtmlRef={day8EditorHtmlRef}
        formData={formData}
        metaFields={metaFields}
        ideaId={ideaId}
        dayNumber={dayNumber}
        setFormData={setFormData}
        setDay8SavingSection={setDay8SavingSection}
        setDay8SavedSection={setDay8SavedSection}
        setDay8DirtySections={setDay8DirtySections}
        fetchState={fetchState}
      />

      {/* Editable content */}
      <div
        data-bp-section={sectionKey}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setDay8FocusedEditor(sectionKey)}
        onBlur={() => {
          // Sync current HTML to formData on blur
          const html = day8EditorHtmlRef.current[sectionKey]
          if (html !== undefined) {
            setFormData(prev => ({ ...prev, [sectionKey]: html }))
          }
          setTimeout(() => setDay8FocusedEditor(prev => prev === sectionKey ? null : prev), 150)
        }}
        className="outline-none text-sm leading-[1.9] font-light min-h-[60px] hover:ring-1 hover:ring-gray-200 focus:ring-2 focus:ring-amber-300 rounded-md px-2 py-1 -mx-2 transition-all cursor-text"
        style={{ color: ed.muted, fontFamily: ed.serif }}
        dangerouslySetInnerHTML={{ __html: day8EditorHtmlRef.current[sectionKey] || '' }}
      />

      {/* Table if present */}
      {tableRows.length > 1 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                {tableRows[0].map((h, i) => (
                  <th key={i} className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-3 px-4 text-sm" style={{ color: ci === 0 ? ed.primary : ed.muted, fontWeight: ci === 0 ? 500 : 400 }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface Day8RegenBtnProps {
  sectionKey: string
  day8PageRegenKey: string | null
  handleDay8PageRegen: (sectionKey: string) => void
}

function Day8RegenBtn({ sectionKey, day8PageRegenKey, handleDay8PageRegen }: Day8RegenBtnProps) {
  const ed = ED_STYLES
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleDay8PageRegen(sectionKey) }}
      disabled={day8PageRegenKey === sectionKey}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
      style={{ color: ed.accent, backgroundColor: `${ed.accent}10`, border: `1px solid ${ed.accent}25` }}
      title="Regenerate this section"
    >
      {day8PageRegenKey === sectionKey ? (
        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
      ) : (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
      )}
      {day8PageRegenKey === sectionKey ? 'Regenerating…' : 'Regenerate'}
    </button>
  )
}

export default function DayPage() {
  const { id: ideaId, day } = useParams<{ id: string; day: string }>()
  const dayNumber = parseInt(day, 10)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const meta = dayMeta[dayNumber]

  const [state, setState] = useState<DayState | null>(null)
  const [idea, setIdea] = useState<Record<string, unknown> | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [checklist, setChecklist] = useState<boolean[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prefilled, setPrefilled] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [day8Generating, setDay8Generating] = useState(false)

  // Day 8 business plan page state
  const [day8PageHeroImage, setDay8PageHeroImage] = useState<string>('')
  const [day8PageAssetOpen, setDay8PageAssetOpen] = useState(false)
  const [day8PageAssetSection, setDay8PageAssetSection] = useState('Business Plan Hero')
  const [day8PageRegenKey, setDay8PageRegenKey] = useState<string | null>(null)
  const [day8HeroZoom, setDay8HeroZoom] = useState(1)
  const [day8HeroPos, setDay8HeroPos] = useState({ x: 50, y: 50 }) // percentage-based position
  const [day8HeroDragging, setDay8HeroDragging] = useState(false)
  const [day8HeroDragStart, setDay8HeroDragStart] = useState({ x: 0, y: 0 })
  const [day8HeroAdjusting, setDay8HeroAdjusting] = useState(false)
  const [day8SavingSection, setDay8SavingSection] = useState<string | null>(null)
  const [day8SavedSection, setDay8SavedSection] = useState<string | null>(null)
  const [day8DirtySections, setDay8DirtySections] = useState<Set<string>>(new Set())
  const [day8FocusedEditor, setDay8FocusedEditor] = useState<string | null>(null)
  const [day8CoverTextPos, setDay8CoverTextPos] = useState({ x: 8, y: 40 }) // percentage-based
  const [day8CoverTextDragging, setDay8CoverTextDragging] = useState(false)
  const [day8CoverTextDragStart, setDay8CoverTextDragStart] = useState({ x: 0, y: 0 })
  const [day8CoverTextDragOrigin, setDay8CoverTextDragOrigin] = useState({ x: 8, y: 40 })
  const [day8CoverLabelPos, setDay8CoverLabelPos] = useState({ x: 8, y: 70 }) // percentage-based
  const [day8CoverLabelDragging, setDay8CoverLabelDragging] = useState(false)
  const [day8CoverLabelDragStart, setDay8CoverLabelDragStart] = useState({ x: 0, y: 0 })
  const [day8CoverLabelDragOrigin, setDay8CoverLabelDragOrigin] = useState({ x: 8, y: 70 })

  // Day 8 rich-text editor refs — track live HTML so formatting survives re-renders
  const day8EditorHtmlRef = useRef<Record<string, string>>({})
  const [day8ColorPickerSection, setDay8ColorPickerSection] = useState<string | null>(null)

  // Sync Day 8 hero image / zoom / position from formData on load
  useEffect(() => {
    if (dayNumber !== 8) return
    if (formData.day8CoverImage && !day8PageHeroImage) {
      setDay8PageHeroImage(formData.day8CoverImage)
    }
    if (formData.day8CoverZoom) {
      const z = parseFloat(formData.day8CoverZoom)
      if (!isNaN(z) && z >= 1) setDay8HeroZoom(z)
    }
    if (formData.day8CoverPosX && formData.day8CoverPosY) {
      const px = parseFloat(formData.day8CoverPosX)
      const py = parseFloat(formData.day8CoverPosY)
      if (!isNaN(px) && !isNaN(py)) setDay8HeroPos({ x: px, y: py })
    }
    if (formData.day8CoverTextX && formData.day8CoverTextY) {
      const tx = parseFloat(formData.day8CoverTextX)
      const ty = parseFloat(formData.day8CoverTextY)
      if (!isNaN(tx) && !isNaN(ty)) setDay8CoverTextPos({ x: tx, y: ty })
    }
    if (formData.day8CoverLabelX && formData.day8CoverLabelY) {
      const lx = parseFloat(formData.day8CoverLabelX)
      const ly = parseFloat(formData.day8CoverLabelY)
      if (!isNaN(lx) && !isNaN(ly)) setDay8CoverLabelPos({ x: lx, y: ly })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayNumber, formData.day8CoverImage, formData.day8CoverZoom, formData.day8CoverPosX, formData.day8CoverPosY, formData.day8CoverTextX, formData.day8CoverTextY, formData.day8CoverLabelX, formData.day8CoverLabelY])

  // Day 4 hook-picker state
  const [day4Hooks, setDay4Hooks] = useState<Day4Hook[]>([])
  const [selectedHookIdx, setSelectedHookIdx] = useState<number | null>(null)
  const [editingHook, setEditingHook] = useState(false)
  const [editedHookText, setEditedHookText] = useState('')
  const isDay4HookMode = dayNumber === 4 && day4Hooks.length > 0 && !state?.inputs

  // Day 4 interview form state
  const [day4InterviewForm, setDay4InterviewForm] = useState<Record<string, unknown> | null>(null)
  const [day4Responses, setDay4Responses] = useState<Record<string, unknown>[]>([])
  const [creatingForm, setCreatingForm] = useState(false)
  const [analyzingResponses, setAnalyzingResponses] = useState(false)
  const [day4Research, setDay4Research] = useState<{
    keyFindings?: string
    customerInsights?: string[]
    marketEvidence?: string[]
    willingnessEstimate?: string
    interviewQuestions?: string[]
  } | null>(null)

  // Day 6 launch-plan state
  const [day6Plan, setDay6Plan] = useState<Day6LaunchPlan | null>(null)
  const [day6OutreachCount, setDay6OutreachCount] = useState('')
  const [day6Responses, setDay6Responses] = useState('')
  const [day6Objections, setDay6Objections] = useState('')
  const isDay6LaunchMode = dayNumber === 6 && day6Plan !== null && !state?.inputs

  // Day 7 verdict state
  interface Verdict {
    decision: 'go' | 'pivot' | 'kill'
    confidence: number
    headline: string
    reasoning: string
    nextSteps: string[]
    killConditions: string[]
    generatedAt: string
  }
  interface Report {
    summary: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    overallScore: number
    generatedAt: string
  }
  const [day7Verdict, setDay7Verdict] = useState<Verdict | null>(null)
  const [day7Report, setDay7Report] = useState<Report | null>(null)
  const [day7Generating, setDay7Generating] = useState(false)

  const fetchState = useCallback(async () => {
    // Fetch day state and idea record in parallel
    const [dayRes, ideaRes] = await Promise.all([
      fetch(`/api/days/${dayNumber}?ideaId=${ideaId}`),
      supabase
        .from('ideas')
        .select('id, ai_profile, core_outcome, mvp_type, idea_seed, is_profile_locked, title')
        .eq('id', ideaId)
        .single(),
    ])

    // Store the idea record (always available for downstream use)
    const ideaRow = (ideaRes.data ?? null) as Record<string, unknown> | null
    setIdea(ideaRow)

    if (dayRes.ok) {
      const data: DayState = await dayRes.json()
      setState(data)

      // Always load Day 4 research data from ai_profile (for both prefill and review)
      if (dayNumber === 4 && ideaRow) {
        const prefill4 = getPrefillForDay(4, ideaRow)
        const hooks = prefill4.hooks as Day4Hook[] | undefined
        if (hooks?.length) {
          setDay4Hooks(hooks)
          const recommended = prefill4.chosenHookType as string | undefined
          if (recommended) {
            const idx = hooks.findIndex((h) => h.type === recommended)
            if (idx >= 0) setSelectedHookIdx(idx)
          }
        }
        const kf = prefill4.keyFindings as string | undefined
        const ci = prefill4.customerInsights as string[] | undefined
        const me = prefill4.marketEvidence as string[] | undefined
        const we = prefill4.willingnessEstimate as string | undefined
        const iq = prefill4.interviewQuestions as string[] | undefined
        if (kf || ci?.length || me?.length) {
          setDay4Research({ keyFindings: kf, customerInsights: ci, marketEvidence: me, willingnessEstimate: we, interviewQuestions: iq })
        } else if (!data.inputs) {
          // No research data yet and no inputs saved — auto-trigger draft generation
          setDay4AutoGenerating(true)
          fetch(`/api/idea/${ideaId}/generate-day-draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dayNumber: 4 }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then(() => fetchState())
            .catch(() => {})
            .finally(() => setDay4AutoGenerating(false))
        }
      }

      // Pre-fill form if inputs exist
      // For Day 8/9: if inputs were saved but most fields are empty, auto-trigger AI generation
      // to fill in the blanks (user may have submitted with old 5-field form)
      const day8Fields = ['companyName','missionStatement','visionStatement','elevatorPitch','problemStatement','solutionOverview','targetMarket','marketSize','competitiveLandscape','uniqueValueProp','revenueModel','unitEconomics','financialProjections','fundingRequirements','goToMarket','salesStrategy','marketingPlan','operationsPlan','technologyStack','teamStructure','milestones','riskAnalysis','legalCompliance','exitStrategy','kpis']
      const needsDay8AutoFill = dayNumber === 8 && data.inputs && (() => {
        const filled = day8Fields.filter(k => {
          const v = (data.inputs as Record<string, unknown>)[k]
          return typeof v === 'string' ? v.trim().length > 0 : !!v
        })
        return filled.length < 10 // less than 10 of 25 fields → needs AI fill
      })()

      if (data.inputs && !needsDay8AutoFill) {
        const prefilled: Record<string, string> = {}
        for (const [key, value] of Object.entries(data.inputs)) {
          if (Array.isArray(value)) {
            // Competitors: extract names from objects for plain-text display
            if (key === 'competitors' && value.length > 0 && typeof value[0] === 'object') {
              prefilled[key] = value.map((c: Record<string, unknown>) => String(c.name ?? '')).filter(Boolean).join('\n')
            } else if (value.length > 0 && typeof value[0] === 'object') {
              prefilled[key] = JSON.stringify(value, null, 2)
            } else {
              prefilled[key] = value.join('\n')
            }
          } else if (typeof value === 'object' && value !== null) {
            prefilled[key] = JSON.stringify(value, null, 2)
          } else {
            prefilled[key] = String(value)
          }
        }
        // Strip markdown asterisks from all loaded values
        for (const key of Object.keys(prefilled)) {
          if (typeof prefilled[key] === 'string') prefilled[key] = stripMd(prefilled[key])
        }
        setFormData(prefilled)
      } else if ((dayNumber >= 1 && dayNumber <= 6) || dayNumber === 8 || dayNumber === 9 || dayNumber === 10) {
        // No inputs yet — prefill from ai_profile drafts via getPrefillForDay
        const prefill = getPrefillForDay(dayNumber, ideaRow)
        const profile = ideaRow?.ai_profile as Record<string, unknown> | null

        if (Object.keys(prefill).length > 0) {
          // Convert structured prefill to form-field strings for the generic form
          const draft = prefillToFormStrings(dayNumber, prefill)
          if (Object.keys(draft).length > 0) setPrefilled(true)
          setFormData((prev) => ({ ...prev, ...draft }))

          // Day 4 hooks/research already loaded above — just prefill form fields
          if (dayNumber === 4) {
            const we = prefill.willingnessEstimate as string | undefined
            if (we) setFormData((prev) => ({ ...prev, willingness: we }))
            const kf = prefill.keyFindings as string | undefined
            if (kf) setFormData((prev) => ({ ...prev, keyFindings: kf }))
            setPrefilled(true)
          }

          // Day 6: load launch plan for launch-mode UI
          if (dayNumber === 6 && profile) {
            const d6 = profile.day6 as
              | { launchChannels?: string[]; recommendedTouchCount?: number; outreachScripts?: string[] }
              | undefined
            const legacy = profile.day6LaunchPlan as Day6LaunchPlan | undefined

            if (d6?.launchChannels?.length) {
              setDay6Plan({
                launchChannels: d6.launchChannels,
                recommendedTouchCount: d6.recommendedTouchCount ?? 50,
                outreachScriptDrafts: d6.outreachScripts ?? [],
                outreachScripts: d6.outreachScripts ?? [],
              })
              setDay6OutreachCount(String(prefill.outreachCount ?? d6.recommendedTouchCount ?? 50))
            } else if (legacy?.launchChannels?.length) {
              setDay6Plan(legacy)
              setDay6OutreachCount(String(prefill.outreachCount ?? legacy.recommendedTouchCount ?? 50))
            }
            setPrefilled(true)
          }
        } else if ((dayNumber === 8 || dayNumber === 9 || dayNumber === 10) && (!data.inputs || needsDay8AutoFill)) {
          // No prefill data yet for day 8/9 — auto-trigger draft generation
          // Preserve any existing user inputs while generating
          if (needsDay8AutoFill && data.inputs) {
            const existing: Record<string, string> = {}
            for (const [k, v] of Object.entries(data.inputs)) {
              if (typeof v === 'string' && v.trim()) existing[k] = v
            }
            if (Object.keys(existing).length > 0) setFormData(existing)
          }
          if (dayNumber === 8) {
            triggerDay8Generate()
          } else if (dayNumber === 10) {
            // Day 10: auto-generate landing page content
            fetch(`/api/idea/${ideaId}/generate-day-draft`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dayNumber: 10 }),
            })
              .then((r) => (r.ok ? r.json() : null))
              .then(() => fetchState())
              .catch(() => {})
          } else {
            fetch(`/api/idea/${ideaId}/generate-day-draft`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dayNumber }),
            })
              .then((r) => (r.ok ? r.json() : null))
              .then(() => fetchState())
              .catch(() => {})
          }
        }
      }
    }
    setLoading(false)
  }, [ideaId, dayNumber, supabase])

  // Day 4: auto-generate research data if not present, and auto-create interview form
  const [day4AutoGenerating, setDay4AutoGenerating] = useState(false)

  useEffect(() => {
    if (meta) {
      setChecklist(new Array(meta.tasks.length).fill(false))
      fetchState()
    }
    // Day 4: load or auto-create interview form
    if (dayNumber === 4 && ideaId) {
      fetch(`/api/idea/${ideaId}/interview-form`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.form) {
            setDay4InterviewForm(data.form)
            setDay4Responses(data.responses ?? [])
          } else {
            // Auto-create interview form in background
            fetch(`/api/idea/${ideaId}/interview-form`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ideaId }),
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((created) => {
                if (created?.form) {
                  setDay4InterviewForm(created.form)
                }
              })
              .catch(() => {})
          }
        })
        .catch(() => {})
    }
    // Day 7: auto-generate verdict and report
    if (dayNumber === 7 && ideaId) {
      // Fetch existing verdict/report first
      Promise.all([
        fetch(`/api/idea/${ideaId}/verdict`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/idea/${ideaId}/report`).then((r) => (r.ok ? r.json() : null)),
      ]).then(([verdictData, reportData]) => {
        if (verdictData?.verdict) {
          setDay7Verdict(verdictData.verdict)
        }
        if (reportData?.report) {
          setDay7Report(reportData.report)
        }
        // Auto-generate if neither exists
        if (!verdictData?.verdict && !reportData?.report) {
          setDay7Generating(true)
          // Generate report first, then verdict
          fetch(`/api/idea/${ideaId}/report`, { method: 'POST' })
            .then((r) => (r.ok ? r.json() : null))
            .then((rData) => {
              if (rData?.report) setDay7Report(rData.report)
              return fetch(`/api/idea/${ideaId}/verdict`, { method: 'POST' })
            })
            .then((r) => (r && r.ok ? r.json() : null))
            .then((vData) => {
              if (vData?.verdict) setDay7Verdict(vData.verdict)
            })
            .catch((err) => {
              console.error('Day 7 auto-generation failed:', err)
              setError('Failed to generate verdict. Try regenerating.')
            })
            .finally(() => setDay7Generating(false))
        }
      })
    }
  }, [meta, fetchState, dayNumber, ideaId])

  if (!meta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Invalid day.</p>
      </div>
    )
  }

  function parseFieldValue(field: FieldDef, raw: string): unknown {
    if (field.type === 'textarea-list') {
      const items = raw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      // Day 2 competitors: convert plain names into {name, strengths, weaknesses} objects
      if (field.name === 'competitors') {
        return items.map((name) => ({ name, strengths: '', weaknesses: '' }))
      }
      return items
    }
    if (field.type === 'textarea-json') {
      try {
        return JSON.parse(raw)
      } catch {
        return [{ name: raw, strengths: '', weaknesses: '' }]
      }
    }
    if (field.type === 'number') return Number(raw)
    if (field.name === 'pivotNeeded') return raw === 'true'
    return raw
  }

  // Day 6 launch-mode submit: send structured launch data
  async function handleDay6LaunchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const channels = day6Plan?.launchChannels ?? []
    const scripts = day6Plan?.outreachScripts ?? day6Plan?.outreachScriptDrafts ?? []
    const responseLines = day6Responses.split('\n').map((s) => s.trim()).filter(Boolean)
    const objectionLines = day6Objections.split('\n').map((s) => s.trim()).filter(Boolean)
    const count = Number(day6OutreachCount) || 0

    const body: Record<string, unknown> = {
      ideaId,
      launchChannels: channels,
      outreachCount: count,
      outreachScripts: scripts,
      responses: responseLines,
      objections: objectionLines,
    }

    const res = await fetch(`/api/days/${dayNumber}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Submission failed.')
      setSubmitting(false)
      return
    }

    await fetchState()
    setSubmitting(false)
  }

  // Day 4 hook-picker submit: store chosenHookType + chosenHookText
  async function handleDay4HookSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedHookIdx === null) {
      setError('Pick a messaging hook to continue.')
      return
    }
    setSubmitting(true)
    setError(null)

    const hook = day4Hooks[selectedHookIdx]
    const finalText = editingHook ? editedHookText : hook.text

    const body: Record<string, unknown> = {
      ideaId,
      chosenHookType: hook.type,
      chosenHookText: finalText,
      interviewCount: Number(formData.interviewCount || '0'),
      willingness: formData.willingness || 'somewhat',
      pivotNeeded: formData.pivotNeeded === 'true',
    }
    if (formData.customerQuotes?.trim()) {
      body.customerQuotes = formData.customerQuotes.split('\n').map((s) => s.trim()).filter(Boolean)
    }
    if (formData.pivotDetails?.trim()) body.pivotDetails = formData.pivotDetails

    const res = await fetch(`/api/days/${dayNumber}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Submission failed.')
      setSubmitting(false)
      return
    }

    await fetchState()
    setSubmitting(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const body: Record<string, unknown> = { ideaId }
    for (const field of meta.fields) {
      const raw = formData[field.name] ?? ''
      if (field.required && !raw.trim()) {
        setError(`${field.label} is required.`)
        setSubmitting(false)
        return
      }
      if (raw.trim()) {
        body[field.name] = parseFieldValue(field, raw)
      }
    }

    const res = await fetch(`/api/days/${dayNumber}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Submission failed.')
      setSubmitting(false)
      return
    }

    await fetchState()
    setSubmitting(false)
  }

  async function handleComplete() {
    setCompleting(true)
    setError(null)

    const res = await fetch(`/api/idea/${ideaId}/complete/${dayNumber}`, {
      method: 'POST',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Could not complete day.')
      setCompleting(false)
      return
    }

    await fetchState()
    setCompleting(false)
  }

  // Day 8: per-section regeneration at page level
  async function handleDay8PageRegen(sectionKey: string) {
    setDay8PageRegenKey(sectionKey)
    try {
      const res = await fetch(`/api/idea/${ideaId}/regen-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, currentContent: formData[sectionKey] || '', dayNumber: 8 }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.content) {
          // Update local formData with the regenerated content
          setFormData(prev => {
            const next = { ...prev, [sectionKey]: data.content }
            // Persist all fields to day_inputs so fetchState won't overwrite
            const body: Record<string, unknown> = { ideaId }
            for (const field of meta.fields) {
              const raw = next[field.name] ?? ''
              if (raw.trim()) body[field.name] = raw
            }
            fetch(`/api/days/${dayNumber}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }).catch(() => {})
            return next
          })
        }
      }
    } catch { /* ignore */ } finally {
      setDay8PageRegenKey(null)
    }
  }

  // Day 8: asset library selection at page level
  function handleDay8PageAssetSelect(url: string) {
    setDay8PageHeroImage(url)
    setDay8PageAssetOpen(false)
    // Persist into formData so it survives page navigation
    setFormData(prev => {
      const next: Record<string, string> = { ...prev, day8CoverImage: url }
      // Immediately save to database so image persists across page visits
      const body: Record<string, unknown> = { ideaId }
      for (const field of meta.fields) {
        const raw = next[field.name] ?? ''
        if (raw.trim()) body[field.name] = raw
      }
      fetch(`/api/days/${dayNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {})
      return next
    })
    // Save to library
    fetch(`/api/idea/${ideaId}/library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: day8PageAssetSection, url }),
    }).catch(() => {})
  }

  // Day 8: dedicated AI generation function with visible state & error handling
  // Helper: persist all current Day 8 form fields to the database
  function persistDay8Fields(overrides?: Record<string, string>) {
    const body: Record<string, unknown> = { ideaId }
    for (const field of meta.fields) {
      const raw = overrides?.[field.name] ?? formData[field.name] ?? ''
      if (raw.trim()) body[field.name] = raw
    }
    fetch(`/api/days/${dayNumber}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }

  async function triggerDay8Generate() {
    setDay8Generating(true)
    setError(null)
    try {
      const res = await fetch(`/api/idea/${ideaId}/generate-day-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDay: 8 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? 'Failed to generate business plan. Please try again.')
        setDay8Generating(false)
        return
      }
      const draft = await res.json()
      if (draft && typeof draft === 'object') {
        // Directly populate form fields from the AI draft
        const mapped: Record<string, string> = {}
        for (const [key, value] of Object.entries(draft)) {
          if (typeof value === 'string') mapped[key] = value
          else if (Array.isArray(value)) mapped[key] = value.join('\n')
          else if (value != null) mapped[key] = String(value)
        }
        // Merge: AI fills empty fields, but user's existing entries take priority
        setFormData((prev) => {
          const merged = { ...mapped }
          for (const [k, v] of Object.entries(prev)) {
            if (v && v.trim()) merged[k] = v
          }
          return merged
        })
        setPrefilled(true)
      } else {
        setError('AI generation returned empty. Please try again.')
      }
    } catch {
      setError('Network error generating business plan. Please try again.')
    } finally {
      setDay8Generating(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/idea/${ideaId}/generate-day-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error?.message ?? err.error ?? 'Failed to recalibrate analysis.')
        return
      }
      // Re-fetch state to load updated ai_profile drafts into the form
      await fetchState()
    } finally {
      setRegenerating(false)
    }
  }

  async function handleCreateInterviewForm() {
    setCreatingForm(true)
    setError(null)
    try {
      const res = await fetch(`/api/idea/${ideaId}/interview-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error?.message ?? err.error ?? 'Failed to create interview form.')
        return
      }
      const data = await res.json()
      setDay4InterviewForm(data.form)
    } finally {
      setCreatingForm(false)
    }
  }

  async function handleAnalyzeResponses() {
    setAnalyzingResponses(true)
    setError(null)
    try {
      const res = await fetch(`/api/idea/${ideaId}/interview-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error?.message ?? err.error ?? 'Failed to analyze responses.')
        return
      }
      // Re-fetch everything to load the enriched Day 4 data
      await fetchState()
      // Refresh interview data
      const formRes = await fetch(`/api/idea/${ideaId}/interview-form`)
      if (formRes.ok) {
        const data = await formRes.json()
        if (data?.form) {
          setDay4InterviewForm(data.form)
          setDay4Responses(data.responses ?? [])
        }
      }
    } finally {
      setAnalyzingResponses(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (state?.locked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-4">
          <div className="w-14 h-14 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Phase {dayNumber} is locked.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            The validation framework follows a sequential methodology. Each phase builds upon the findings
            of the previous one. Proceeding out of sequence compromises analytical integrity.
          </p>
          <p className="text-xs text-gray-400">
            Complete the previous sub-phase to unlock this step.
          </p>
          <button
            onClick={() => router.push(`/app/idea/${ideaId}`)}
            className="text-sm text-gray-900 font-medium hover:underline"
          >
            ← Back to overview
          </button>
        </div>
      </div>
    )
  }

  const canComplete = dayNumber === 7
    ? state?.inputs && day7Verdict && !state?.completed
    : state?.inputs && state?.aiOutputs && !state?.completed

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/app/idea/${ideaId}`)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-bold">{(() => { const idx = getSubPhaseIndices(dayNumber); return idx ? `${idx.phaseIndex + 1}.${idx.subPhaseIndex + 1}` : dayNumber })()}: {meta.title}</h1>
            <p className="text-sm text-gray-500">{meta.description}</p>
          </div>
          {state?.completed && (
            <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
              ✓ Completed · Editable
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Day intro */}
        <section className="bg-gray-900 text-white rounded-lg p-5">
          <p className="text-sm leading-relaxed">{meta.intro}</p>
        </section>

        {/* Tasks checklist */}
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Checklist</h2>
          <div className="space-y-2">
            {meta.tasks.map((task, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist[i] ?? false}
                  onChange={() => {
                    const next = [...checklist]
                    next[i] = !next[i]
                    setChecklist(next)
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <span className={`text-sm ${checklist[i] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {task}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Day 7: Auto-generated Verdict */}
        {dayNumber === 7 && (
          <>
            {/* Generating indicator */}
            {day7Generating && (
              <section className="bg-gray-900 rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-3xl">⚖️</span>
                </div>
                <h2 className="font-bold text-white text-lg mb-2">Generating Strategic Recommendation...</h2>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  Synthesising six phases of evidence — market intelligence, competitive analysis, customer validation, and financial modelling — into your strategic recommendation. This may take a moment.
                </p>
              </section>
            )}

            {/* Verdict display */}
            {day7Verdict && (
              <section className="space-y-5">
                {/* Decision card */}
                <div className={`rounded-xl border-2 p-8 text-center ${
                  day7Verdict.decision === 'go' ? 'bg-green-50 border-green-300' :
                  day7Verdict.decision === 'pivot' ? 'bg-yellow-50 border-yellow-300' :
                  'bg-red-50 border-red-300'
                }`}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-60">Final Verdict</p>
                  <p className={`text-5xl font-black uppercase ${
                    day7Verdict.decision === 'go' ? 'text-green-700' :
                    day7Verdict.decision === 'pivot' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>{day7Verdict.decision}</p>
                  <div className="mt-3 inline-flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          day7Verdict.decision === 'go' ? 'bg-green-500' :
                          day7Verdict.decision === 'pivot' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.round(day7Verdict.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium opacity-70">{Math.round(day7Verdict.confidence * 100)}% confidence</span>
                  </div>
                </div>

                {/* Headline & reasoning */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{day7Verdict.headline}</h2>
                  <p className="text-gray-700 leading-relaxed">{day7Verdict.reasoning}</p>
                </div>

                {/* Next Steps */}
                {day7Verdict.nextSteps?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="font-semibold text-gray-900 mb-3">Next Steps</h2>
                    <ol className="space-y-3">
                      {day7Verdict.nextSteps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-gray-700">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Kill Conditions */}
                {day7Verdict.killConditions?.length > 0 && (
                  <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                    <h2 className="font-semibold text-red-800 mb-3">⚠ Kill Conditions — Stop If:</h2>
                    <ul className="space-y-2">
                      {day7Verdict.killConditions.map((kc, i) => (
                        <li key={i} className="flex gap-2.5 text-red-700 text-sm">
                          <span className="flex-shrink-0 mt-0.5">✕</span>
                          <span className="leading-relaxed">{kc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Report display */}
            {day7Report && (
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-xl">📋</span>
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-base">Validation Report</h2>
                      <p className="text-xs text-white/80">7-day evidence summary</p>
                    </div>
                    {day7Report.overallScore != null && (
                      <div className="ml-auto text-center">
                        <p className="text-2xl font-black text-white">{day7Report.overallScore}<span className="text-sm font-normal text-white/60">/10</span></p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {day7Report.summary && (
                    <p className="text-gray-700 leading-relaxed">{day7Report.summary}</p>
                  )}
                  {day7Report.strengths?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Strengths</h3>
                      <ul className="space-y-1.5">
                        {day7Report.strengths.map((s, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-green-500 flex-shrink-0">✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {day7Report.weaknesses?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Weaknesses</h3>
                      <ul className="space-y-1.5">
                        {day7Report.weaknesses.map((w, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-red-400 flex-shrink-0">✕</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {day7Report.recommendations?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommendations</h3>
                      <ul className="space-y-1.5">
                        {day7Report.recommendations.map((r, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-blue-400 flex-shrink-0">→</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Regenerate verdict button */}
            {(day7Verdict || day7Report) && !day7Generating && (
              <button
                type="button"
                onClick={async () => {
                  setDay7Generating(true)
                  setError(null)
                  try {
                    const [reportRes, verdictRes] = await Promise.all([
                      fetch(`/api/idea/${ideaId}/report`, { method: 'POST' }),
                      fetch(`/api/idea/${ideaId}/verdict`, { method: 'POST' }),
                    ])
                    if (reportRes.ok) {
                      const rData = await reportRes.json()
                      if (rData?.report) setDay7Report(rData.report)
                    }
                    if (verdictRes.ok) {
                      const vData = await verdictRes.json()
                      if (vData?.verdict) setDay7Verdict(vData.verdict)
                    }
                  } catch {
                    setError('Failed to regenerate. Please try again.')
                  } finally {
                    setDay7Generating(false)
                  }
                }}
                disabled={day7Generating}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Regenerate Verdict & Report
              </button>
            )}

            {/* No verdict and not generating — manual trigger */}
            {!day7Verdict && !day7Generating && (
              <section className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚖️</span>
                </div>
                <h2 className="font-semibold text-gray-900 mb-2">Ready to generate your verdict</h2>
                <p className="text-sm text-gray-500 mb-4">All evidence from Days 1–6 will be analysed to produce your final verdict.</p>
                <button
                  onClick={async () => {
                    setDay7Generating(true)
                    setError(null)
                    try {
                      const reportRes = await fetch(`/api/idea/${ideaId}/report`, { method: 'POST' })
                      if (reportRes.ok) {
                        const rData = await reportRes.json()
                        if (rData?.report) setDay7Report(rData.report)
                      }
                      const verdictRes = await fetch(`/api/idea/${ideaId}/verdict`, { method: 'POST' })
                      if (verdictRes.ok) {
                        const vData = await verdictRes.json()
                        if (vData?.verdict) setDay7Verdict(vData.verdict)
                      }
                    } catch {
                      setError('Failed to generate verdict. Please try again.')
                    } finally {
                      setDay7Generating(false)
                    }
                  }}
                  className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Generate Final Verdict
                </button>
              </section>
            )}
          </>
        )}

        {/* Day 4: Auto-generating research indicator */}
        {dayNumber === 4 && day4AutoGenerating && !state?.inputs && (
          <section className="bg-purple-50 rounded-lg border border-purple-200 p-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-lg">🔬</span>
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Researching your idea...</h2>
            <p className="text-sm text-gray-500">
              Analysing publicly available data — forums, reviews, research papers — to pre-validate your idea. This may take a moment.
            </p>
          </section>
        )}

        {/* Day 4: Auto-Research Findings (from AI analysis of public data) */}
        {dayNumber === 4 && day4Research && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">AI Research Findings</h2>
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 font-medium">
                Auto-researched
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Publicly available data — forums, reviews, research papers, and industry reports — was analysed to pre-validate your idea.
            </p>

            {day4Research.keyFindings && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Key Findings</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{day4Research.keyFindings}</p>
              </div>
            )}

            {day4Research.customerInsights && day4Research.customerInsights.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer Insights</h3>
                <ul className="space-y-1">
                  {day4Research.customerInsights.map((insight, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-purple-400 shrink-0">&#x2022;</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {day4Research.marketEvidence && day4Research.marketEvidence.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Evidence Sources</h3>
                <ul className="space-y-1">
                  {day4Research.marketEvidence.map((evidence, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-gray-300 shrink-0">{i + 1}.</span>
                      {evidence}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {day4Research.willingnessEstimate && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Estimated Willingness to Pay</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  day4Research.willingnessEstimate === 'eager' ? 'bg-green-100 text-green-700' :
                  day4Research.willingnessEstimate === 'very_willing' ? 'bg-green-50 text-green-600' :
                  day4Research.willingnessEstimate === 'somewhat' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-600'
                }`}>
                  {day4Research.willingnessEstimate.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {day4Research.interviewQuestions && day4Research.interviewQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recommended Interview Questions</h3>
                <p className="text-xs text-gray-400 mb-2">Use these for direct customer conversations, or deploy via the shareable interview form below.</p>
                <ol className="space-y-1">
                  {day4Research.interviewQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-gray-400 shrink-0 font-medium">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {/* Day 4: Interview Form Management (Optional) */}
        {dayNumber === 4 && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900">Customer Research Form</h2>
              <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5 font-medium">
                Optional
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Strengthen your validation with primary research. Share this form with prospective customers to gather direct market intelligence. Questions are auto-generated based on your venture profile.
            </p>

            {!day4InterviewForm ? (
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 text-center">
                <div className="w-8 h-8 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-sm">📝</span>
                </div>
                <p className="text-sm text-gray-400">Generating research form...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prominent share link */}
                <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                  <h3 className="text-sm font-semibold text-purple-900 mb-2">Distribute to prospective customers</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/interview/${(day4InterviewForm as Record<string, unknown>).share_token}`}
                      className="flex-1 rounded-md border border-purple-300 px-3 py-2 text-sm bg-white text-gray-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/interview/${(day4InterviewForm as Record<string, unknown>).share_token}`
                        navigator.clipboard.writeText(url)
                      }}
                      className="shrink-0 rounded-md bg-purple-600 px-4 py-2 text-sm text-white font-medium hover:bg-purple-700 transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    Distribute to prospects, industry contacts, or relevant communities. Anyone with this link can respond.
                  </p>
                </div>

                {/* Response count */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responses</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{day4Responses.length}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/idea/${ideaId}/interview-form`)
                        if (res.ok) {
                          const data = await res.json()
                          if (data?.form) {
                            setDay4InterviewForm(data.form)
                            setDay4Responses(data.responses ?? [])
                          }
                        }
                      }}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Refresh
                    </button>
                    {day4Responses.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAnalyzeResponses}
                        disabled={analyzingResponses}
                        className="rounded-md bg-black px-4 py-2 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                      >
                        {analyzingResponses ? 'Processing...' : 'Analyse Responses & Update Fields'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Response list */}
                {day4Responses.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Responses</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {day4Responses.slice(0, 10).map((r, i) => {
                        const resp = r as Record<string, unknown>
                        return (
                          <div key={i} className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">
                                {(resp.respondent_name as string) || `Respondent ${i + 1}`}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(resp.submitted_at as string).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {((resp.answers as Array<Record<string, unknown>>)?.length ?? 0)} answers
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Day 4 Hook Picker (when hooks are available and no inputs saved yet) */}
        {isDay4HookMode && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Choose Your Messaging Hook</h2>
            <p className="text-sm text-gray-500 mb-1">
              3 hooks were generated from your idea profile. Pick the one that resonates most — this will frame your customer conversations.
            </p>
            {prefilled && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">Phoxta prefilled this from your idea. Edit only if necessary.</p>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs text-gray-900 hover:text-black font-medium disabled:opacity-50 shrink-0 ml-2"
                >
                  {regenerating ? '↻ Regenerating...' : '↻ Regenerate'}
                </button>
              </div>
            )}

            <form onSubmit={handleDay4HookSubmit} className="space-y-4">
              {/* Hook cards */}
              <div className="space-y-3">
                {day4Hooks.map((hook, i) => {
                  const style = HOOK_TYPE_STYLES[hook.type] ?? HOOK_TYPE_STYLES.pain
                  const selected = selectedHookIdx === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedHookIdx(i)
                        setEditedHookText(hook.text)
                        setEditingHook(false)
                      }}
                      className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                        selected
                          ? 'border-gray-900 ring-1 ring-gray-900'
                          : `${style.bg} border hover:border-gray-400`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
                          {style.label}
                        </span>
                        {selected && (
                          <span className="ml-auto text-xs font-medium text-gray-900">Selected</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{stripMd(hook.text)}</p>
                    </button>
                  )
                })}
              </div>

              {/* Edit hook (optional) */}
              {selectedHookIdx !== null && (
                <div>
                  {!editingHook ? (
                    <button
                      type="button"
                      onClick={() => setEditingHook(true)}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Edit hook text
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">Customise hook</label>
                      <AutoResizeTextarea
                        minRows={2}
                        value={editedHookText}
                        onChange={(e) => setEditedHookText(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingHook(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Done editing
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Minimal Day 4 fields */}
              <hr className="border-gray-100" />
              <p className="text-xs text-gray-400">AI research has pre-filled these fields. Adjust if you have additional data from real interviews.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data Points Analysed</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.interviewCount ?? '0'}
                    onChange={(e) => setFormData({ ...formData, interviewCount: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Willingness to Pay</label>
                  <select
                    value={formData.willingness ?? 'somewhat'}
                    onChange={(e) => setFormData({ ...formData, willingness: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="not_willing">Not willing</option>
                    <option value="somewhat">Somewhat</option>
                    <option value="very_willing">Very willing</option>
                    <option value="eager">Eager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pivot Needed?</label>
                <select
                  value={formData.pivotNeeded ?? 'false'}
                  onChange={(e) => setFormData({ ...formData, pivotNeeded: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || selectedHookIdx === null}
                className="w-full rounded-md bg-black px-4 py-2 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? 'Running Analysis...' : 'Run Analysis'}
              </button>
            </form>
          </section>
        )}

        {/* Day 6 Launch Mode (when launch plan exists and no inputs saved yet) */}
        {isDay6LaunchMode && day6Plan && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Launch Plan & Outreach</h2>
            <p className="text-sm text-gray-500 mb-1">
              Phoxta drafted a launch plan from your profile. Review the scripts, then record your actual outreach results below.
            </p>
            {prefilled && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">Phoxta prefilled this from your idea. Edit only if necessary.</p>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs text-gray-900 hover:text-black font-medium disabled:opacity-50 shrink-0 ml-2"
                >
                  {regenerating ? '↻ Regenerating...' : '↻ Regenerate'}
                </button>
              </div>
            )}

            {/* Channels */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Launch Channels</h3>
              <div className="flex flex-wrap gap-2">
                {day6Plan.launchChannels.map((ch, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium">
                    {ch.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Scripts with copy buttons */}
            {(day6Plan.outreachScripts ?? day6Plan.outreachScriptDrafts).length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Outreach Scripts</h3>
                <div className="space-y-2">
                  {(day6Plan.outreachScripts ?? day6Plan.outreachScriptDrafts).map((script, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-gray-400 mt-0.5 shrink-0">#{i + 1}</span>
                        <p className="text-sm text-gray-700 leading-relaxed flex-1">{script}</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(script)
                          }}
                          className="shrink-0 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 transition-colors"
                          title="Copy to clipboard"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-gray-100 my-4" />

            {/* Outreach form */}
            <form onSubmit={handleDay6LaunchSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  People Contacted <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">
                  Recommended: {day6Plan.recommendedTouchCount} people
                </p>
                <input
                  type="number"
                  min={0}
                  value={day6OutreachCount}
                  onChange={(e) => setDay6OutreachCount(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responses Received
                </label>
                <p className="text-xs text-gray-400 mb-1">One response per line — quote or summarise what people said.</p>
                <AutoResizeTextarea
                  minRows={3}
                  value={day6Responses}
                  onChange={(e) => setDay6Responses(e.target.value)}
                  placeholder={"\"Looks interesting, I'd try it\"\n\"Not sure I need this\"\n\"How is this different from X?\""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objections & Pushback
                </label>
                <p className="text-xs text-gray-400 mb-1">One objection per line — what made people hesitate or say no.</p>
                <AutoResizeTextarea
                  minRows={3}
                  value={day6Objections}
                  onChange={(e) => setDay6Objections(e.target.value)}
                  placeholder={"Too expensive\nAlready using a competitor\nNot sure it works for my niche"}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !day6OutreachCount.trim()}
                className="w-full rounded-md bg-black px-4 py-2 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? 'Running Analysis...' : 'Run Analysis'}
              </button>
            </form>
          </section>
        )}

        {/* ===================== Day 8: Business Plan — Editorial Landing Page ===================== */}
        {dayNumber === 8 && (
          <section className="-mx-4 sm:-mx-6 md:-mx-8">
            {/* Generating indicator */}
            {day8Generating && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center mx-4 sm:mx-6 md:mx-8 mb-4">
                <div className="w-14 h-14 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-2xl animate-pulse">📑</span>
                </div>
                <p className="font-semibold text-gray-900">Generating your business plan...</p>
                <p className="text-sm text-gray-500 mt-1">AI is building a comprehensive plan from your validation data. This may take up to a minute.</p>
                <div className="mt-3 flex justify-center">
                  <div className="h-1.5 w-48 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full animate-pulse" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Generate button when no data */}
            {!state?.inputs && !prefilled && !day8Generating && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center mx-4 sm:mx-6 md:mx-8 mb-4">
                <div className="w-14 h-14 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-2xl">📑</span>
                </div>
                <p className="font-semibold text-gray-900">Ready to generate your business plan</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">AI will create a comprehensive plan from all your validation data.</p>
                <button
                  onClick={triggerDay8Generate}
                  className="px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all shadow-md"
                >
                  🚀 Generate Business Plan with AI
                </button>
              </div>
            )}

            {/* ===== Editorial Business Plan Landing Page ===== */}
            {(prefilled || state?.inputs) && !day8Generating && (() => {
              const bp = formData
              const companyName = bp.companyName || 'Business Plan'
              const ed = ED_STYLES

              // Extract numbers
              const extractNums = (text: string) => {
                const results: { label: string; value: number; unit: string }[] = []
                const pats = [
                  { pattern: /(?:TAM|Total Addressable Market)[:\s]*[£$]?([\d,.]+)\s*(billion|million|B|M|bn|mn|K|k)/gi, label: 'TAM' },
                  { pattern: /(?:SAM|Serviceable Addressable Market)[:\s]*[£$]?([\d,.]+)\s*(billion|million|B|M|bn|mn|K|k)/gi, label: 'SAM' },
                  { pattern: /(?:SOM|Serviceable Obtainable Market)[:\s]*[£$]?([\d,.]+)\s*(billion|million|B|M|bn|mn|K|k)/gi, label: 'SOM' },
                  { pattern: /(?:CAC|Customer Acquisition Cost)[:\s]*[£$]?([\d,.]+)/gi, label: 'CAC' },
                  { pattern: /(?:LTV|Lifetime Value|CLV)[:\s]*[£$]?([\d,.]+)/gi, label: 'LTV' },
                  { pattern: /(?:ARPU)[:\s]*[£$]?([\d,.]+)/gi, label: 'ARPU' },
                  { pattern: /(?:MRR|Monthly Recurring Revenue)[:\s]*[£$]?([\d,.]+)/gi, label: 'MRR' },
                  { pattern: /(?:Gross Margin|Margin)[:\s]*([\d,.]+)%/gi, label: 'Margin' },
                ]
                pats.forEach(({ pattern, label }) => {
                  const m = pattern.exec(text)
                  if (m) results.push({ label, value: parseFloat(m[1].replace(/,/g, '')), unit: m[2] ? m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase() : label === 'Margin' ? '%' : '' })
                })
                return results
              }

              // Shared props for Day8 stable components
              const day8SharedProps = {
                day8SavingSection, day8SavedSection, day8DirtySections,
                day8ColorPickerSection, setDay8ColorPickerSection,
                day8EditorHtmlRef, formData, metaFields: meta.fields,
                ideaId, dayNumber,
                setFormData, setDay8SavingSection, setDay8SavedSection, setDay8DirtySections, fetchState,
              }

              // Section definitions
              type BPCat = 'vision' | 'market' | 'product' | 'finance' | 'strategy' | 'operations' | 'risk'
              const bpSections: { key: string; icon: string; label: string; category: BPCat }[] = [
                { key: 'missionStatement', icon: '🎯', label: 'Mission Statement', category: 'vision' },
                { key: 'visionStatement', icon: '🔭', label: 'Vision Statement', category: 'vision' },
                { key: 'elevatorPitch', icon: '🚀', label: 'Elevator Pitch', category: 'vision' },
                { key: 'problemStatement', icon: '⚡', label: 'Problem Statement', category: 'product' },
                { key: 'solutionOverview', icon: '💡', label: 'Solution Overview', category: 'product' },
                { key: 'uniqueValueProp', icon: '💎', label: 'Unique Value Proposition', category: 'product' },
                { key: 'targetMarket', icon: '👥', label: 'Target Market & Segments', category: 'market' },
                { key: 'marketSize', icon: '📊', label: 'Market Size (TAM/SAM/SOM)', category: 'market' },
                { key: 'competitiveLandscape', icon: '⚔️', label: 'Competitive Landscape', category: 'market' },
                { key: 'revenueModel', icon: '💳', label: 'Revenue Model & Pricing', category: 'finance' },
                { key: 'unitEconomics', icon: '📐', label: 'Unit Economics', category: 'finance' },
                { key: 'financialProjections', icon: '💰', label: 'Financial Projections', category: 'finance' },
                { key: 'fundingRequirements', icon: '🏦', label: 'Funding & Use of Funds', category: 'finance' },
                { key: 'goToMarket', icon: '🗺️', label: 'Go-to-Market Strategy', category: 'strategy' },
                { key: 'salesStrategy', icon: '🤝', label: 'Sales & Distribution', category: 'strategy' },
                { key: 'marketingPlan', icon: '📣', label: 'Marketing Plan', category: 'strategy' },
                { key: 'operationsPlan', icon: '⚙️', label: 'Operations Plan', category: 'operations' },
                { key: 'technologyStack', icon: '🖥️', label: 'Technology & Roadmap', category: 'operations' },
                { key: 'teamStructure', icon: '👔', label: 'Team & Key Hires', category: 'operations' },
                { key: 'milestones', icon: '🏁', label: '12-Month Roadmap', category: 'operations' },
                { key: 'riskAnalysis', icon: '🛡️', label: 'Risk Analysis', category: 'risk' },
                { key: 'legalCompliance', icon: '⚖️', label: 'Legal & Compliance', category: 'risk' },
                { key: 'exitStrategy', icon: '🚪', label: 'Exit Strategy', category: 'risk' },
                { key: 'kpis', icon: '📈', label: 'Key Performance Indicators', category: 'risk' },
              ]
              const filledSections = bpSections.filter(s => bp[s.key]?.trim())
              const catMeta: Record<BPCat, { label: string; icon: string }> = {
                vision: { label: 'Vision & Mission', icon: '🎯' },
                market: { label: 'Market Analysis', icon: '📊' },
                product: { label: 'Product', icon: '💡' },
                finance: { label: 'Financials', icon: '💰' },
                strategy: { label: 'Strategy', icon: '🗺️' },
                operations: { label: 'Operations', icon: '⚙️' },
                risk: { label: 'Risk & Governance', icon: '🛡️' },
              }

              const allFinText = [bp.unitEconomics, bp.marketSize, bp.financialProjections, bp.revenueModel].filter(Boolean).join(' ')
              const extractedMetrics = extractNums(allFinText)
              const tamSamSom = extractedMetrics.filter(m => ['TAM', 'SAM', 'SOM'].includes(m.label))
              const financeMetrics = extractedMetrics.filter(m => !['TAM', 'SAM', 'SOM'].includes(m.label))

              return (
                <div>
                  {/* Asset Library Modal */}
                  <AssetLibraryModal
                    open={day8PageAssetOpen}
                    onOpenChange={setDay8PageAssetOpen}
                    ideaId={ideaId}
                    section={day8PageAssetSection}
                    onSelect={handleDay8PageAssetSelect}
                    currentImages={day8PageHeroImage ? { [day8PageAssetSection]: day8PageHeroImage } : {}}
                  />

                  {/* Browser-chrome webpage frame */}
                  <div className="mx-auto" style={{ maxWidth: 1280 }}>
                    {/* Browser chrome bar */}
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-xl border border-b-0 border-gray-200" style={{ backgroundColor: '#f0f0f0' }}>
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 bg-white rounded-md px-4 py-1 text-xs text-gray-400 border border-gray-200" style={{ minWidth: 260, maxWidth: 420, width: '60%' }}>
                          <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                          <span className="truncate">{companyName.toLowerCase().replace(/\s+/g, '')}.com/business-plan</span>
                        </div>
                      </div>
                      <div className="w-12" />
                    </div>

                    {/* Webpage content area */}
                    <div className="border border-gray-200 rounded-b-xl overflow-hidden shadow-xl flex flex-col gap-6 p-6" style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#2d2d2d' }}>

                  {/* Regenerate all bar */}
                  <div className="flex items-center justify-between px-6 py-2.5 rounded-lg" style={{ backgroundColor: ed.primary }}>
                    <p className="text-xs font-medium text-white/60">{filledSections.length} sections generated</p>
                    <button
                      type="button"
                      onClick={triggerDay8Generate}
                      disabled={day8Generating}
                      className="text-xs text-white/80 hover:text-white font-medium disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                      Regenerate All
                    </button>
                  </div>

                  {/* ===== HERO — Cover Slide (16:9) ===== */}
                  <section
                    className="rounded-lg shadow-lg overflow-hidden relative"
                    style={{ aspectRatio: '16/9', backgroundColor: ed.light }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      if (day8CoverTextDragging) {
                        const pxX = e.clientX - day8CoverTextDragStart.x
                        const pxY = e.clientY - day8CoverTextDragStart.y
                        const pctX = day8CoverTextDragOrigin.x + (pxX / rect.width) * 100
                        const pctY = day8CoverTextDragOrigin.y + (pxY / rect.height) * 100
                        setDay8CoverTextPos({ x: Math.max(0, Math.min(85, pctX)), y: Math.max(5, Math.min(90, pctY)) })
                      }
                      if (day8CoverLabelDragging) {
                        const pxX = e.clientX - day8CoverLabelDragStart.x
                        const pxY = e.clientY - day8CoverLabelDragStart.y
                        const pctX = day8CoverLabelDragOrigin.x + (pxX / rect.width) * 100
                        const pctY = day8CoverLabelDragOrigin.y + (pxY / rect.height) * 100
                        setDay8CoverLabelPos({ x: Math.max(0, Math.min(85, pctX)), y: Math.max(5, Math.min(95, pctY)) })
                      }
                    }}
                    onMouseUp={() => {
                      if (day8CoverTextDragging) {
                        setDay8CoverTextDragging(false)
                        setFormData(prev => {
                          const next = { ...prev, day8CoverTextX: String(day8CoverTextPos.x), day8CoverTextY: String(day8CoverTextPos.y) }
                          persistDay8Fields(next)
                          return next
                        })
                      }
                      if (day8CoverLabelDragging) {
                        setDay8CoverLabelDragging(false)
                        setFormData(prev => {
                          const next = { ...prev, day8CoverLabelX: String(day8CoverLabelPos.x), day8CoverLabelY: String(day8CoverLabelPos.y) }
                          persistDay8Fields(next)
                          return next
                        })
                      }
                    }}
                    onMouseLeave={() => {
                      if (day8CoverTextDragging) {
                        setDay8CoverTextDragging(false)
                        setFormData(prev => {
                          const next = { ...prev, day8CoverTextX: String(day8CoverTextPos.x), day8CoverTextY: String(day8CoverTextPos.y) }
                          persistDay8Fields(next)
                          return next
                        })
                      }
                      if (day8CoverLabelDragging) {
                        setDay8CoverLabelDragging(false)
                        setFormData(prev => {
                          const next = { ...prev, day8CoverLabelX: String(day8CoverLabelPos.x), day8CoverLabelY: String(day8CoverLabelPos.y) }
                          persistDay8Fields(next)
                          return next
                        })
                      }
                    }}
                  >
                    <div className="absolute inset-0">
                      {/* Floating draggable company name */}
                      <div
                        className={`absolute z-10 max-w-[70%] ${day8CoverTextDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{
                          left: `${day8CoverTextPos.x}%`,
                          top: `${day8CoverTextPos.y}%`,
                          transform: 'translate(0, -50%)',
                        }}
                        onMouseDown={(e) => {
                          if ((e.target as HTMLElement).isContentEditable) return
                          e.preventDefault()
                          setDay8CoverTextDragging(true)
                          setDay8CoverTextDragStart({ x: e.clientX, y: e.clientY })
                          setDay8CoverTextDragOrigin({ x: day8CoverTextPos.x, y: day8CoverTextPos.y })
                        }}
                      >
                        <div className="border-t-[3px] w-12 mb-4" style={{ borderColor: ed.accent }} />
                        <h1
                          data-bp-section="_cover_"
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const html = e.currentTarget.innerHTML || ''
                            day8EditorHtmlRef.current['_cover_'] = html
                            // Also update companyName from text for display elsewhere
                            setFormData(prev => ({ ...prev, companyName: e.currentTarget.innerText || '' }))
                            setDay8DirtySections(prev => { const s = new Set(prev); s.add('_cover_'); return s })
                            if (day8SavedSection === '_cover_') setDay8SavedSection(null)
                          }}
                          onFocus={() => setDay8FocusedEditor('_cover_')}
                          onBlur={() => {
                            const html = day8EditorHtmlRef.current['_cover_']
                            if (html !== undefined) {
                              setFormData(prev => ({ ...prev, companyName: document.querySelector('[data-bp-section="_cover_"]')?.textContent || prev.companyName }))
                            }
                            setTimeout(() => setDay8FocusedEditor(prev => prev === '_cover_' ? null : prev), 150)
                          }}
                          className="text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.03em] outline-none hover:ring-1 hover:ring-gray-200 focus:ring-2 focus:ring-amber-300 rounded-md px-1 -mx-1 transition-all cursor-text"
                          style={{ color: ed.primary, fontFamily: ed.serif }}
                          dangerouslySetInnerHTML={{ __html: day8EditorHtmlRef.current['_cover_'] || companyName }}
                        />
                        <div className="w-16 h-0.5 mt-2" style={{ backgroundColor: ed.accent }} />

                        {/* Floating toolbar for cover text */}
                        <Day8FormatToolbar visible={day8FocusedEditor === '_cover_'} sectionKey="_cover_" {...day8SharedProps} />
                      </div>

                      {/* Floating draggable "Business Plan" label */}
                      <div
                        className={`absolute z-10 ${day8CoverLabelDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        style={{
                          left: `${day8CoverLabelPos.x}%`,
                          top: `${day8CoverLabelPos.y}%`,
                          transform: 'translate(0, -50%)',
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setDay8CoverLabelDragging(true)
                          setDay8CoverLabelDragStart({ x: e.clientX, y: e.clientY })
                          setDay8CoverLabelDragOrigin({ x: day8CoverLabelPos.x, y: day8CoverLabelPos.y })
                        }}
                      >
                        <p className="text-lg font-bold uppercase tracking-[0.3em] select-none" style={{ color: ed.accent }}>Business Plan</p>
                      </div>

                      {/* Full-bleed hero image background */}
                      <div className="absolute inset-0">
                        <div
                          className={`w-full h-full overflow-hidden ${day8HeroAdjusting ? 'cursor-move ring-2 ring-blue-400 ring-inset' : 'cursor-pointer'}`}
                          onMouseDown={(e) => {
                            if (!day8PageHeroImage || !day8HeroAdjusting) return
                            e.preventDefault()
                            setDay8HeroDragging(true)
                            setDay8HeroDragStart({ x: e.clientX, y: e.clientY })
                          }}
                          onMouseMove={(e) => {
                            if (!day8HeroDragging) return
                            const dx = (e.clientX - day8HeroDragStart.x) * 0.15
                            const dy = (e.clientY - day8HeroDragStart.y) * 0.15
                            setDay8HeroPos(prev => ({
                              x: Math.max(0, Math.min(100, prev.x - dx)),
                              y: Math.max(0, Math.min(100, prev.y - dy)),
                            }))
                            setDay8HeroDragStart({ x: e.clientX, y: e.clientY })
                          }}
                          onMouseUp={() => {
                            setDay8HeroDragging(false)
                            // Persist position to formData
                            setFormData(prev => ({ ...prev, day8CoverPosX: String(day8HeroPos.x), day8CoverPosY: String(day8HeroPos.y) }))
                          }}
                          onMouseLeave={() => {
                            if (day8HeroDragging) {
                              setDay8HeroDragging(false)
                              setFormData(prev => ({ ...prev, day8CoverPosX: String(day8HeroPos.x), day8CoverPosY: String(day8HeroPos.y) }))
                            }
                          }}
                          onClick={() => {
                            if (!day8PageHeroImage && !day8HeroAdjusting) {
                              setDay8PageAssetSection('Business Plan Hero')
                              setDay8PageAssetOpen(true)
                            }
                          }}
                        >
                          {day8PageHeroImage ? (
                            <img
                              src={day8PageHeroImage}
                              alt="Business Plan"
                              className="w-full h-full select-none"
                              draggable={false}
                              style={{
                                objectFit: 'cover',
                                objectPosition: `${day8HeroPos.x}% ${day8HeroPos.y}%`,
                                transform: `scale(${day8HeroZoom})`,
                                transformOrigin: `${day8HeroPos.x}% ${day8HeroPos.y}%`,
                                transition: day8HeroDragging ? 'none' : 'transform 0.2s ease',
                              }}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center"
                              style={{ backgroundColor: `${ed.primary}06` }}
                            >
                              <span className="text-4xl opacity-20 mb-2">🏢</span>
                              <p className="text-[10px] font-medium" style={{ color: ed.muted }}>Click to add image</p>
                            </div>
                          )}
                        </div>

                        {/* Right-side vertical toolbar */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 bg-black/60 backdrop-blur-sm rounded-xl py-2 px-1" style={{ zIndex: 10 }}>
                          {/* Zoom in */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDay8HeroZoom(z => { const nz = Math.min(3, +(z + 0.25).toFixed(2)); setFormData(prev => { const next = { ...prev, day8CoverZoom: String(nz) }; persistDay8Fields(next); return next }); return nz }) }}
                            className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white text-sm font-bold rounded-lg hover:bg-white/15 transition-colors"
                            title="Zoom in"
                          >+</button>

                          {/* Zoom level */}
                          <span className="text-[8px] text-white/50 font-medium">{Math.round(day8HeroZoom * 100)}%</span>

                          {/* Zoom out */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDay8HeroZoom(z => { const nz = Math.max(1, +(z - 0.25).toFixed(2)); setFormData(prev => { const next = { ...prev, day8CoverZoom: String(nz) }; persistDay8Fields(next); return next }); return nz }) }}
                            className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white text-sm font-bold rounded-lg hover:bg-white/15 transition-colors"
                            title="Zoom out"
                          >−</button>

                          {/* Divider */}
                          <div className="h-px w-5 bg-white/20 my-0.5" />

                          {/* Adjust / reposition toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDay8HeroAdjusting(a => {
                                if (a) {
                                  // Leaving adjust mode — persist current position to formData AND DB
                                  setFormData(prev => {
                                    const next = { ...prev, day8CoverPosX: String(day8HeroPos.x), day8CoverPosY: String(day8HeroPos.y) }
                                    persistDay8Fields(next)
                                    return next
                                  })
                                }
                                return !a
                              })
                            }}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                              day8HeroAdjusting
                                ? 'bg-blue-500 text-white'
                                : 'text-white/80 hover:text-white hover:bg-white/15'
                            }`}
                            title={day8HeroAdjusting ? 'Done adjusting' : 'Adjust position'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                          </button>

                          {/* Divider */}
                          <div className="h-px w-5 bg-white/20 my-0.5" />

                          {/* Change image */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDay8PageAssetSection('Business Plan Hero'); setDay8PageAssetOpen(true) }}
                            className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/15 transition-colors"
                            title="Change image"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                          </button>
                        </div>

                        {/* Adjust mode hint */}
                        {day8HeroAdjusting && (
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-medium px-3 py-1 rounded-full shadow-lg" style={{ zIndex: 10 }}>
                            Drag to reposition · Scroll to zoom
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* ===== TABLE OF CONTENTS ===== */}
                  <section className="py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: 'white' }}>
                    <div className="max-w-5xl mx-auto px-8 md:px-12">
                      <div className="grid md:grid-cols-3 gap-10">
                        <div>
                          <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>Contents</h3>
                          <div className="w-12 h-0.5 mt-4" style={{ backgroundColor: ed.accent }} />
                        </div>
                        <div className="md:col-span-2">
                          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-0">
                            {(Object.entries(catMeta) as [BPCat, typeof catMeta[BPCat]][]).map(([cat, meta]) => {
                              const catSecs = filledSections.filter(s => s.category === cat)
                              if (catSecs.length === 0) return null
                              return (
                                <div key={cat} className="border-t py-3" style={{ borderColor: `${ed.primary}08` }}>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: ed.accent }}>{meta.label}</p>
                                  {catSecs.map(s => (
                                    <p key={s.key} className="text-sm leading-relaxed flex items-center gap-2" style={{ color: `${ed.primary}55` }}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ed.accent }} />{s.label}</p>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ===== SECTIONS ===== */}
                  {filledSections.map((section, secIdx) => {
                    const content = bp[section.key]
                    const isAlt = secIdx % 2 === 1
                    const isRegenerating = day8PageRegenKey === section.key

                    // Regeneration blur overlay (inserted inside each section)
                    const RegenOverlay = isRegenerating ? (
                      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin h-6 w-6" style={{ color: ed.accent }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                          <p className="text-xs font-medium" style={{ color: ed.primary }}>Regenerating section…</p>
                        </div>
                      </div>
                    ) : null

                    // Market Size with metrics table
                    if (section.key === 'marketSize' && tamSamSom.length > 0) {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Metric</th>
                                    <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Value</th>
                                    <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Unit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tamSamSom.map((m, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{m.label}</td>
                                      <td className="py-3 px-4 text-right font-light" style={{ color: ed.primary, fontFamily: ed.serif }}>{m.value.toLocaleString()}</td>
                                      <td className="py-3 px-4 text-right" style={{ color: ed.muted }}>{m.unit}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Unit Economics — metrics table
                    if (section.key === 'unitEconomics') {
                      const ueMetrics = extractNums(content)
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            {ueMetrics.length > 0 && (
                              <div className="overflow-x-auto mb-6">
                                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                      <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Metric</th>
                                      <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ueMetrics.map((m, idx) => (
                                      <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                        <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{m.label}</td>
                                        <td className="py-3 px-4 text-right font-light" style={{ color: ed.primary, fontFamily: ed.serif }}>
                                          {m.label === 'Margin' ? `${m.value}%` : `£${m.value.toLocaleString()}`}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Financial Projections
                    if (section.key === 'financialProjections') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    {['Metric', 'Year 1', 'Year 2', 'Year 3'].map((h, i) => (
                                      <th key={i} className={`py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em] ${i > 0 ? 'text-right' : 'text-left'}`} style={{ color: ed.primary }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {['Revenue', 'Expenses', 'Net Profit', 'Growth Rate'].map((metric, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{metric}</td>
                                      {['Foundation', 'Scaling', 'Acceleration'].map((phase, pi) => (
                                        <td key={pi} className="py-3 px-4 text-right" style={{ color: ed.muted }}>—</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Funding allocation
                    if (section.key === 'fundingRequirements') {
                      const fundingAlloc = [
                        { area: 'Product Development', pct: '40%' },
                        { area: 'Marketing & Growth', pct: '25%' },
                        { area: 'Hiring & Talent', pct: '20%' },
                        { area: 'Operations', pct: '10%' },
                        { area: 'Reserve / Buffer', pct: '5%' },
                      ]
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Allocation Area</th>
                                    <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>% of Funds</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Visual</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {fundingAlloc.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.area}</td>
                                      <td className="py-3 px-4 text-right font-light" style={{ color: ed.primary, fontFamily: ed.serif }}>{row.pct}</td>
                                      <td className="py-3 px-4">
                                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${ed.primary}08`, width: '100%' }}>
                                          <div className="h-full rounded-full" style={{ width: row.pct, backgroundColor: ed.accent }} />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Milestones timeline
                    if (section.key === 'milestones') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Quarter</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Phase</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Timeline</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white" style={{ backgroundColor: ed.accent }}>{q}</span>
                                      </td>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{['Launch & Validate', 'Growth & Iteration', 'Scale & Optimize', 'Expand & Refine'][idx]}</td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>Month {idx * 3 + 1}–{idx * 3 + 3}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Team table
                    if (section.key === 'teamStructure') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Department</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Role</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Priority</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { dept: '🖥️ Engineering', role: 'CTO / Lead Engineer', priority: 'Immediate' },
                                    { dept: '📣 Marketing', role: 'Growth Lead', priority: 'Q1–Q2' },
                                    { dept: '🤝 Sales', role: 'Sales Lead', priority: 'Q2–Q3' },
                                    { dept: '⚙️ Operations', role: 'Operations Manager', priority: 'Q3–Q4' },
                                  ].map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.dept}</td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>{row.role}</td>
                                      <td className="py-3 px-4">
                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${ed.accent}15`, color: ed.accent }}>{row.priority}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Risk Analysis
                    if (section.key === 'riskAnalysis') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Risk Category</th>
                                    <th className="text-center py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Severity</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Mitigation</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { cat: '📊 Market Risk', severity: 'Medium', mitigation: 'Diversified target segments' },
                                    { cat: '🖥️ Technical Risk', severity: 'Low', mitigation: 'Proven tech stack, MVP-first' },
                                    { cat: '⚔️ Competitive Risk', severity: 'Medium', mitigation: 'Strong differentiators' },
                                    { cat: '💰 Financial Risk', severity: 'High', mitigation: 'Lean operations, staged funding' },
                                    { cat: '⚖️ Regulatory Risk', severity: 'Low', mitigation: 'Compliance-first approach' },
                                    { cat: '👥 Team Risk', severity: 'Medium', mitigation: 'Key hire roadmap' },
                                  ].map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.cat}</td>
                                      <td className="py-3 px-4 text-center">
                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{
                                          backgroundColor: row.severity === 'High' ? '#fef2f2' : row.severity === 'Medium' ? '#fffbeb' : '#f0fdf4',
                                          color: row.severity === 'High' ? '#dc2626' : row.severity === 'Medium' ? '#d97706' : '#16a34a',
                                        }}>{row.severity}</span>
                                      </td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>{row.mitigation}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // KPIs table
                    if (section.key === 'kpis') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Category</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>KPI</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Target</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { cat: '📈 Growth', kpi: 'Monthly Active Users', target: 'Track monthly' },
                                    { cat: '🎯 Engagement', kpi: 'Retention Rate', target: 'Track weekly' },
                                    { cat: '💰 Revenue', kpi: 'MRR / ARR', target: 'Track monthly' },
                                    { cat: '⚡ Efficiency', kpi: 'CAC : LTV Ratio', target: '> 3:1' },
                                  ].map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.cat}</td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>{row.kpi}</td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>{row.target}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Go-to-Market phases table
                    if (section.key === 'goToMarket') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Phase</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Focus</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Timeline</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { phase: '🌱 Phase 1', focus: 'Traction & Validation', timeline: '0–3 months' },
                                    { phase: '🚀 Phase 2', focus: 'Scale & Iterate', timeline: '3–9 months' },
                                    { phase: '🌍 Phase 3', focus: 'Expand & Dominate', timeline: '9–18 months' },
                                  ].map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.phase}</td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>{row.focus}</td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>{row.timeline}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Sales funnel
                    if (section.key === 'salesStrategy') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Funnel Stage</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Conversion</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {['Awareness', 'Interest', 'Consideration', 'Decision', 'Purchase'].map((stage, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{stage}</td>
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                          <div className="h-2 rounded-full overflow-hidden flex-1" style={{ backgroundColor: `${ed.primary}06` }}>
                                            <div className="h-full rounded-full" style={{ width: `${100 - idx * 18}%`, backgroundColor: ed.accent }} />
                                          </div>
                                          <span className="text-xs font-light" style={{ color: ed.muted }}>{100 - idx * 18}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Competitive Landscape
                    if (section.key === 'competitiveLandscape') {
                      return (
                        <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                          {RegenOverlay}
                          <div className="max-w-5xl mx-auto px-8 md:px-12">
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                                <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                                <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                              </div>
                              <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                            </div>
                            <div className="overflow-x-auto mb-6">
                              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: `2px solid ${ed.accent}` }}>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Category</th>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ed.primary }}>Type</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { cat: '🎯 Direct Competitors', type: 'Same market, same solution' },
                                    { cat: '🔄 Indirect Competitors', type: 'Same market, different approach' },
                                    { cat: '⚡ Emerging Threats', type: 'New entrants & disruptors' },
                                  ].map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: `1px solid ${ed.primary}08` }}>
                                      <td className="py-3 px-4 font-medium" style={{ color: ed.primary }}>{row.cat}</td>
                                      <td className="py-3 px-4" style={{ color: ed.muted }}>{row.type}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                          </div>
                        </section>
                      )
                    }

                    // Default editorial section
                    return (
                      <section key={section.key} className="relative py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto" style={{ aspectRatio: '16/9', backgroundColor: isAlt ? ed.light : 'white' }}>
                        {RegenOverlay}
                        <div className="max-w-5xl mx-auto px-8 md:px-12">
                          <div className="flex items-start justify-between mb-6">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: ed.accent }}>◆&ensp;{catMeta[section.category].label}</p>
                              <h3 className="text-2xl font-light tracking-tight" style={{ color: ed.primary, fontFamily: ed.serif }}>{section.label}</h3>
                              <div className="w-12 h-0.5 mt-3" style={{ backgroundColor: ed.accent }} />
                            </div>
                            <Day8RegenBtn sectionKey={section.key} day8PageRegenKey={day8PageRegenKey} handleDay8PageRegen={handleDay8PageRegen} />
                          </div>
                          <Day8BPText text={content} sectionKey={section.key} day8FocusedEditor={day8FocusedEditor} setDay8FocusedEditor={setDay8FocusedEditor} {...day8SharedProps} />
                        </div>
                      </section>
                    )
                  })}

                  {/* ===== EDITORIAL FOOTER ===== */}
                  <section className="py-8 md:py-10 rounded-lg shadow-lg overflow-y-auto flex items-center justify-center" style={{ aspectRatio: '16/9', backgroundColor: ed.primary }}>
                    <div className="max-w-3xl mx-auto px-8 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.3em] mb-5" style={{ color: ed.accent }}>◆&ensp;{companyName}</p>
                      <h3 className="text-3xl md:text-4xl font-light text-white mb-3 tracking-tight" style={{ fontFamily: ed.serif }}>Business Plan Complete</h3>
                      <p className="text-white/40 text-sm">{filledSections.length} sections · Generated with Phoxta</p>
                    </div>
                  </section>

                    </div>{/* end webpage content area */}
                  </div>{/* end browser chrome frame */}

                </div>
              )
            })()}
          </section>
        )}

        {/* ===================== Day 9: Gamified Brand Studio ===================== */}
        {dayNumber === 9 && (
          <section className="space-y-5">
            {/* Auto-generating indicator */}
            {!state?.inputs && !prefilled && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
                <div className="w-14 h-14 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm animate-pulse">
                  <span className="text-2xl">🎨</span>
                </div>
                <p className="font-semibold text-gray-900">Generating your brand identity...</p>
                <p className="text-sm text-gray-500 mt-1">AI is crafting a complete brand system from your validation data.</p>
              </div>
            )}

            {/* Brand Personality Card */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-black px-5 py-3 flex items-center gap-2">
                <span className="text-lg">✨</span>
                <h3 className="font-bold text-white text-sm">Brand Personality</h3>
              </div>
              <div className="p-5 bg-white space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <span>🎭</span> Personality Traits
                  </label>
                  <input
                    type="text"
                    value={formData.brandPersonality ?? ''}
                    onChange={(e) => setFormData({ ...formData, brandPersonality: e.target.value })}
                    placeholder="e.g. Bold, Minimal, Premium, Playful"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-2 focus:ring-gray-300 bg-gray-50 hover:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <span>💫</span> Target Emotion
                  </label>
                  <input
                    type="text"
                    value={formData.targetEmotion ?? ''}
                    onChange={(e) => setFormData({ ...formData, targetEmotion: e.target.value })}
                    placeholder="What should customers feel when they encounter your brand?"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-2 focus:ring-gray-300 bg-gray-50 hover:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <span>🌟</span> Inspiration Brands
                  </label>
                  <AutoResizeTextarea
                    minRows={2}
                    value={formData.inspirationBrands ?? ''}
                    onChange={(e) => setFormData({ ...formData, inspirationBrands: e.target.value })}
                    placeholder="Brands you admire (one per line)"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-black focus:ring-2 focus:ring-gray-300 bg-gray-50 hover:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Colour Studio */}
            <ColorWheelPicker
              onColorSelect={(hex) => {
                const colorSlots = ['primaryColor', 'secondaryColor', 'accentColor', 'highlightColor', 'subtleColor']
                const firstEmpty = colorSlots.find(slot => !formData[slot])
                if (firstEmpty) {
                  setFormData((prev: Record<string, string>) => ({ ...prev, [firstEmpty]: hex }))
                }
              }}
              selectedColors={[formData.primaryColor, formData.secondaryColor, formData.accentColor, formData.highlightColor, formData.subtleColor].filter(Boolean) as string[]}
              onRemoveColor={(index) => {
                const colorSlots = ['primaryColor', 'secondaryColor', 'accentColor', 'highlightColor', 'subtleColor']
                const filled = colorSlots.filter(slot => formData[slot])
                if (filled[index]) {
                  setFormData((prev: Record<string, string>) => {
                    const next = { ...prev }
                    delete next[filled[index]]
                    // Shift remaining colors down to fill the gap
                    const remaining = colorSlots.filter(s => s !== filled[index] && next[s]).map(s => next[s])
                    colorSlots.forEach((s, i) => {
                      next[s] = remaining[i] || ''
                    })
                    return next
                  })
                }
              }}
            />

            {/* Submit */}
            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-black px-4 py-3.5 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {submitting
                  ? '🎨 Creating Brand Identity...'
                  : state?.inputs
                    ? '🔄 Regenerate Brand Identity'
                    : '🚀 Generate Brand Identity'}
              </button>
            </form>
          </section>
        )}

        {/* ===================== Day 10: Landing Page Builder ===================== */}
        {dayNumber === 10 && (
          <Day10LandingPageBuilder
            ideaId={ideaId}
            state={state}
            prefilled={prefilled}
            formData={formData}
            setFormData={setFormData}
            fetchState={fetchState}
          />
        )}

        {/* Input form (generic — used for all days except Day 4 hook mode / Day 6 launch mode / Day 7 auto-verdict / Day 8 business plan / Day 9 brand studio) */}
        {!isDay4HookMode && !isDay6LaunchMode && dayNumber !== 7 && dayNumber !== 8 && dayNumber !== 9 && dayNumber !== 10 && (
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">
            {state?.inputs ? 'Your Input (editable)' : 'Submit Your Input'}
          </h2>
          {prefilled && !state?.inputs && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">Phoxta prefilled this from your idea. Edit only if necessary.</p>
              {(dayNumber >= 1 && dayNumber <= 6) && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="text-xs text-gray-900 hover:text-black font-medium disabled:opacity-50 shrink-0 ml-2"
                >
                  {regenerating ? '↻ Regenerating...' : '↻ Regenerate'}
                </button>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {meta.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                  />
                ) : field.type === 'text' ? (
                  <input
                    type="text"
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                  />
                ) : (
                  <AutoResizeTextarea
                    minRows={field.type === 'textarea-json' ? 5 : 3}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={
                      field.type === 'textarea-list'
                        ? 'One item per line'
                        : field.type === 'textarea-json'
                          ? '[{"name": "...", "strengths": "...", "weaknesses": "..."}]'
                          : ''
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
                  />
                )}
              </div>
            ))}

            {(
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-black px-4 py-2 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting
                  ? 'Processing & Generating Analysis...'
                  : state?.inputs
                    ? 'Resubmit & Recalibrate Analysis'
                    : 'Submit & Generate Analysis'}
              </button>
            )}
          </form>
        </section>
        )}

        {/* AI Output — only show spinner while actively submitting */}
        {dayNumber !== 7 && submitting && (
          <section className="bg-white rounded-lg border border-gray-200 p-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-lg">⏳</span>
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Analysis in progress</h2>
            <p className="text-sm text-gray-500">
              Processing your inputs. Strategic analysis will appear here momentarily.
            </p>
          </section>
        )}

        {/* Metrics */}
        {state?.metrics && state.metrics.length > 0 && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {state.metrics.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {m.metric_name.replace(/_/g, ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {m.metric_value ?? '—'}
                  </p>
                  {m.notes && <p className="text-xs text-gray-400 mt-1">{m.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Complete day — Day 7 only shows after verdict is generated */}
        {canComplete && (dayNumber !== 7 || day7Verdict) && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full rounded-md bg-green-600 px-4 py-3 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {completing ? 'Completing...' : `✓ Complete ${dayMeta[dayNumber]?.title ?? `Phase ${dayNumber}`}`}
          </button>
        )}

        {/* After completing: navigate to next sequential day (1-5) or back to overview */}
        {state?.completed && dayNumber < 5 && dayNumber !== 7 && (
          <div className="text-center">
            <button
              onClick={() => router.push(`/app/idea/${ideaId}/day/${dayNumber + 1}`)}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Continue to {dayMeta[dayNumber + 1]?.title ?? `Phase ${dayNumber + 1}`} →
            </button>
          </div>
        )}

        {/* After completing day 5+: go back to overview for non-sequential navigation */}
        {state?.completed && (dayNumber >= 5 || dayNumber === 7) && (
          <div className="text-center">
            <button
              onClick={() => router.push(`/app/idea/${ideaId}`)}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Back to overview →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}