import { z } from 'zod'

// ---------------------------------------------------------------------------
// Input schema — what the frontend sends to the autofill endpoint
// ---------------------------------------------------------------------------

export const AutoFillInputSchema = z.object({
  ideaSeed: z.string().min(10).max(2000),
  whoFor: z.string().max(500).optional(),
  desiredOutcome: z.string().max(500).optional(),
})

export type AutoFillInput = z.infer<typeof AutoFillInputSchema>

// ---------------------------------------------------------------------------
// Output schema — what the AI returns (validated server-side)
// ---------------------------------------------------------------------------

const HookSchema = z.object({
  type: z.enum(['pain', 'outcome', 'fear']),
  text: z.string(),
})

const ConfidenceLevel = z.enum(['high', 'medium', 'low'])

export const AutoFillOutputSchema = z.object({
  problemStatement: z.string(),
  targetAudience: z.string(),
  killCondition: z.string(),
  coreOutcome: z.string(),
  mvpType: z.enum(['manual', 'nocode', 'lightweight']),
  assumptions: z.array(z.string()),
  day1SearchPhrases: z.array(z.string()),
  existingSolutions: z.array(z.string()),
  competitorCandidates: z.array(z.string()),
  day3CoreOutcome: z.string(),
  day3MvpType: z.enum(['manual', 'nocode', 'lightweight']),
  day4Hooks: z.array(HookSchema),
  day5Preferences: z.object({
    timeAvailabilityHours: z.number(),
    toolPreference: z.string(),
    skillLevel: z.string(),
    budgetRange: z.string(),
    platformTarget: z.string(),
  }),
  day6LaunchPlan: z.object({
    launchChannels: z.array(z.string()),
    recommendedTouchCount: z.number(),
    outreachScriptDrafts: z.array(z.string()),
  }),
  day2Competitors: z.array(z.string()),
  day1: z.object({
    problemStatement: z.string(),
    targetCustomer: z.string(),
    painPoints: z.array(z.string()),
    existingSolutions: z.string().optional(),
  }),
  day2: z.object({
    marketSize: z.string(),
    competitors: z.array(z.string()),
    trends: z.string(),
    opportunities: z.string().optional(),
  }),
  day3: z.object({
    coreOutcome: z.string(),
    mvpType: z.enum(['manual', 'nocode', 'lightweight']),
  }),
  day4: z.object({
    hooks: z.array(HookSchema),
    recommendedHookType: z.enum(['pain', 'outcome', 'fear']),
    keyFindings: z.string(),
    customerInsights: z.array(z.string()),
    marketEvidence: z.array(z.string()),
    willingnessEstimate: z.enum(['not_willing', 'somewhat', 'very_willing', 'eager']),
    researchSampleSize: z.number(),
    interviewQuestions: z.array(z.string()),
  }),
  day5: z.object({
    timeAvailabilityHours: z.number(),
    toolPreference: z.enum(['manual', 'nocode', 'code']),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    budgetRange: z.enum(['0-50', '50-200', '200-1000', '1000+']),
    platformTarget: z.enum(['web', 'mobile', 'both']),
  }),
  day6: z.object({
    launchChannels: z.array(z.enum(['community', 'cold_outreach', 'ads', 'partners'])),
    recommendedTouchCount: z.number(),
    outreachScripts: z.array(z.string()),
  }),
  confidence: z.record(z.string(), ConfidenceLevel),
})

export type AutoFillOutput = z.infer<typeof AutoFillOutputSchema>
