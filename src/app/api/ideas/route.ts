import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

// DELETE /api/ideas?id=... — delete an idea and its day_inputs
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ideaId = req.nextUrl.searchParams.get('id')
    if (!ideaId)
      return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Verify ownership
    const { data: idea, error: findErr } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (findErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    // Delete day_inputs first (foreign key), then the idea
    await supabase.from('day_inputs').delete().eq('idea_id', ideaId)
    const { error: delErr } = await supabase.from('ideas').delete().eq('id', ideaId)

    if (delErr) throw delErr
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ideas DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/ideas — list user's ideas
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Derive completed_days from current_day for each idea
    const enriched = (data || []).map((idea: Record<string, unknown>) => {
      const currentDay = (idea.current_day as number) || 1
      const completedDays: number[] = []
      for (let d = 1; d < currentDay; d++) completedDays.push(d)
      if (idea.status === 'completed') {
        for (let d = currentDay; d <= 10; d++) {
          if (!completedDays.includes(d)) completedDays.push(d)
        }
      }
      return { ...idea, completed_days: completedDays }
    })

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('[ideas GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ideas — create a new idea
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { ideaSeed, whoFor, desiredOutcome, aiProfile } = body

    if (!ideaSeed || typeof ideaSeed !== 'string' || ideaSeed.length < 10)
      return NextResponse.json(
        { error: 'ideaSeed must be at least 10 characters' },
        { status: 400 },
      )

    // Derive a title from the idea seed (first sentence or first 80 chars)
    const title =
      ideaSeed.split(/[.\n]/)[0].trim().slice(0, 80) || ideaSeed.slice(0, 80)

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id: user.id,
        title,
        idea_seed: ideaSeed,
        target_audience: whoFor || null,
        core_outcome: desiredOutcome || null,
        ai_profile: aiProfile || null,
        current_day: 1,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[ideas POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
