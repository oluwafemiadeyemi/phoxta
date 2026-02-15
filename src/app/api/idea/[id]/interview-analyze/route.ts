import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { SYSTEM_PROMPT } from '@/ai/system'
import { runPhoxtaAI, PhoxtaQuotaError, quotaErrorBody } from '@/lib/aiClient'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ideaId } = await params
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify idea ownership
    const { data: idea, error: ideaErr } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (ideaErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    // Get interview form + responses
    const { data: form } = await supabase
      .from('interview_forms')
      .select('*')
      .eq('idea_id', ideaId)
      .single()

    if (!form)
      return NextResponse.json({ error: 'No interview form found' }, { status: 404 })

    const { data: responses } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('form_id', form.id)

    if (!responses?.length)
      return NextResponse.json(
        { error: 'No responses to analyse' },
        { status: 400 },
      )

    if (process.env.PHOXTA_DEV_MODE === 'true') {
      const mockAnalysis = {
        keyFindings: `Analysis of ${responses.length} interview responses reveals strong validation signals. Respondents consistently identify the core problem as significant and recurring. Willingness to pay is moderate to high.`,
        customerInsights: [
          'Most respondents experience this problem weekly or more frequently',
          'Current workarounds are time-consuming and frustrating',
          'Price sensitivity varies — power users willing to pay premium',
        ],
        willingnessEstimate: 'very_willing' as const,
        researchSampleSize: responses.length,
      }

      // Update ai_profile.day4 with interview analysis
      const profile = idea.ai_profile || {}
      const day4 = { ...profile.day4, ...mockAnalysis }
      const { error: updateErr } = await supabase
        .from('ideas')
        .update({ ai_profile: { ...profile, day4 } })
        .eq('id', ideaId)

      if (updateErr) throw updateErr
      return NextResponse.json(mockAnalysis)
    }

    const prompt = `Analyse these ${responses.length} interview responses for the startup idea: "${idea.idea_seed}"

Questions: ${JSON.stringify(form.questions)}
Responses: ${JSON.stringify(responses.map((r: Record<string, unknown>) => r.answers))}

Return a JSON object with:
- keyFindings (string): 3-5 sentences summarising what the interviews reveal
- customerInsights (string[]): 3-8 specific insights from the responses
- willingnessEstimate ("not_willing"|"somewhat"|"very_willing"|"eager"): based on responses
- researchSampleSize (number): ${responses.length}

Return ONLY valid JSON.`

    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt) as Record<string, unknown>

    // Update ai_profile.day4 with real analysis
    const profile = idea.ai_profile || {}
    const day4 = { ...profile.day4, ...result }
    const { error: updateErr } = await supabase
      .from('ideas')
      .update({ ai_profile: { ...profile, day4 } })
      .eq('id', ideaId)

    if (updateErr) throw updateErr

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) {
      return NextResponse.json(quotaErrorBody(), { status: 429 })
    }
    console.error('[interview-analyze]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
