import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { buildAutofillPrompt } from '@/ai/autofill'
import { SYSTEM_PROMPT } from '@/ai/system'
import { runPhoxtaAI, PhoxtaQuotaError, quotaErrorBody } from '@/lib/aiClient'
import mockData from '@/ai/mocks/autofill.json'

export async function POST(
  req: NextRequest,
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

    if (idea.profile_locked)
      return NextResponse.json({ error: 'Profile is locked — cannot regenerate' }, { status: 409 })

    // Dev mode
    if (process.env.PHOXTA_DEV_MODE === 'true') {
      const { error: updateErr } = await supabase
        .from('ideas')
        .update({ ai_profile: mockData })
        .eq('id', ideaId)

      if (updateErr) throw updateErr
      return NextResponse.json(mockData)
    }

    const prompt = buildAutofillPrompt({
      ideaSeed: idea.idea_seed,
      whoFor: idea.who_for || undefined,
      desiredOutcome: idea.desired_outcome || undefined,
    })

    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt)

    const { error: updateErr } = await supabase
      .from('ideas')
      .update({ ai_profile: result })
      .eq('id', ideaId)

    if (updateErr) throw updateErr

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) {
      return NextResponse.json(quotaErrorBody(), { status: 429 })
    }
    console.error('[regenerate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
