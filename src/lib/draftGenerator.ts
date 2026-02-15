import type { SupabaseClient } from '@supabase/supabase-js'
import { buildDayDraftPrompt, DayDraftSchemas } from '@/ai/dayDraft'
import { runPhoxtaAI, PhoxtaQuotaError } from './aiClient'
import { SYSTEM_PROMPT } from '@/ai/system'

/**
 * Generate (or regenerate) AI-drafted form defaults for a specific day.
 * Uses previous days' submitted inputs + AI outputs as context.
 * Saves the result into idea.ai_profile.dayN.
 *
 * In dev mode, returns the existing ai_profile.dayN without calling OpenAI.
 */
export async function generateDayDraft(
  ideaId: string,
  targetDay: number,
  supabase: SupabaseClient,
): Promise<Record<string, unknown> | null> {
  if (targetDay < 1 || targetDay > 14 || targetDay === 7) return null

  const schema = DayDraftSchemas[targetDay]
  if (!schema) return null

  // Fetch idea record
  const { data: idea } = await supabase
    .from('ideas')
    .select('id, idea_seed, ai_profile')
    .eq('id', ideaId)
    .single()

  if (!idea) return null

  const currentProfile = (idea.ai_profile as Record<string, unknown>) ?? {}

  // Dev mode: return existing ai_profile data for this day (from initial autofill)
  // For Day 4: ensure all research fields exist — merge in mock research if missing
  if (process.env.PHOXTA_DEV_MODE === 'true') {
    const existing = (currentProfile[`day${targetDay}`] as Record<string, unknown>) ?? null
    if (targetDay === 4 && existing && !existing.keyFindings) {
      // Existing day4 is missing research fields — merge in mock data
      const mockDay4Research = {
        keyFindings: `Analysis of publicly available data — forums, Reddit threads, review sites, and industry reports — reveals consistent demand signals for solutions in this space. Users on relevant subreddits and forums frequently describe frustrations with existing alternatives, citing complexity, high cost, and poor user experience. Market research suggests a growing segment of underserved users who are actively seeking better options.`,
        customerInsights: [
          'Users frequently ask for simpler, more intuitive alternatives to existing tools',
          'Cost is a major barrier — many potential customers feel priced out of current solutions',
          'Trust and transparency are critical concerns that existing players fail to address adequately',
          'Early adopters are vocal about wanting features that current solutions lack',
          'Community forums show strong emotional investment in finding a better solution',
        ],
        marketEvidence: [
          'Relevant subreddits show 500+ discussion threads about this problem space',
          'App store reviews of competing products show recurring complaints about UX and pricing',
          'Industry reports project 15-20% annual growth in this market segment',
          'Social media sentiment analysis reveals significant unmet demand',
        ],
        willingnessEstimate: 'somewhat' as const,
        researchSampleSize: 150,
        interviewQuestions: [
          'How do you currently solve this problem, and what frustrates you most about your current approach?',
          'What would an ideal solution look like for you?',
          'How much time/money do you currently spend dealing with this issue?',
          'What would make you switch from your current solution to something new?',
          'If this solution existed today, what would you be willing to pay for it?',
          'What features would be absolute must-haves for you?',
          'Who else do you know who experiences this problem?',
        ],
      }
      const merged = { ...mockDay4Research, ...existing }
      // Save merged data back to ai_profile so it persists
      const updatedProfile = { ...currentProfile, day4: merged }
      await supabase.from('ideas').update({ ai_profile: updatedProfile }).eq('id', ideaId)
      return merged
    }
    return existing
  }

  // Fetch previous days' inputs and AI outputs for context
  const previousDays: {
    dayNumber: number
    inputs: Record<string, unknown> | null
    aiOutput: Record<string, unknown> | null
  }[] = []

  for (let d = 1; d < targetDay; d++) {
    const [inputRes, outputRes] = await Promise.all([
      supabase
        .from('day_inputs')
        .select('content')
        .eq('idea_id', ideaId)
        .eq('day_number', d)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('ai_outputs')
        .select('content')
        .eq('idea_id', ideaId)
        .eq('day_number', d)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    previousDays.push({
      dayNumber: d,
      inputs: (inputRes.data?.content as Record<string, unknown>) ?? null,
      aiOutput: (outputRes.data?.content as Record<string, unknown>) ?? null,
    })
  }

  const prompt = buildDayDraftPrompt(targetDay, idea.idea_seed, previousDays)
  console.log(`[draftGenerator] Day ${targetDay}: ${previousDays.filter(d => d.inputs || d.aiOutput).length} previous days with data, prompt length: ${prompt.length}`)

// Day 8 (Business Plan) and Day 9 (Branding) produce large outputs; Day 10 (Web Design) too
  const maxTokens = targetDay === 8 ? 16000 : targetDay === 9 ? 8000 : targetDay === 10 ? 12000 : undefined
  // Day 10 uses soft validation — if Zod fails, return raw JSON instead of throwing
  const softValidation = targetDay === 10

  try {
    console.log(`[draftGenerator] Calling OpenAI for day ${targetDay} with maxTokens=${maxTokens ?? 'default'}, softValidation=${softValidation}...`)
    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt, { outputSchema: schema, maxTokens, softValidation })
    console.log(`[draftGenerator] Day ${targetDay} OpenAI returned ${Object.keys(result).length} keys`)

    // Merge new drafts into ai_profile
    const updatedProfile = { ...currentProfile, [`day${targetDay}`]: result }
    await supabase
      .from('ideas')
      .update({ ai_profile: updatedProfile })
      .eq('id', ideaId)

    return result as Record<string, unknown>
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) throw err
    console.error(`[draftGenerator] Day ${targetDay} generation failed:`, err)
    return null
  }
}
