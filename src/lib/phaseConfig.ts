// ---------------------------------------------------------------------------
// Phase / Sub-phase configuration
// Maps the 4 top-level phases to their sub-phases, each backed by an internal
// "day number" that the database, API routes, and AI pipeline already use.
// ---------------------------------------------------------------------------

export interface SubPhase {
  dayNumber: number
  name: string
  description: string
  icon: string
}

export interface Phase {
  id: number
  name: string
  description: string
  icon: string
  color: string            // Tailwind-compatible accent
  subPhases: SubPhase[]
}

export const PHASES: Phase[] = [
  {
    id: 1,
    name: 'Validation',
    description: 'Research, validate, and stress-test your idea',
    icon: '🔬',
    color: 'blue',
    subPhases: [
      { dayNumber: 1, name: 'Problem Definition', description: 'Articulate the core problem hypothesis and identify the target customer segment.', icon: '🎯' },
      { dayNumber: 2, name: 'Market Research', description: 'Quantify the market opportunity and map the competitive landscape.', icon: '📊' },
      { dayNumber: 3, name: 'Value Proposition', description: 'Define the differentiated value proposition and competitive positioning.', icon: '💎' },
      { dayNumber: 4, name: 'Customer Validation', description: 'Validate assumptions with market evidence and customer intelligence.', icon: '👥' },
      { dayNumber: 5, name: 'Business Model', description: 'Architect the revenue model, pricing strategy, and unit economics.', icon: '💰' },
      { dayNumber: 6, name: 'Go-to-Market', description: 'Design the initial market entry plan and outreach strategy.', icon: '🚀' },
      { dayNumber: 7, name: 'Strategic Recommendation', description: 'Synthesise all evidence into a definitive go/pivot/kill recommendation.', icon: '⚖️' },
    ],
  },
  {
    id: 2,
    name: 'Strategy',
    description: 'Plan your brand, market approach, and operations',
    icon: '📋',
    color: 'purple',
    subPhases: [
      { dayNumber: 9, name: 'Branding', description: 'AI-assisted brand identity design — colours, typography, tone, and visual direction.', icon: '🎨' },
      { dayNumber: 11, name: 'Market Strategy', description: 'Define your market positioning, channels, and competitive strategy.', icon: '📣' },
      { dayNumber: 8, name: 'Business Plan', description: 'Generate a Fortune 500-standard business plan with financial projections.', icon: '📄' },
      { dayNumber: 12, name: 'Operation Flow', description: 'Design the customer journey and operational workflow for your business.', icon: '🔄' },
    ],
  },
  {
    id: 3,
    name: 'Design',
    description: 'Create your web presence and visual assets',
    icon: '🎨',
    color: 'amber',
    subPhases: [
      { dayNumber: 10, name: 'Web Design', description: 'Generate a professional landing page website to share your business with customers.', icon: '🌐' },
      { dayNumber: 13, name: 'Graphics Design', description: 'Create logos, social media assets, and marketing graphics for your brand.', icon: '🖼️' },
    ],
  },
  {
    id: 4,
    name: 'Launch',
    description: 'Prepare and execute your launch',
    icon: '🚀',
    color: 'green',
    subPhases: [
      { dayNumber: 14, name: 'Launch', description: 'Final launch checklist, deployment, and go-live preparation.', icon: '🎯' },
    ],
  },
]

/** Maximum internal day number in use */
export const MAX_DAY_NUMBER = 14

/** Total sub-phases across all phases */
export const TOTAL_SUB_PHASES = PHASES.reduce((sum, p) => sum + p.subPhases.length, 0)

/** All internal day numbers, in phase order */
export const ALL_DAY_NUMBERS = PHASES.flatMap(p => p.subPhases.map(sp => sp.dayNumber))

/** Lookup: day number → Phase */
export function getPhaseForDay(dayNumber: number): Phase | undefined {
  return PHASES.find(p => p.subPhases.some(sp => sp.dayNumber === dayNumber))
}

/** Lookup: day number → sub-phase */
export function getSubPhaseForDay(dayNumber: number): SubPhase | undefined {
  for (const p of PHASES) {
    const sp = p.subPhases.find(s => s.dayNumber === dayNumber)
    if (sp) return sp
  }
  return undefined
}

/** Lookup: day number → { phaseIndex, subPhaseIndex } */
export function getSubPhaseIndices(dayNumber: number): { phaseIndex: number; subPhaseIndex: number } | undefined {
  for (let pi = 0; pi < PHASES.length; pi++) {
    const si = PHASES[pi].subPhases.findIndex(sp => sp.dayNumber === dayNumber)
    if (si >= 0) return { phaseIndex: pi, subPhaseIndex: si }
  }
  return undefined
}

/**
 * Phase-aware unlock logic.
 * - Phase 1 (Validation, days 1–7): strictly sequential — each step
 *   unlocks only after the previous one is completed.
 * - After day 7 (Phase 1 complete): all Phase 2/3/4 sub-phases unlock
 *   (days 8–14).
 */
export function getDayStatus(
  dayNumber: number,
  currentDay: number,
  completedDays: number[],
): 'completed' | 'current' | 'available' | 'locked' {
  if (completedDays.includes(dayNumber)) return 'completed'
  if (dayNumber === currentDay) return 'current'
  // Phase 1 (days 1–7): strictly sequential
  if (dayNumber <= 7) {
    if (dayNumber < currentDay) return 'available'
    return 'locked'
  }
  // After day 7 (Phase 1 complete), Phases 2-4 unlock (days 8-14)
  if (currentDay > 7 && dayNumber >= 8 && dayNumber <= MAX_DAY_NUMBER) return 'available'
  return 'locked'
}
