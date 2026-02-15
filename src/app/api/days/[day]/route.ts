import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { generateDayDraft } from '@/lib/draftGenerator'

// GET /api/days/[day]?ideaId=... — get day state
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ day: string }> },
) {
  try {
    const { day } = await params
    const dayNumber = parseInt(day, 10)
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 14)
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })

    const ideaId = req.nextUrl.searchParams.get('ideaId')
    if (!ideaId)
      return NextResponse.json({ error: 'ideaId required' }, { status: 400 })

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

    // Get day inputs from day_inputs table
    const { data: dayInput } = await supabase
      .from('day_inputs')
      .select('*')
      .eq('idea_id', ideaId)
      .eq('day_number', dayNumber)
      .single()

    // Build ai outputs from the ai_profile
    const dayKey = `day${dayNumber}`
    const aiOutputs = idea.ai_profile?.[dayKey] || null

    // Derive completion from current_day (completed if current_day has moved past this day)
    const isCompleted = dayNumber < idea.current_day || idea.status === 'completed'
    // Phase-aware unlock logic:
    // Days 1-5: sequential; after day 5: days 6-7 unlock; after day 7: days 8-14 unlock
    const isLocked = (() => {
      if (dayNumber <= idea.current_day) return false
      if (idea.current_day > 5 && dayNumber >= 6 && dayNumber <= 7) return false
      if (idea.current_day > 7 && dayNumber >= 8 && dayNumber <= 14) return false
      return true
    })()

    // Build completedDays array from current_day
    const completedDays: number[] = []
    for (let d = 1; d < Math.min(idea.current_day, 15); d++) completedDays.push(d)
    if (idea.status === 'completed') for (let d = idea.current_day; d <= 14; d++) completedDays.push(d)

    return NextResponse.json({
      dayNumber,
      locked: isLocked,
      completed: isCompleted,
      inputs: dayInput?.content || null,
      aiOutputs,
      metrics: [],
      idea: {
        id: idea.id,
        ideaSeed: idea.idea_seed,
        currentDay: idea.current_day,
        status: idea.status,
        completedDays,
        profileLocked: idea.is_profile_locked || false,
      },
    })
  } catch (err) {
    console.error('[days GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/days/[day] — submit day input
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ day: string }> },
) {
  try {
    const { day } = await params
    const dayNumber = parseInt(day, 10)
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 14)
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { ideaId, ...inputs } = body

    if (!ideaId)
      return NextResponse.json({ error: 'ideaId required' }, { status: 400 })

    // Verify idea ownership
    const { data: idea, error: ideaErr } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', user.id)
      .single()

    if (ideaErr || !idea)
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    // Check if day input already exists
    const { data: existing } = await supabase
      .from('day_inputs')
      .select('id')
      .eq('idea_id', ideaId)
      .eq('day_number', dayNumber)
      .single()

    let saveErr
    if (existing) {
      const { error } = await supabase
        .from('day_inputs')
        .update({ content: inputs, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      saveErr = error
    } else {
      const { error } = await supabase
        .from('day_inputs')
        .insert({
          idea_id: ideaId,
          user_id: user.id,
          day_number: dayNumber,
          input_type: `day${dayNumber}_response`,
          content: inputs,
        })
      saveErr = error
    }

    if (saveErr) throw saveErr

    // If day is not yet completed and there's a next day, auto-trigger draft gen
    const nextDay = dayNumber + 1
    if (nextDay <= 14 && nextDay !== 7) {
      try {
        await generateDayDraft(ideaId, nextDay, supabase)
      } catch (draftErr) {
        console.error(`[days POST] Failed to generate draft for day ${nextDay}:`, draftErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[days POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
