import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { generateDayDraft } from '@/lib/draftGenerator'

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

    const body = await req.json()
    const targetDay = body.targetDay ?? body.dayNumber

    if (!targetDay || typeof targetDay !== 'number' || targetDay < 1 || targetDay > 10)
      return NextResponse.json(
        { error: 'targetDay must be 1-10' },
        { status: 400 },
      )

    // Verify idea ownership
    const { data: idea, error: fetchErr } = await supabase
      .from('ideas')
      .select('id, user_id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    console.log(`[generate-day-draft] Generating day ${targetDay} for idea ${ideaId}`)
    const result = await generateDayDraft(ideaId, targetDay, supabase)
    console.log(`[generate-day-draft] Result:`, result ? `${Object.keys(result).length} keys` : 'null')

    if (!result) {
      return NextResponse.json({ error: 'Draft generation returned empty. The AI may have timed out — please try again.' }, { status: 502 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[generate-day-draft]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
