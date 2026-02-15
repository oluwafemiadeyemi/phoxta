import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; day: string }> },
) {
  try {
    const { id: ideaId, day } = await params
    const dayNumber = parseInt(day, 10)
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 14)
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })

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

    // Day is already completed — allow re-completing (iterative process)
    // if (dayNumber < idea.current_day)
    //   return NextResponse.json({ error: 'Day already completed' }, { status: 409 })

    // Phase 1 (days 1–7): strictly sequential. After day 7: days 8-14 are accessible.
    if (
      dayNumber > idea.current_day &&
      !(idea.current_day > 7 && dayNumber >= 8 && dayNumber <= 14)
    )
      return NextResponse.json({ error: 'Cannot complete a future day' }, { status: 400 })

    // Advance current_day only if we're on the current day
    // Completing Day 7 → current_day 15 (Strategy/Design/Launch all unlocked)
    let newCurrentDay = idea.current_day
    if (dayNumber === idea.current_day) {
      newCurrentDay = dayNumber >= 7 ? 15 : dayNumber + 1
    }
    // If day 7 is completed while current_day was still ≤ 7, jump to 15
    if (dayNumber === 7 && idea.current_day <= 7) {
      newCurrentDay = Math.max(newCurrentDay, 15)
    }
    const isFullyComplete = newCurrentDay >= 15

    const { error: updateErr } = await supabase
      .from('ideas')
      .update({
        current_day: newCurrentDay,
        status: isFullyComplete ? 'completed' : idea.status,
      })
      .eq('id', ideaId)

    if (updateErr) throw updateErr

    // Build completedDays from new current_day
    const completedDays: number[] = []
    for (let d = 1; d < Math.min(newCurrentDay, 15); d++) completedDays.push(d)

    return NextResponse.json({
      success: true,
      completedDays,
      currentDay: newCurrentDay,
    })
  } catch (err) {
    console.error('[complete day]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
