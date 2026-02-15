import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { AutoFillInputSchema } from '@/schemas/autofill.schema'
import { buildAutofillPrompt } from '@/ai/autofill'
import { SYSTEM_PROMPT } from '@/ai/system'
import { runPhoxtaAI, PhoxtaQuotaError, quotaErrorBody } from '@/lib/aiClient'
import mockData from '@/ai/mocks/autofill.json'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = AutoFillInputSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )

    // Dev mode — return mock data
    if (process.env.PHOXTA_DEV_MODE === 'true') {
      return NextResponse.json(mockData)
    }

    const prompt = buildAutofillPrompt(parsed.data)

    const result = await runPhoxtaAI(SYSTEM_PROMPT, prompt)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof PhoxtaQuotaError) {
      return NextResponse.json(quotaErrorBody(), { status: 429 })
    }
    console.error('[autofill] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
