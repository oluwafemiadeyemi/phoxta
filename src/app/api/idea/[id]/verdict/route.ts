import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { SYSTEM_PROMPT } from '@/ai/system'
import { runPhoxtaAI, PhoxtaQuotaError, quotaErrorBody } from '@/lib/aiClient'

export async function GET(
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

    const { data: idea, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (error || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    return NextResponse.json({
      verdict: idea.verdict || null,
      idea: {
        id: idea.id,
        ideaSeed: idea.idea_seed,
        status: idea.status,
      },
    })
  } catch (err) {
    console.error('[verdict GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const { data: idea, error: fetchErr } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    const profile = idea.ai_profile || {}
    const report = idea.report || {}

    // Get all day inputs
    const { data: allInputs } = await supabase
      .from('day_inputs')
      .select('*')
      .eq('idea_id', ideaId)
      .order('day_number')

    if (process.env.PHOXTA_DEV_MODE === 'true') {
      const mockVerdict = {
        decision: 'go' as const,
        confidence: 0.75,
        headline: 'Proceed with caution — strong signals, but validate pricing early.',
        reasoning: 'The 7-day validation revealed consistent demand signals across public data and customer research. The target audience clearly experiences the stated problem, and competitive analysis shows gaps in existing solutions. However, willingness to pay at the proposed price point requires further validation through an MVP with real pricing.',
        nextSteps: [
          'Build a landing page with pricing to measure conversion intent',
          'Launch manual MVP within 2 weeks to first 10 users',
          'Set kill condition: if <3/10 users return after first use, pivot',
          'Begin community building on 2 channels identified in Day 6',
        ],
        killConditions: [
          'Fewer than 3 out of 10 trial users engage beyond day 1',
          'Zero willingness to pay after seeing the product',
          'A major competitor launches an identical feature within 30 days',
        ],
        generatedAt: new Date().toISOString(),
      }

      const { error: updateErr } = await supabase
        .from('ideas')
        .update({ verdict: mockVerdict, status: 'completed' })
        .eq('id', ideaId)

      if (updateErr) throw updateErr
      return NextResponse.json({ verdict: mockVerdict })
    }

    const prompt = `Generate the FINAL VERDICT for this startup idea validation.

IDEA: "${idea.idea_seed}"
AI PROFILE: ${JSON.stringify(profile, null, 2)}
REPORT: ${JSON.stringify(report, null, 2)}
DAY INPUTS: ${JSON.stringify(allInputs?.map((i: Record<string, unknown>) => ({ day: i.day_number, data: i.content })) || [], null, 2)}

Return a JSON object with:
- decision ("go"|"pivot"|"kill"): Your final recommendation
- confidence (number 0-1): How confident you are in this decision
- headline (string): One-line summary (compelling, founder-friendly)
- reasoning (string): 3-5 sentence justification citing evidence from the 7 days
- nextSteps (string[]): 3-5 specific next steps if "go" or "pivot"
- killConditions (string[]): 2-4 signals that should trigger an immediate pivot/kill
- generatedAt (string): current ISO timestamp

Be constructively brutal. Base everything on the evidence collected over 7 days.

FORMATTING (apply to all string values):
- Use **bold** for key terms, metrics, and critical phrases.
- Use bullet points (- ) and numbered lists (1. 2.) within string values where appropriate.
- Use clear paragraph breaks between distinct ideas.
- Write in a polished, board-level professional tone.

Return ONLY valid JSON.`

    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt)

    const { error: updateErr } = await supabase
      .from('ideas')
      .update({ verdict: result, status: 'completed' })
      .eq('id', ideaId)

    if (updateErr) throw updateErr

    return NextResponse.json({ verdict: result })
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) {
      return NextResponse.json(quotaErrorBody(), { status: 429 })
    }
    console.error('[verdict POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
